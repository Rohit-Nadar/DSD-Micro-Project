# ============================================================================
# PROJECT: ATM Security & Transaction Verification System
# COURSE: 25DC205 - Digital System Design for Data Science and Cybersecurity
# INSTITUTION: Karunya Institute of Technology and Sciences
# FILE: backend/main.py
# DESCRIPTION: FastAPI REST backend providing banking endpoints, hardware
#              simulation bridge, PDF receipt generation, and test suite.
# ============================================================================

from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional, List

from database import engine, get_db, Base
import models
from auth import hash_pin, verify_pin, is_valid_card_format, is_valid_pin_format
from schemas import (
    CardInsertRequest,
    PinSubmitRequest,
    TransactionRequest,
    HardwareSimRequest,
    UnlockAccountRequest,
    TransactionResultResponse
)
from receipt import generate_receipt_number, format_text_receipt, generate_pdf_receipt
from verilog_simulator import hardware_engine, REJECT_CODES
from seed_data import seed_database

# Create DB tables and seed accounts
Base.metadata.create_all(bind=engine)
seed_database()

app = FastAPI(
    title="ATM Security & Transaction Verification System API",
    description="Backend service modeled after Simulink DSD Architecture & Verilog FSM Controller",
    version="2.0.0"
)

# Enable CORS for Next.js / Vite / Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Reject code constants matching hardware
RC_NONE = 0
RC_INVALID_CARD = 1
RC_INVALID_PIN = 2
RC_ACCOUNT_LOCKED = 3
RC_DAILY_LIMIT = 4
RC_INSUFFICIENT_FUNDS = 5
RC_INVALID_TX = 6
RC_TARGET_NOT_FOUND = 7
RC_OVERFLOW = 8

@app.get("/")
def read_root():
    return {
        "project": "ATM Security & Transaction Verification System",
        "course": "25DC205 - Digital System Design for Data Science and Cybersecurity",
        "institution": "Karunya Institute of Technology and Sciences",
        "team": [
            "Rohit Nadar (URK26AI1021)",
            "Vikash (URK26AI1022)",
            "Vahini Muthu (URK26AI1023)",
            "Sujith S. (URK26AI1024)"
        ],
        "supervisor": "Dr. Vidhya B.",
        "status": "System Online",
        "fsm_states_count": 10,
        "hardware_engine": "Cycle-Accurate Verilog atm_bank.v Emulator Active"
    }

# ----------------------------------------------------------------------------
# FR-01: Card Insertion & Validation
# ----------------------------------------------------------------------------
@app.post("/api/card/insert")
def insert_card(req: CardInsertRequest, db: Session = Depends(get_db)):
    card_id = req.card_id.strip()
    if not is_valid_card_format(card_id):
        return {
            "valid": False,
            "reject_code": RC_INVALID_CARD,
            "message": "Invalid Card format. Must be a 6-digit numeric ID."
        }

    account = db.query(models.Account).filter(models.Account.card_id == card_id).first()
    if not account:
        return {
            "valid": False,
            "reject_code": RC_INVALID_CARD,
            "message": f"Card ID {card_id} is not registered in the system."
        }

    # Reset daily limit accumulator if date changed (FR-07)
    today = date.today()
    if account.last_reset_date < today:
        account.daily_withdrawn = 0.0
        account.last_reset_date = today
        db.commit()
        db.refresh(account)

    if account.is_locked:
        return {
            "valid": False,
            "reject_code": RC_ACCOUNT_LOCKED,
            "message": "Account is blocked due to 3 failed PIN attempts. Contact bank administrator.",
            "account_holder": account.account_holder,
            "is_locked": True,
            "failed_attempts": account.failed_attempts
        }

    return {
        "valid": True,
        "reject_code": RC_NONE,
        "message": f"Card accepted. Welcome {account.account_holder}.",
        "card_id": account.card_id,
        "account_holder": account.account_holder,
        "is_locked": account.is_locked,
        "failed_attempts": account.failed_attempts
    }

