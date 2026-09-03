import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from models import Order, Event
from engine import process_event

logger = logging.getLogger(__name__)

# Polling for pure abandonment: order created > 15 mins ago, status is still 'created'
def poll_abandoned_orders():
    db = SessionLocal()
    try:
        threshold = datetime.utcnow() - timedelta(minutes=15)
        abandoned_orders = db.query(Order).filter(
            Order.status == "created",
            Order.created_at <= threshold
        ).all()
        
        for order in abandoned_orders:
            # Check if we already created an abandonment event
            existing_event = db.query(Event).filter(
                Event.order_id == order.id,
                Event.type == "pure_abandonment"
            ).first()
            
            if not existing_event:
                logger.info(f"Detected pure abandonment for order {order.id}")
                event = Event(
                    order_id=order.id,
                    type="pure_abandonment",
                    payload_json='{"reason": "no_payment_attempt_within_15_mins"}'
                )
                db.add(event)
                db.commit()
                db.refresh(event)
                
                # Mark as abandoned
                order.status = "abandoned"
                db.commit()
                
                process_event(db, event)
    except Exception as e:
        logger.error(f"Error in polling job: {e}")
    finally:
        db.close()

def poll_broken_promises():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        # Find orders that have a promise date in the past, and aren't paid
        broken_promises = db.query(Order).filter(
            Order.promise_to_pay_date != None,
            Order.promise_to_pay_date < now,
            Order.status != "paid",
            Order.status != "recovered",
            Order.status != "unrecovered"
        ).all()
        
        for order in broken_promises:
            logger.info(f"Detected broken promise for order {order.id}")
            # Log the broken promise
            from engine import log_audit
            log_audit(db, order.id, "outcome", "Promise to pay broken (time expired). Marking as unrecovered.")
            
            # Clear promise date and mark unrecovered
            order.promise_to_pay_date = None
            order.status = "unrecovered"
            db.commit()
    except Exception as e:
        logger.error(f"Error in promise polling job: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(poll_abandoned_orders, 'interval', minutes=1)
    scheduler.add_job(poll_broken_promises, 'interval', minutes=1)
    scheduler.start()
    logger.info("Started background scheduler for abandonment polling")
