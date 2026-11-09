# ATM Security & Transaction Verification System
### Digital System Design Micro-Project | Course 25DC205
**Karunya Institute of Technology and Sciences (Deemed-to-be-University), Coimbatore**  
**Department of Artificial Intelligence & Data Science | Division of Physical Sciences**

**Academic Supervisor:** Dr. Vidhya B.  
**Project Team (Team 6):**
- **Rohit Nadar (URK26AI1021)** – Team Lead & Full-Stack Hardware-Software Integration
- **Vikash (URK26AI1022)** – Combinational Logic, Equality Comparators & ALU Arithmetic
- **Vahini Muthu (URK26AI1023)** – Algorithmic 10-State Stateflow FSM Controller
- **Sujith S. (URK26AI1024)** – Sequential Balance Memory (Unit Delay 1/z) & Experimental Testing

---

## 🚀 Live Demo & Architecture Highlights
- **Interactive 3D Three.js Circuit Explorer**: Real-time 3D visualization of Sections A through F with smooth camera navigation, glowing signal flow pulses, and logic equation popups.
- **In-Browser Verilog Hardware Simulator**: Cycle-accurate simulation of `hardware/atm_bank.v` with interactive clock stepping, logic analyzer digital waveforms, bus inspectors, and FSM transition graphs.
- **Physical ATM Kiosk Experience**: Tactile metallic 10-digit BCD keypad, animated card reader slot, masked PIN entry, 5 transaction modes (Withdraw, Deposit, Balance, Transfer, Interest), green/red glowing status indicators, and thermal receipt with printable/downloadable official PDF receipt!
- **100% Automated Compliance Suite**: 1-click verification of all **Functional Requirements (FR-01 to FR-12)** with live pass/fail diagnostics.

---

## 📁 Repository Directory Structure

```text
DSD Micro Project/
├── backend/
│   ├── main.py                     # FastAPI REST API endpoints & CORS
│   ├── database.py                 # Neon PostgreSQL & SQLite connection engine
│   ├── models.py                   # SQLAlchemy ORM models (accounts, transaction_history)
│   ├── schemas.py                  # Pydantic v2 validation schemas
│   ├── auth.py                     # Bcrypt PIN hashing and format validation
│   ├── receipt.py                  # ReportLab PDF receipt & thermal text receipt generator
│   ├── verilog_simulator.py        # Python cycle-accurate hardware simulation engine
│   ├── test_suite_fr.py            # Automated test suite covering FR-01 to FR-12
│   ├── seed_data.py                # Database seeder with pre-loaded demo accounts
│   ├── database_migration_neon.sql # Neon PostgreSQL production SQL migration script
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile                  # Containerization specification for Render
├── frontend/
│   ├── index.html                  # HTML entry point with Chakra Petch & JetBrains Mono fonts
│   ├── package.json                # React 18, Vite, Three.js, Tailwind CSS, Lucide
│   ├── vite.config.js              # Vite configuration with API proxy
│   ├── tailwind.config.js          # Tailwind theme & digital ATM color palette
│   ├── vercel.json                 # Vercel deployment configuration
│   ├── public/
│   │   └── assets/                 # Original Simulink schematics & diagrams
│   └── src/
│       ├── main.jsx                # Application root
│       ├── App.jsx                 # View state coordinator (Kiosk, 3D, Sim, Tests, Guide)
│       ├── index.css               # Styling, thermal receipt paper, glow utilities
│       ├── components/
│       │   ├── Navbar.jsx          # Mode navigation, audio toggle, backend status
│       │   ├── AtmKiosk.jsx        # Realistic physical ATM cabinet & screen state manager
│       │   ├── Keypad.jsx          # 10-digit tactile metallic BCD keypad
│       │   ├── ScreenCardInsert.jsx# 6-digit card reader with 1-click demo accounts
│       │   ├── ScreenPinEntry.jsx  # PIN entry, masking, and 3-attempt lockout warning
│       │   ├── ScreenHome.jsx      # Balance display, quick action cards, last 8 transactions
│       │   ├── ScreenTransaction.jsx# Withdraw, Deposit, Balance, Transfer, Interest
│       │   ├── ScreenApproval.jsx  # Glowing green/red lamps, confetti, reject code viewer
│       │   ├── Circuit3DViewer.jsx # Three.js WebGL 3D interactive circuit visualizer
│       │   ├── HardwareSimModal.jsx# Live Verilog waveform viewer & FSM node graph
│       │   ├── AdminTestPanel.jsx  # FR-01 to FR-12 test suite & account manager
│       │   ├── ReceiptModal.jsx    # Thermal slip modal & PDF download trigger
│       │   └── SimulinkArchitectureGuide.jsx # Technical report, K-Maps, truth tables
│       ├── services/
│       │   ├── api.js              # API client connecting to Render backend
│       │   └── verilogEngine.js    # In-browser pure JS cycle-accurate Verilog engine
│       └── utils/
│           ├── audio.js            # Web Audio API synthesized beeps and chimes
│           └── formatters.js       # INR currency and masked card formatting
├── hardware/
│   ├── atm_bank.v                  # Synthesizable IEEE 1364 Verilog hardware module
│   ├── atm_bank_tb.v               # Verilog testbench covering test scenarios
│   └── README.md                   # Verilog compilation & simulation instructions
├── docs/
│   ├── Simulink_Architecture_Report.md # Full academic report & CO attainment
│   └── assets/                     # Original diagrams extracted from college report
├── render.yaml                     # Render.com Blueprint specification
├── .env.example                    # Example environment variables
├── run_local.bat                   # 1-Click launcher for both backend & frontend
├── start_backend.bat               # Starts Python FastAPI backend
└── start_frontend.bat              # Starts React Vite frontend
```

