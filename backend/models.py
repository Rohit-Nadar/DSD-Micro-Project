# ============================================================================
# PROJECT: ATM Security & Transaction Verification System
# FILE: backend/models.py
# DESCRIPTION: SQLAlchemy ORM models matching Neon PostgreSQL schema
# ============================================================================

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    card_id = Column(String(10), unique=True, index=True, nullable=False) # e.g. "100123"
    pin_hash = Column(String(255), nullable=False)                         # Bcrypt hashed 6-digit PIN
    account_holder = Column(String(100), nullable=False)                   # e.g. "Rohit Nadar"
    balance = Column(Float, default=5000.0, nullable=False)                # 16-bit hardware baseline
    opening_balance = Column(Float, default=5000.0, nullable=False)
    daily_limit = Column(Float, default=20000.0, nullable=False)          # FR-07: Daily limit ₹20,000
    daily_withdrawn = Column(Float, default=0.0, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)             # FR-04: PIN lockout
    failed_attempts = Column(Integer, default=0, nullable=False)           # Failed counter
    last_reset_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    transactions = relationship("TransactionHistory", back_populates="account", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "card_id": self.card_id,
            "account_holder": self.account_holder,
            "balance": round(self.balance, 2),
            "opening_balance": round(self.opening_balance, 2),
            "daily_limit": round(self.daily_limit, 2),
            "daily_withdrawn": round(self.daily_withdrawn, 2),
            "remaining_daily_limit": max(0.0, round(self.daily_limit - self.daily_withdrawn, 2)),
            "is_locked": self.is_locked,
            "failed_attempts": self.failed_attempts,
            "last_reset_date": str(self.last_reset_date),
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class TransactionHistory(Base):
    __tablename__ = "transaction_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    card_id = Column(String(10), index=True, nullable=False)
    tx_type = Column(String(30), nullable=False)                           # WITHDRAW, DEPOSIT, BALANCE_ENQUIRY, TRANSFER, INTEREST
    amount = Column(Float, default=0.0, nullable=False)
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    target_card_id = Column(String(10), nullable=True)
    receipt_no = Column(String(64), unique=True, index=True, nullable=False)
    approved = Column(Boolean, default=True, nullable=False)
    reject_code = Column(Integer, default=0, nullable=False)               # 0 to 8
    reject_reason = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    account = relationship("Account", back_populates="transactions")

    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "card_id": self.card_id,
            "tx_type": self.tx_type,
            "amount": round(self.amount, 2),
            "balance_before": round(self.balance_before, 2),
            "balance_after": round(self.balance_after, 2),
            "target_card_id": self.target_card_id,
            "receipt_no": self.receipt_no,
            "approved": self.approved,
            "reject_code": self.reject_code,
            "reject_reason": self.reject_reason,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    card_id = Column(String(10), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

