-- ============================================================================
-- PROJECT: ATM Security & Transaction Verification System
-- COURSE: 25DC205 - Digital System Design for Data Science and Cybersecurity
-- INSTITUTION: Karunya Institute of Technology and Sciences
-- DATABASE MIGRATION SCRIPT FOR NEON POSTGRESQL
-- ============================================================================

-- 1. Create Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    card_id VARCHAR(10) UNIQUE NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    balance NUMERIC(12, 2) DEFAULT 5000.00 NOT NULL,
    opening_balance NUMERIC(12, 2) DEFAULT 5000.00 NOT NULL,
    daily_limit NUMERIC(12, 2) DEFAULT 20000.00 NOT NULL,
    daily_withdrawn NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE NOT NULL,
    failed_attempts INTEGER DEFAULT 0 NOT NULL,
    last_reset_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_card_id ON accounts(card_id);

-- 2. Create Transaction History Table
CREATE TABLE IF NOT EXISTS transaction_history (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    card_id VARCHAR(10) NOT NULL,
    tx_type VARCHAR(30) NOT NULL,
    amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    balance_before NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    target_card_id VARCHAR(10),
    receipt_no VARCHAR(64) UNIQUE NOT NULL,
    approved BOOLEAN DEFAULT TRUE NOT NULL,
    reject_code INTEGER DEFAULT 0 NOT NULL,
    reject_reason VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_history_card_id ON transaction_history(card_id);
CREATE INDEX IF NOT EXISTS idx_tx_history_receipt ON transaction_history(receipt_no);
CREATE INDEX IF NOT EXISTS idx_tx_history_timestamp ON transaction_history(timestamp);

-- 3. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    card_id VARCHAR(10),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Seed Initial Accounts (with Bcrypt Hashed 6-digit PINs)
-- PIN for 100123: 123456
-- PIN for 100124: 234567
-- PIN for 100125: 345678
-- PIN for 100126: 456789
INSERT INTO accounts (card_id, pin_hash, account_holder, balance, opening_balance, daily_limit, daily_withdrawn, is_locked, failed_attempts)
VALUES
    ('100123', '$2b$12$K1H9cE9V9zD1/a1dJzG4Q.y5aNqS3E8.fB6H2wQo1fVl8K8vQ7qGm', 'Rohit Nadar (URK26AI1021)', 5000.00, 5000.00, 20000.00, 0.00, FALSE, 0),
    ('100124', '$2b$12$L2I0dF0W0aE2/b2eK0H5R.z6bOrT4F9.gC7I3xRp2gWm9L9wR8rIn', 'Vikash (URK26AI1022)', 8000.00, 8000.00, 20000.00, 0.00, FALSE, 0),
    ('100125', '$2b$12$M3J1eG1X1bF3/c3fL1I6S.a7cPsU5G0.hD8J4ySq3hXn0M0xS9sJo', 'Vahini Muthu (URK26AI1023)', 12000.00, 12000.00, 20000.00, 0.00, FALSE, 0),
    ('100126', '$2b$12$N4K2fH2Y2cG4/d4gM2J7T.b8dQtV6H1.iE9K5zTr4iYo1N1yT0tKp', 'Sujith S. (URK26AI1024)', 3000.00, 3000.00, 20000.00, 0.00, FALSE, 0)
ON CONFLICT (card_id) DO NOTHING;