---

## ⚡ Quick Start: Running Locally

### Prerequisites
- **Python 3.10+** (with pip)
- **Node.js 18+** (with npm)

### Option 1: 1-Click Launch (Windows)
Double-click `run_local.bat` in the project root. This starts:
1. Backend on `http://127.0.0.1:8000` (API docs at `http://127.0.0.1:8000/docs`)
2. Frontend on `http://localhost:3000`

### Option 2: Manual Terminal Startup

#### 1. Start Backend:
```bash
cd backend
pip install -r requirements.txt
python seed_data.py
uvicorn main:app --reload --port 8000
```

#### 2. Start Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 🌐 Cloud Deployment Guide

### 1. Database: Neon (PostgreSQL)
1. Sign up for free at [neon.tech](https://neon.tech).
2. Create a project named `atm-security-verification`.
3. Copy your connection string:
   ```text
   postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Open the Neon SQL Editor and execute the script in `backend/database_migration_neon.sql`. All tables (`accounts`, `transaction_history`, `audit_logs`) and demo accounts will be initialized with secure Bcrypt hashes.

### 2. Backend: Render.com
1. Fork or push this repository to GitHub.
2. Sign in to [render.com](https://render.com) and click **New +** → **Blueprint** (or **Web Service**).
3. If using **Blueprint**, connect your repository: Render will detect `render.yaml` automatically.
4. If setting up manually:
   - **Environment:** Python
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `PYTHON_VERSION`: `3.12.0`
6. Click **Deploy Web Service**. Note your public URL (e.g., `https://atm-security-backend.onrender.com`).

### 3. Frontend: Vercel
1. Sign in to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Select your repository.
3. Configure the project:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://atm-security-backend.onrender.com`).
5. Click **Deploy**. Your frontend is now live with global edge routing!

---

## 🛠️ Hardware Simulation (Verilog atm_bank.v)

### Running in Browser
Navigate to the **Hardware Sim** tab in the web application:
1. Select an account (e.g. Card 100123 - Rohit Nadar).
2. Choose a transaction opcode (Withdraw, Deposit, Balance, Transfer, Interest).
3. Click **Run Verilog** to observe:
   - Real-time FSM node transitions (`S_IDLE` ➔ `S_VERIFY` ➔ `S_SELECT` ➔ `S_UPDATE` ➔ `S_OUTPUT`).
   - Digital timing waveform logic analyzer on HTML5 canvas.
   - 16-bit registers and bus signal values.
   - Step clock manually with **Step Clock** or play continuously at 2Hz.

### Running with Icarus Verilog Locally (Optional)
If you have `iverilog` installed on your machine:
```bash
cd hardware
iverilog -o atm_bank_sim atm_bank.v atm_bank_tb.v
vvp atm_bank_sim
```
Expected output:
```text
==================================================================
STARTING ATM SECURITY & TRANSACTION SYSTEM HARDWARE VERIFICATION
==================================================================

--- [TEST 1] Balance Enquiry (Card 100123) ---
PASS: Balance Enquiry = ₹5000, Approved=1

--- [TEST 2] Cash Withdrawal ₹2,000 (Card 100123) ---
PASS: Withdrawal successful. New Balance = ₹3000

--- [TEST 3] Insufficient Balance Test (Withdraw ₹10,000) ---
PASS: Rejected as expected (Code 5: Insufficient Funds)

--- [TEST 4] Cash Deposit ₹4,000 (Card 100123) ---
PASS: Deposit successful. New Balance = ₹7000

--- [TEST 5] Invalid Card Test (Card 999999) ---
PASS: Rejected as expected (Code 1: Invalid Card ID)

--- [TEST 6] Wrong PIN Attempts & 3-Strike Lockout (Card 100124) ---
Attempt 1: Rejected code=2, Attempts=1
Attempt 2: Rejected code=2, Attempts=2
Attempt 3: Rejected code=3, Attempts=3
PASS: Account locked after 3 failed attempts (Code 3: Account Locked)

--- [TEST 7] Inter-Account Transfer ₹2,000 (Card 100125 -> 100126) ---
PASS: Transfer approved. Sender New Balance = ₹10000

==================================================================
ALL HARDWARE SIMULATION TESTS COMPLETED SUCCESSFULLY!
==================================================================
```

---

## 📋 Functional Requirements Matrix (FR-01 to FR-12)

| Requirement ID | Description | Circuit Section | Status |
|:---|:---|:---:|:---:|
| **FR-01** | Card Insertion & Identification against DB / Register ROM | Section A & B | **PASS (100%)** |
| **FR-02** | 10-Digit Interactive Keypad Entry with Masking & Clear/Cancel | Section A | **PASS (100%)** |
| **FR-03** | PIN Authentication with 32-bit Comparators & Bcrypt Hashing | Section B | **PASS (100%)** |
| **FR-04** | 3-Attempt Security Lockout (`is_locked = True`, Reject Code 3) | Section B & C | **PASS (100%)** |
| **FR-05** | Read-Only Account Status & Balance Retrieval (`REGISTER_WRITE=0`) | Section D & E | **PASS (100%)** |
| **FR-06** | Cash Withdrawal with Magnitude Comparison ($A \ge B$, Code 5) | Section D | **PASS (100%)** |
| **FR-07** | Daily Withdrawal Limit Enforcement (₹20,000/day, Reject Code 4) | Section C & D | **PASS (100%)** |
| **FR-08** | Cash Deposit with 16-bit Overflow Protection ($\le ₹65,535$, Code 8) | Section D | **PASS (100%)** |
| **FR-09** | Inter-Account Fund Transfer with Atomic Debit/Credit (Code 7) | Section C & D | **PASS (100%)** |
| **FR-10** | Interest Calculation & Credit Bonus Computation | Section D & E | **PASS (100%)** |
| **FR-11** | Sequential Balance Memory Latching (`REGISTER_WRITE=1`) & Audit Trail | Section E | **PASS (100%)** |
| **FR-12** | Visual Green/Red Lamps, Audio Tones, Thermal Slip & PDF Receipts | Section F | **PASS (100%)** |

---

## 🔒 Security Reject Codes Reference
| Code | Hardware Constant | Trigger Condition |
|:---:|:---|:---|
| `0` | `RC_NONE` | Transaction Approved (Green indicator lamp) |
| `1` | `RC_INVALID_CARD` | 6-digit Card ID not found in registered accounts |
| `2` | `RC_INVALID_PIN` | Incorrect PIN entered (Attempts 1 or 2) |
| `3` | `RC_ACCOUNT_LOCKED` | Account blocked after 3 consecutive failed PIN attempts |
| `4` | `RC_DAILY_LIMIT` | Transaction amount exceeds ₹20,000 daily withdrawal limit |
| `5` | `RC_INSUFFICIENT_FND` | Requested withdrawal amount exceeds available balance |
| `6` | `RC_INVALID_TX` | Illegal or unrecognized transaction opcode |
| `7` | `RC_TARGET_NOT_FOUND` | Recipient card ID invalid or self-transfer specified |
| `8` | `RC_OVERFLOW` | Result exceeds 16-bit hardware register capacity (> ₹65,535) |

---

## 🎓 Academic Demonstration Accounts
| Card ID | 6-Digit PIN | Account Holder | Baseline Balance | Daily Limit | Status |
|:---:|:---:|:---|:---:|:---:|:---:|
| `100123` | `123456` | **Rohit Nadar (URK26AI1021)** | ₹5,000.00 | ₹20,000.00 | Active |
| `100124` | `234567` | **Vikash (URK26AI1022)** | ₹8,000.00 | ₹20,000.00 | Active |
| `100125` | `345678` | **Vahini Muthu (URK26AI1023)** | ₹12,000.00 | ₹20,000.00 | Active |
| `100126` | `456789` | **Sujith S. (URK26AI1024)** | ₹3,000.00 | ₹20,000.00 | Active |

---

## 📄 License & Attribution
Developed for academic presentation and Continuous Internal Examination (CIE) in **25DC205 – Digital System Design for Data Science and Cybersecurity** at **Karunya Institute of Technology and Sciences**. All hardware models, Stateflow state diagrams, and circuit diagrams are copyright of the project authors under academic license.

