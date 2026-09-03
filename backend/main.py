import json
import logging
from fastapi import FastAPI, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models, schemas
from database import engine, get_db, Base
from engine import process_event, process_successful_payment, log_audit
from scheduler import start_scheduler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Revenue Recovery Agent")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    start_scheduler()

@app.get("/")
def read_root():
    return {"status": "Agent is running"}

@app.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Receives webhooks from Razorpay."""
    # In production, verify signature here.
    payload_bytes = await request.body()
    payload_dict = json.loads(payload_bytes)
    event_name = payload_dict.get("event")
    
    # We expect 'payment.failed', 'order.paid'
    if not event_name:
        return {"status": "ignored"}
        
    logger.info(f"Received webhook: {event_name}")
    
    # Extract order ID depending on event
    order_id_rzp = None
    if "payment" in payload_dict.get("payload", {}):
        payment_entity = payload_dict["payload"]["payment"]["entity"]
        order_id_rzp = payment_entity.get("order_id")
    elif "order" in payload_dict.get("payload", {}):
        order_entity = payload_dict["payload"]["order"]["entity"]
        order_id_rzp = order_entity.get("id")
        
    if not order_id_rzp:
        return {"status": "no_order_id"}

    # Find the local order
    order = db.query(models.Order).filter(models.Order.razorpay_order_id == order_id_rzp).first()
    if not order:
        logger.warning(f"Order {order_id_rzp} not found in DB.")
        return {"status": "order_not_found"}

    # Record the event
    db_event = models.Event(
        order_id=order.id,
        type=event_name,
        payload_json=payload_bytes.decode('utf-8')
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    log_audit(db, order.id, "ingestion", f"Received webhook: {event_name}")

    if event_name == "payment.failed":
        background_tasks.add_task(process_event, db, db_event)
    elif event_name == "order.paid":
        background_tasks.add_task(process_successful_payment, db, db_event)

    return {"status": "ok"}

# Frontend APIs

@app.post("/api/orders/{order_id}/promise")
def capture_promise(order_id: int, promise: schemas.PromiseRequest, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        return {"status": "error", "message": "Order not found"}
    
    from datetime import datetime, timedelta
    promise_date = datetime.utcnow() + timedelta(hours=promise.hours_from_now)
    order.promise_to_pay_date = promise_date
    
    # Optionally, we can mark the intervention as 'promised' if there was one
    
    log_audit(db, order.id, "decision", f"User promised to pay by {promise_date.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    db.commit()
    
    return {"status": "ok", "promise_to_pay_date": promise_date}


@app.get("/api/metrics", response_model=schemas.MetricResponse)
def get_metrics(db: Session = Depends(get_db)):
    orders = db.query(models.Order).all()
    
    at_risk = [o for o in orders if o.status in ["abandoned", "recovered", "unrecovered"]]
    total_orders_at_risk = len(at_risk)
    total_amount_at_risk = sum(o.amount for o in at_risk)
    
    recovered = [o for o in at_risk if o.status == "recovered"]
    total_recovered_orders = len(recovered)
    total_recovered_amount = sum(o.amount for o in recovered)
    
    wasted = db.query(models.Outcome).filter(models.Outcome.recovered_bool == False).count()
    
    # Recovery rate by cause
    classifications = db.query(models.Classification).all()
    cause_stats = {}
    for c in classifications:
        if c.cause not in cause_stats:
            cause_stats[c.cause] = {"total": 0, "recovered": 0}
        cause_stats[c.cause]["total"] += 1
        
        # Did it recover?
        o = db.query(models.Order).filter(models.Order.id == c.order_id).first()
        if o and o.status == "recovered":
            cause_stats[c.cause]["recovered"] += 1
            
    recovery_rate_by_cause = {
        cause: (stats["recovered"] / stats["total"]) * 100 if stats["total"] > 0 else 0
        for cause, stats in cause_stats.items()
    }
    
    return {
        "total_orders_at_risk": total_orders_at_risk,
        "total_amount_at_risk": total_amount_at_risk,
        "total_recovered_orders": total_recovered_orders,
        "total_recovered_amount": total_recovered_amount,
        "recovery_rate_by_cause": recovery_rate_by_cause,
        "wasted_attempts": wasted
    }

@app.get("/api/orders", response_model=list[schemas.OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).all()

@app.get("/api/orders/{order_id}/audit")
def get_order_audit(order_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.AuditLog).filter(models.AuditLog.order_id == order_id).order_by(models.AuditLog.timestamp.asc()).all()
    return logs
