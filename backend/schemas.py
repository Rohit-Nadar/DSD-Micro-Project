# ============================================================================
# PROJECT: ATM Security & Transaction Verification System
# FILE: backend/schemas.py
# DESCRIPTION: Pydantic v2 schemas for API requests and responses
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class CardInsertRequest(BaseModel):
    card_id: str = Field(..., description="6-digit Card ID (e.g. 100123)")

class PinSubmitRequest(BaseModel):
    card_id: str = Field(..., description="6-digit Card ID")
    pin: str = Field(..., description="6-digit numeric PIN entered via keypad")

class TransactionRequest(BaseModel):
    card_id: str = Field(..., description="6-digit Card ID")
    tx_type: str = Field(..., description="WITHDRAW | DEPOSIT | BALANCE_ENQUIRY | TRANSFER | INTEREST")
    amount: float = Field(default=0.0, ge=0.0, description="Amount to withdraw/deposit/transfer")
    target_card_id: Optional[str] = Field(default=None, description="Target card ID for fund transfers")

class HardwareSimRequest(BaseModel):
    card_id: int = Field(default=100123, description="6-digit Card ID")
    pin: int = Field(default=123456, description="6-digit PIN")
    tx_type: int = Field(default=0, ge=0, le=4, description="0=Withdraw, 1=Deposit, 2=Balance, 3=Transfer, 4=Interest")
    amount: int = Field(default=2000, ge=0, description="Amount in INR")
    target_card_id: int = Field(default=0, description="Target card ID")

class UnlockAccountRequest(BaseModel):
    card_id: str = Field(..., description="6-digit Card ID to unlock")

class AccountDTO(BaseModel):
    id: int
    card_id: str
    account_holder: str
    balance: float
    opening_balance: float
    daily_limit: float
    daily_withdrawn: float
    remaining_daily_limit: float
    is_locked: bool
    failed_attempts: int
    last_reset_date: str

class TransactionDTO(BaseModel):
    id: int
    card_id: str
    tx_type: str
    amount: float
    balance_before: float
    balance_after: float
    target_card_id: Optional[str] = None
    receipt_no: str
    approved: bool
    reject_code: int
    reject_reason: Optional[str] = None
    timestamp: str

class TransactionResultResponse(BaseModel):
    success: bool
    approved: bool
    reject_code: int
    reject_reason: Optional[str] = None
    message: str
    receipt_no: Optional[str] = None
    account: Optional[AccountDTO] = None
    transaction: Optional[TransactionDTO] = None
    receipt_text: Optional[str] = None

