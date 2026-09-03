from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    razorpay_order_id = Column(String, unique=True, index=True)
    amount = Column(Float)
    status = Column(String, default="created") # created, paid, abandoned, recovered, unrecovered
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    events = relationship("Event", back_populates="order")
    audit_logs = relationship("AuditLog", back_populates="order")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    type = Column(String) # e.g., payment.failed, order.paid
    payload_json = Column(Text)
    received_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    order = relationship("Order", back_populates="events")

class Classification(Base):
    __tablename__ = "classifications"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    cause = Column(String) # bank_timeout, card_declined, insufficient_funds, pure_abandonment, network_drop
    classified_at = Column(DateTime, default=datetime.datetime.utcnow)

class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    action_type = Column(String)
    attempt_number = Column(Integer, default=1)
    cooldown_until = Column(DateTime, nullable=True)
    status = Column(String, default="pending") # pending, executed, cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Outcome(Base):
    __tablename__ = "outcomes"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    recovered_bool = Column(Boolean, default=False)
    recovered_amount = Column(Float, default=0.0)
    closed_reason = Column(String)
    closed_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    event_type = Column(String) # ingestion, classification, decision, action, outcome
    description = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    order = relationship("Order", back_populates="audit_logs")
