# ============================================================================
# PROJECT: ATM Security & Transaction Verification System
# FILE: backend/seed_data.py
# DESCRIPTION: Seed initial registered demo accounts with Bcrypt hashed PINs
# ============================================================================

from database import engine, SessionLocal, Base
from models import Account, TransactionHistory, AuditLog
from auth import hash_pin

DEMO_ACCOUNTS = [
    {
        "card_id": "100123",
        "pin": "123456",
        "account_holder": "Rohit Nadar (URK26AI1021)",
        "balance": 5000.0,
        "daily_limit": 20000.0,
    },
    {
        "card_id": "100124",
        "pin": "234567",
        "account_holder": "Vikash (URK26AI1022)",
        "balance": 8000.0,
        "daily_limit": 20000.0,
    },
    {
        "card_id": "100125",
        "pin": "345678",
        "account_holder": "Vahini Muthu (URK26AI1023)",
        "balance": 12000.0,
        "daily_limit": 20000.0,
    },
    {
        "card_id": "100126",
        "pin": "456789",
        "account_holder": "Sujith S. (URK26AI1024)",
        "balance": 3000.0,
        "daily_limit": 20000.0,
    }
]

def seed_database():
    """Initializes tables and seeds initial account records if not present."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Account).count()
        if count == 0:
            print("Seeding initial registered ATM accounts into database...")
            for acc in DEMO_ACCOUNTS:
                account_obj = Account(
                    card_id=acc["card_id"],
                    pin_hash=hash_pin(acc["pin"]),
                    account_holder=acc["account_holder"],
                    balance=acc["balance"],
                    opening_balance=acc["balance"],
                    daily_limit=acc["daily_limit"],
                    daily_withdrawn=0.0,
                    is_locked=False,
                    failed_attempts=0
                )
                db.add(account_obj)
            db.commit()
            print(f"Successfully seeded {len(DEMO_ACCOUNTS)} accounts.")
        else:
            print(f"Database already contains {count} accounts. Skipping seed.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