# ----------------------------------------------------------------------------
# FR-02, FR-03, FR-04: PIN Submission & Attempt Counter
# ----------------------------------------------------------------------------
@app.post("/api/auth/pin")
def submit_pin(req: PinSubmitRequest, db: Session = Depends(get_db)):
    card_id = req.card_id.strip()
    plain_pin = req.pin.strip()

    account = db.query(models.Account).filter(models.Account.card_id == card_id).first()
    if not account:
        return {
            "authenticated": False,
            "reject_code": RC_INVALID_CARD,
            "message": "Invalid Card ID."
        }

    if account.is_locked:
        return {
            "authenticated": False,
            "reject_code": RC_ACCOUNT_LOCKED,
            "message": "Account is blocked due to 3 previous wrong attempts.",
            "is_locked": True,
            "failed_attempts": account.failed_attempts
        }

    # Verify PIN with Bcrypt
    if verify_pin(plain_pin, account.pin_hash):
        # Reset attempt counter on successful login
        account.failed_attempts = 0
        db.commit()
        db.refresh(account)
        return {
            "authenticated": True,
            "reject_code": RC_NONE,
            "message": "PIN verified successfully. Access granted.",
            "account": account.to_dict()
        }
    else:
        account.failed_attempts += 1
        if account.failed_attempts >= 3:
            account.is_locked = True
            db.commit()
            db.refresh(account)
            return {
                "authenticated": False,
                "reject_code": RC_ACCOUNT_LOCKED,
                "message": "SECURITY LOCKOUT: 3 incorrect PIN attempts reached. Card is now BLOCKED.",
                "is_locked": True,
                "failed_attempts": account.failed_attempts
            }
        else:
            db.commit()
            db.refresh(account)
            remaining = 3 - account.failed_attempts
            return {
                "authenticated": False,
                "reject_code": RC_INVALID_PIN,
                "message": f"Incorrect PIN. You have {remaining} attempt(s) remaining before card lockout.",
                "is_locked": False,
                "failed_attempts": account.failed_attempts,
                "remaining_attempts": remaining
            }

# ----------------------------------------------------------------------------
# Account Retrieval
# ----------------------------------------------------------------------------
@app.get("/api/account/{card_id}")
def get_account_details(card_id: str, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.card_id == card_id.strip()).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    today = date.today()
    if account.last_reset_date < today:
        account.daily_withdrawn = 0.0
        account.last_reset_date = today
        db.commit()
        db.refresh(account)

    return account.to_dict()

