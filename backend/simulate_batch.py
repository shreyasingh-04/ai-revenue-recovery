import json
import random
import uuid
import time
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import requests

from database import engine, get_db, SessionLocal
from models import Order, Base, Intervention

# Ensure tables exist just in case the backend hasn't created them yet
Base.metadata.create_all(bind=engine)

# We will directly hit the webhook endpoint to simulate Razorpay events
WEBHOOK_URL = "http://127.0.0.1:8000/api/webhooks/razorpay"

CAUSES = [
    {"cause": "bank_timeout", "reason": "timeout from bank", "code": "BAD_REQUEST_ERROR", "prob": 0.2},
    {"cause": "card_declined", "reason": "declined by issuer", "code": "BAD_REQUEST_ERROR", "prob": 0.3},
    {"cause": "insufficient_funds", "reason": "insufficient_funds in account", "code": "BAD_REQUEST_ERROR", "prob": 0.15},
    {"cause": "network_drop", "reason": "unknown network drop", "code": "INTERNAL_SERVER_ERROR", "prob": 0.15},
    {"cause": "upi_collect_expired", "reason": "upi_collect_expired before approval", "code": "BAD_REQUEST_ERROR", "prob": 0.1},
    {"cause": "pure_abandonment", "reason": "none", "code": "none", "prob": 0.1}
]

def generate_batch(num_orders=50):
    db = SessionLocal()
    print(f"Generating synthetic batch of {num_orders} orders...")
    
    for i in range(num_orders):
        # 1. Create Order
        rzp_order_id = f"order_{uuid.uuid4().hex[:14]}"
        amount = random.randint(500, 15000)
        
        # Determine cause based on probabilities
        rand = random.random()
        cumulative = 0
        selected_cause = None
        for c in CAUSES:
            cumulative += c["prob"]
            if rand <= cumulative:
                selected_cause = c
                break
        
        # If pure_abandonment, set created_at to 20 mins ago so the scheduler picks it up immediately
        created_at = datetime.utcnow()
        if selected_cause["cause"] == "pure_abandonment":
            created_at -= timedelta(minutes=20)
            
        order = Order(razorpay_order_id=rzp_order_id, amount=amount, status="created", created_at=created_at)
        db.add(order)
        db.commit()
        db.refresh(order)
        
        print(f"Order {order.id} created. Planned cause: {selected_cause['cause']}")
        
        # 2. Simulate webhook (except for pure_abandonment)
        if selected_cause["cause"] != "pure_abandonment":
            payload = {
                "event": "payment.failed",
                "payload": {
                    "payment": {
                        "entity": {
                            "order_id": rzp_order_id,
                            "amount": amount * 100,
                            "error_code": selected_cause["code"],
                            "error_description": selected_cause["reason"],
                            "error_reason": selected_cause["reason"]
                        }
                    },
                    "error": {
                        "code": selected_cause["code"],
                        "reason": selected_cause["reason"]
                    }
                }
            }
            
            try:
                requests.post(WEBHOOK_URL, json=payload)
            except Exception as e:
                print(f"Make sure the FastAPI server is running on port 8000! Error: {e}")
                return
                
    # 3. Wait for the engine to process the failures and generate interventions
    print("Waiting 5 seconds for the agent to process drop-offs...")
    time.sleep(5)
    
    # 3.5 Force run the scheduler for pure_abandonment so interventions are generated before recovery simulation
    try:
        from scheduler import poll_abandoned_orders
        print("Polling for pure abandonment...")
        poll_abandoned_orders()
    except Exception as e:
        print("Failed to run scheduler manually:", e)
    
    # 4. Simulate successful recoveries
    print("Simulating customers paying via the recovery links...")
    # Get all orders that have an intervention
    orders_with_interventions = db.query(Order).filter(Order.status == "created").all()
    
    for order in orders_with_interventions:
        # 60% chance they pay the recovery link
        if random.random() < 0.6:
            payload = {
                "event": "order.paid",
                "payload": {
                    "order": {
                        "entity": {
                            "id": order.razorpay_order_id,
                            "amount": order.amount * 100,
                            "status": "paid"
                        }
                    }
                }
            }
            try:
                requests.post(WEBHOOK_URL, json=payload)
                print(f"Simulated successful recovery payment for order {order.id}")
            except Exception as e:
                pass

    db.close()
    print("Batch generation and recovery simulation complete!")

if __name__ == "__main__":
    generate_batch(50)
