import json
import random
import uuid
import time
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import requests

from .database import engine, get_db, SessionLocal
from .models import Order

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
                
        # Simulate some successful payments eventually? (For demo purposes, the scheduler or engine would handle outcomes)
        
    db.close()
    print("Batch generation complete. Let the agent process them!")

if __name__ == "__main__":
    generate_batch(50)
