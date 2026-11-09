# ============================================================================
# PROJECT: ATM Security & Transaction Verification System
# FILE: backend/auth.py
# DESCRIPTION: Bcrypt security hashing and PIN verification utilities
# ============================================================================

import bcrypt

def hash_pin(pin: str) -> str:
    """Hashes a 6-digit ATM PIN using Bcrypt with salt."""
    pin_bytes = str(pin).strip().encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(pin_bytes, salt)
    return hashed.decode('utf-8')

def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verifies a plain 6-digit PIN against the stored Bcrypt hash."""
    try:
        plain_bytes = str(plain_pin).strip().encode('utf-8')
        hashed_bytes = hashed_pin.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def is_valid_card_format(card_id: str) -> bool:
    """Validates 6-digit card number format."""
    c = str(card_id).strip()
    return len(c) == 6 and c.isdigit()

def is_valid_pin_format(pin: str) -> bool:
    """Validates 6-digit PIN format."""
    p = str(pin).strip()
    return len(p) == 6 and p.isdigit()