# ----------------------------------------------------------------------------
# FR-05 to FR-12: Complete Transaction Execution Endpoint
# ----------------------------------------------------------------------------
@app.post("/api/transaction", response_model=TransactionResultResponse)
def execute_transaction(req: TransactionRequest, db: Session = Depends(get_db)):
    card_id = req.card_id.strip()
    tx_type = req.tx_type.upper().strip()
    amount = float(req.amount)
    target_card_id = req.target_card_id.strip() if req.target_card_id else None

    account = db.query(models.Account).filter(models.Account.card_id == card_id).first()
    if not account:
        return TransactionResultResponse(
            success=False,
            approved=False,
            reject_code=RC_INVALID_CARD,
            reject_reason="Invalid Card ID",
            message="Card is not registered in the system."
        )

    if account.is_locked:
        return TransactionResultResponse(
            success=False,
            approved=False,
            reject_code=RC_ACCOUNT_LOCKED,
            reject_reason="Account Locked",
            message="Account is blocked. Transactions are denied."
        )

    # Check daily limit reset
    today = date.today()
    if account.last_reset_date < today:
        account.daily_withdrawn = 0.0
        account.last_reset_date = today

    balance_before = account.balance
    balance_after = balance_before
    approved = False
    reject_code = RC_NONE
    reject_reason = None
    message = ""

    # Transaction processing logic (matching Section D ALU paths)
    if tx_type == "BALANCE_ENQUIRY":
        # FR-05: Direct Read (REGISTER_WRITE = 0)
        approved = True
        balance_after = balance_before
        message = f"Balance enquiry verified. Current balance is INR {balance_before:,.2f}."

    elif tx_type == "WITHDRAW":
        # FR-06 & FR-07: Magnitude Comparator & Daily Limit
        if amount <= 0:
            reject_code = RC_INVALID_TX
            reject_reason = "Withdrawal amount must be greater than zero."
        elif (account.daily_withdrawn + amount) > account.daily_limit:
            reject_code = RC_DAILY_LIMIT
            reject_reason = f"Daily limit exceeded. Remaining limit today: INR {account.daily_limit - account.daily_withdrawn:,.2f}."
        elif balance_before < amount:
            reject_code = RC_INSUFFICIENT_FUNDS
            reject_reason = f"Insufficient funds. Available balance: INR {balance_before:,.2f}."
        else:
            # Valid withdrawal: Subtractor B_new = B_current - M
            approved = True
            balance_after = balance_before - amount
            account.balance = balance_after
            account.daily_withdrawn += amount
            message = f"Cash withdrawal of INR {amount:,.2f} successful. Please collect your cash."

    elif tx_type == "DEPOSIT":
        # FR-08: Adder circuit & 16-bit range / capacity verification
        if amount <= 0:
            reject_code = RC_INVALID_TX
            reject_reason = "Deposit amount must be greater than zero."
        elif (balance_before + amount) > 65535.0:
            reject_code = RC_OVERFLOW
            reject_reason = "Transaction exceeds hardware 16-bit maximum storage capacity (₹65,535)."
        else:
            # Valid deposit: Adder B_new = B_current + M
            approved = True
            balance_after = balance_before + amount
            account.balance = balance_after
            message = f"Deposit of INR {amount:,.2f} completed successfully."

    elif tx_type == "TRANSFER":
        # FR-09: Inter-account fund transfer
        if not target_card_id or target_card_id == card_id:
            reject_code = RC_TARGET_NOT_FOUND
            reject_reason = "Invalid target card ID or self-transfer specified."
        elif amount <= 0:
            reject_code = RC_INVALID_TX
            reject_reason = "Transfer amount must be greater than zero."
        elif balance_before < amount:
            reject_code = RC_INSUFFICIENT_FUNDS
            reject_reason = f"Insufficient balance for transfer. Available: INR {balance_before:,.2f}."
        else:
            target_account = db.query(models.Account).filter(models.Account.card_id == target_card_id).first()
            if not target_account:
                reject_code = RC_TARGET_NOT_FOUND
                reject_reason = f"Target card {target_card_id} not found."
            else:
                approved = True
                balance_after = balance_before - amount
                account.balance = balance_after
                target_account.balance += amount
                message = f"Transferred INR {amount:,.2f} to {target_account.account_holder} (Card {target_card_id}) successfully."

    elif tx_type == "INTEREST":
        # FR-10: Interest credit calculation
        interest = round((balance_before * 0.04) / 12 + 50.0, 2)
        approved = True
        balance_after = balance_before + interest
        account.balance = balance_after
        message = f"Interest bonus of INR {interest:,.2f} credited to your account."

    else:
        reject_code = RC_INVALID_TX
        reject_reason = f"Unknown transaction type: {tx_type}"

    # Log into Transaction History and persist sequential state
    receipt_no = generate_receipt_number(card_id, tx_type)
    tx_record = models.TransactionHistory(
        account_id=account.id,
        card_id=card_id,
        tx_type=tx_type,
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        target_card_id=target_card_id,
        receipt_no=receipt_no,
        approved=approved,
        reject_code=reject_code,
        reject_reason=reject_reason,
        timestamp=datetime.utcnow()
    )
    db.add(tx_record)
    db.commit()
    db.refresh(account)
    db.refresh(tx_record)

    receipt_text = format_text_receipt({
        "card_id": card_id,
        "receipt_no": receipt_no,
        "account_holder": account.account_holder,
        "tx_type": tx_type,
        "amount": amount,
        "balance_after": balance_after,
        "approved": approved,
        "timestamp": tx_record.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
    })

    return TransactionResultResponse(
        success=approved,
        approved=approved,
        reject_code=reject_code,
        reject_reason=reject_reason,
        message=message if approved else (reject_reason or "Transaction rejected."),
        receipt_no=receipt_no,
        account=account.to_dict(),
        transaction=tx_record.to_dict(),
        receipt_text=receipt_text
    )

