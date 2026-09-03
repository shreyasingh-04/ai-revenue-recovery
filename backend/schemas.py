from pydantic import BaseModel
from typing import Any, Dict, Optional, List
from datetime import datetime

class WebhookPayload(BaseModel):
    event: str
    payload: Dict[str, Any]

class OrderCreate(BaseModel):
    razorpay_order_id: str
    amount: float

class PromiseRequest(BaseModel):
    hours_from_now: int

class OrderResponse(BaseModel):
    id: int
    razorpay_order_id: str
    amount: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class MetricResponse(BaseModel):
    total_orders_at_risk: int
    total_amount_at_risk: float
    total_recovered_orders: int
    total_recovered_amount: float
    recovery_rate_by_cause: Dict[str, float]
    wasted_attempts: int
