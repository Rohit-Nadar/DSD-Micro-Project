# ============================================================================
# PROJECT: ATM Security & Transaction Verification System
# FILE: backend/database.py
# DESCRIPTION: Database connection engine for Neon PostgreSQL / SQLite
# ============================================================================

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Priority: Neon PostgreSQL URL, fallback to local SQLite for seamless testing
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./atm_security.db"
)

# If Neon connection string uses postgres://, SQLAlchemy expects postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite-specific connection arguments
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