# ----------------------------------------------------------------------------
# Transaction History & Search
# ----------------------------------------------------------------------------
@app.get("/api/transactions/{card_id}")
def get_transaction_history(
    card_id: str,
    limit: int = 8,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.TransactionHistory).filter(models.TransactionHistory.card_id == card_id.strip())
    if q:
        query = query.filter(models.TransactionHistory.tx_type.ilike(f"%{q}%") | models.TransactionHistory.receipt_no.ilike(f"%{q}%"))

    history = query.order_by(models.TransactionHistory.timestamp.desc()).limit(limit).all()
    return [tx.to_dict() for tx in history]

# ----------------------------------------------------------------------------
# PDF Receipt Download Endpoint
# ----------------------------------------------------------------------------
@app.get("/api/receipt/{receipt_no}/pdf")
def get_pdf_receipt(receipt_no: str, db: Session = Depends(get_db)):
    tx = db.query(models.TransactionHistory).filter(models.TransactionHistory.receipt_no == receipt_no).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Receipt not found")

    account = db.query(models.Account).filter(models.Account.id == tx.account_id).first()
    pdf_bytes = generate_pdf_receipt({
        "card_id": tx.card_id,
        "receipt_no": tx.receipt_no,
        "account_holder": account.account_holder if account else "Authorized User",
        "tx_type": tx.tx_type,
        "amount": tx.amount,
        "balance_after": tx.balance_after,
        "approved": tx.approved,
        "target_card_id": tx.target_card_id,
        "timestamp": tx.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
    })

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ATM_Receipt_{receipt_no}.pdf"}
    )

# ----------------------------------------------------------------------------
# Hardware Simulation Mode (Live Verilog Execution)
# ----------------------------------------------------------------------------
@app.post("/api/hardware/simulate")
def run_hardware_simulation(req: HardwareSimRequest):
    """Executes the cycle-accurate synthesizable Verilog atm_bank.v engine."""
    result = hardware_engine.run_transaction(
        card_id=req.card_id,
        pin=req.pin,
        tx_type=req.tx_type,
        amount=req.amount,
        target_card=req.target_card_id
    )
    return result

# ----------------------------------------------------------------------------
# Admin & Functional Requirements (FR-01 to FR-12) Verification Suite
# ----------------------------------------------------------------------------
@app.get("/api/admin/accounts")
def list_admin_accounts(db: Session = Depends(get_db)):
    accounts = db.query(models.Account).all()
    return [a.to_dict() for a in accounts]

@app.post("/api/admin/unlock")
def unlock_account(req: UnlockAccountRequest, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.card_id == req.card_id.strip()).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account.is_locked = False
    account.failed_attempts = 0
    db.commit()
    db.refresh(account)
    return {"success": True, "message": f"Account {account.card_id} has been unlocked.", "account": account.to_dict()}

@app.post("/api/admin/reset-daily")
def reset_daily_limits(db: Session = Depends(get_db)):
    accounts = db.query(models.Account).all()
    for a in accounts:
        a.daily_withdrawn = 0.0
        a.last_reset_date = date.today()
    db.commit()
    return {"success": True, "message": f"Daily withdrawal counters reset for {len(accounts)} accounts."}

@app.post("/api/admin/reset-demo")
def reset_demo_state(db: Session = Depends(get_db)):
    db.query(models.TransactionHistory).delete()
    db.query(models.Account).delete()
    db.commit()
    seed_database()
    hardware_engine.reset()
    return {"success": True, "message": "Demo database and hardware registers reset to initial factory states."}

@app.get("/api/admin/test-fr")
def run_functional_requirements_tests(db: Session = Depends(get_db)):
    """Runs automated verification of all 12 Functional Requirements (FR-01 to FR-12)."""
    from test_suite_fr import run_all_fr_tests
    results = run_all_fr_tests(db)
    return results

