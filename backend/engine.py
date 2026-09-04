import json
import logging
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from models import Order, Event, Classification, Intervention, Outcome, AuditLog
from razorpay_client import get_client

logger = logging.getLogger(__name__)

# Constants for limits
MAX_DAILY_RECOVERY_BUDGET = 50

# Decision Rules
RULES = {
    "bank_timeout": {"action": "generate_fresh_link", "max_retries": 2, "cooldown_mins": 15},
    "upi_collect_expired": {"action": "generate_fresh_link", "max_retries": 2, "cooldown_mins": 15},
    "card_declined": {"action": "send_alternate_method_nudge", "max_retries": 1, "cooldown_mins": 0},
    "insufficient_funds": {"action": "delayed_nudge", "max_retries": 1, "cooldown_mins": 360}, # 6 hours
    "network_drop": {"action": "immediate_single_retry", "max_retries": 1, "cooldown_mins": 0},
    "pure_abandonment": {"action": "reminder_nudge_only", "max_retries": 1, "cooldown_mins": 0}
}

def log_audit(db: Session, order_id: int, event_type: str, description: str):
    audit = AuditLog(order_id=order_id, event_type=event_type, description=description)
    db.add(audit)
    db.commit()

def classify_event(db: Session, event: Event) -> Classification:
    """Classifies the root cause based on event payload."""
    payload = json.loads(event.payload_json)
    cause = "network_drop" # default fallback
    
    if event.type == "payment.failed":
        inner = payload.get("payload", {})
        error_code = inner.get("error", {}).get("code", "")
        error_reason = inner.get("error", {}).get("reason", "")
        
        if not error_reason:
            error_reason = inner.get("payment", {}).get("entity", {}).get("error_description", "")
        
        error_reason = error_reason.lower()
        
        if "BAD_REQUEST_ERROR" in error_code and "declined" in error_reason:
            cause = "card_declined"
        elif "insufficient_funds" in error_reason:
            cause = "insufficient_funds"
        elif "timeout" in error_reason or "gateway" in error_code.lower():
            cause = "bank_timeout"
        elif "upi_collect_expired" in error_reason:
            cause = "upi_collect_expired"
    elif event.type == "pure_abandonment":
        cause = "pure_abandonment"

    # Only create a classification if one doesn't exist yet for this cause?
    # For now, just insert.
    classification = Classification(order_id=event.order_id, cause=cause)
    db.add(classification)
    db.commit()
    db.refresh(classification)
    
    log_audit(db, event.order_id, "classification", f"Classified drop-off cause as: {cause}")
    return classification

def gate_check(db: Session, order_id: int, cause: str) -> bool:
    """Checks if we are allowed to intervene."""
    rule = RULES.get(cause)
    if not rule:
        return False
        
    order = db.query(Order).filter(Order.id == order_id).first()
    if order.status == "paid":
        log_audit(db, order_id, "decision", "Order already paid. Stopping recovery.")
        return False
    if order.status == "recovered" or order.status == "unrecovered":
        return False

    # Check daily budget limit
    today = datetime.utcnow().date()
    daily_attempts = db.query(Intervention).filter(Intervention.created_at >= today).count()
    if daily_attempts >= MAX_DAILY_RECOVERY_BUDGET:
        log_audit(db, order_id, "decision", "Daily recovery budget exceeded. Stopping.")
        return False

    # Check retries for this order
    past_interventions = db.query(Intervention).filter(Intervention.order_id == order_id).all()
    if len(past_interventions) >= rule["max_retries"]:
        log_audit(db, order_id, "decision", f"Max retries ({rule['max_retries']}) reached for cause {cause}. Stopping.")
        order.status = "unrecovered"
        outcome = Outcome(order_id=order_id, recovered_bool=False, closed_reason="max_retries_reached")
        db.add(outcome)
        db.commit()
        return False

    # Check cooldown
    if past_interventions:
        last = past_interventions[-1]
        if last.cooldown_until and last.cooldown_until > datetime.utcnow():
            log_audit(db, order_id, "decision", "Cooldown active. Waiting before next attempt.")
            return False

    return True

def decide_and_execute(db: Session, order_id: int, cause: str):
    """Decides the intervention and executes it if it passes the gate."""
    if not gate_check(db, order_id, cause):
        return
        
    rule = RULES.get(cause)
    action = rule["action"]
    
    order = db.query(Order).filter(Order.id == order_id).first()
    
    past_interventions = db.query(Intervention).filter(Intervention.order_id == order_id).count()
    attempt = past_interventions + 1
    
    # Calculate cooldown for NEXT attempt if needed
    cooldown = datetime.utcnow() + timedelta(minutes=rule["cooldown_mins"]) if rule["cooldown_mins"] > 0 else None
    
    discount = 0.0
    if cause in ["insufficient_funds", "pure_abandonment"] and order.amount >= 8000:
        discount = 5.0
        
    ab_variant = None
    if cause == "pure_abandonment":
        ab_variant = random.choice(["A", "B"])
        
    intervention = Intervention(
        order_id=order_id, 
        action_type=action, 
        attempt_number=attempt,
        cooldown_until=cooldown,
        discount_offered=discount,
        ab_variant=ab_variant
    )
    db.add(intervention)
    db.commit()
    
    log_audit(db, order_id, "decision", f"Decided to execute action: {action} (Attempt {attempt})")
    
    # Execute
    client = get_client()
    
    if cause == "pure_abandonment":
        if ab_variant == "A":
            description = "[Variant A] Hey, we saved your cart! Complete your purchase whenever you're ready."
        else:
            description = "[Variant B] Urgent: Your reserved items will expire in 15 minutes! Checkout now."
    else:
        description = f"Recovery attempt for {cause}"
        
    if discount > 0:
        description += f" [Special {discount}% discount applied!]"
        
    if action != "reminder_nudge_only":
        try:
            link = client.create_payment_link(order.amount, str(order.razorpay_order_id), description)
            log_audit(db, order_id, "action", f"Generated new payment link: {link['short_url']}")
            intervention.status = "executed"
        except Exception as e:
            logger.error(f"Failed to create payment link: {e}")
            log_audit(db, order_id, "action", f"Failed to generate payment link: {e}")
            intervention.status = "failed"
    else:
        # Just a nudge
        log_audit(db, order_id, "action", "Sent pure abandonment reminder nudge via simulated SMS/Email.")
        intervention.status = "executed"

    db.commit()

def process_event(db: Session, event: Event):
    """Main pipeline for a single event."""
    # Only process failures or abandonments
    if event.type not in ["payment.failed", "pure_abandonment"]:
        return
        
    classification = classify_event(db, event)
    decide_and_execute(db, event.order_id, classification.cause)

def process_successful_payment(db: Session, event: Event):
    """Closes the loop when a payment is successful."""
    order = db.query(Order).filter(Order.id == event.order_id).first()
    if not order:
        return

    # Check if we intervened before
    interventions = db.query(Intervention).filter(Intervention.order_id == order.id).all()
    
    if interventions and order.status != "recovered":
        order.status = "recovered"
        outcome = Outcome(
            order_id=order.id, 
            recovered_bool=True, 
            recovered_amount=order.amount,
            closed_reason="payment_successful_after_intervention"
        )
        db.add(outcome)
        log_audit(db, order.id, "outcome", f"Successfully recovered ₹{order.amount}!")
    else:
        # Was never dropped, or just paid normally
        order.status = "paid"
        
    db.commit()
