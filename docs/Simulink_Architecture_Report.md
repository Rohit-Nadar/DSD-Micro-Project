# ATM Security & Transaction Verification System
## Comprehensive Engineering & Hardware Architecture Report
**Course Code:** 25DC205 – Digital System Design for Data Science and Cybersecurity  
**Department:** Artificial Intelligence and Data Science / Division of Physical Sciences  
**Institution:** Karunya Institute of Technology and Sciences (Deemed-to-be-University), Coimbatore  
**Academic Supervisor:** Dr. Vidhya B.  
**Project Team:**
- **Rohit Nadar (URK26AI1021)** – Team Lead & System Integration
- **Vikash (URK26AI1022)** – Combinational Logic & Arithmetic Unit Design
- **Vahini Muthu (URK26AI1023)** – FSM Algorithmic Stateflow Modeling
- **Sujith S. (URK26AI1024)** – Sequential Memory & Experimental Verification

---

## 1. Project Overview & Motivation
Automated Teller Machines (ATMs) require hardware-enforced multi-stage security to protect account credentials, prevent unauthorized memory modifications, and guarantee atomicity in financial transactions. In high-stakes financial technology, relying strictly on high-level software abstraction introduces race conditions and vulnerabilities. 

This project implements a complete hardware-equivalent digital processing model designed and simulated within **MATLAB Simulink**, **Stateflow**, and synthesizable **IEEE 1364 Verilog HDL**. The system enforces:
1. **Combinational Authentication Verification**: Dual 32-bit equality comparators and AND gate validation ($Y = A \cdot B \cdot C$).
2. **Algorithmic Stateflow Control (FSM)**: 10-state finite state machine orchestrating handshakes and execution branches.
3. **Arithmetic Logic Unit (ALU)**: Magnitude comparators ($A \ge B$), 16-bit adders, subtractors, and overflow limiters ($\le ₹65,535$).
4. **Sequential Balance Memory**: 16 Parallel-In-Parallel-Out (PIPO) D Flip-Flops modeled as a discrete-time Unit Delay ($1/z$) with conditional feedback multiplexing for data persistence.

---

## 2. Division of Functional Subsystems (Sections A through F)

### Section A: Registered Data Unit & User Inputs
- **Registered Data Memory Vault**: Houses factory-programmed baseline records using Simulink Constant blocks:
  - `REGISTERED_PIN`: Predefined user PIN (`123456`, `uint32`).
  - `REGISTERED_CARD_ID`: Predefined user demonstration card ID (`100123`, `uint32`).
  - `INITIAL_BALANCE`: Starting account balance (`₹5,000`, `uint16`).
- **User Input Subsystem**: Emulates physical ATM card reader and keypad interfaces:
  - `CARD_INPUT`: 6-digit Card ID numeric input (`uint32`).
  - `PIN_INPUT`: 6-digit PIN entry masked keypad (`uint32`).
  - `AMOUNT_INPUT`: Transaction value (`uint16`).
  - `TRANSACTION_SELECT`: 2-bit slider / opcode selector (`00`: Withdraw, `01`: Deposit, `10`: Balance Enquiry, `11`: Invalid).

### Section B: Combinational Verification Subsystem
Validates credentials using 32-bit equality comparators before granting access to transactional states:
$$\text{PIN\_VALID} = (\text{PIN\_INPUT} == \text{REGISTERED\_PIN})$$
$$\text{CARD\_VALID} = (\text{CARD\_INPUT} == \text{REGISTERED\_CARD\_ID})$$
$$\text{AUTH\_SUCCESS} = \text{PIN\_VALID} \cdot \text{CARD\_VALID}$$

### Section C: Algorithmic FSM Controller Unit
Implements a 10-state Stateflow algorithmic state machine:
- `S0 – IDLE`: Awaits user card entry and start strobe.
- `S1 – VERIFY`: Checks credentials; increments failed attempt counter; triggers lockout after 3 consecutive wrong attempts.
- `S2 – SELECT`: Decodes 2-bit / 3-bit transaction opcode.
- `S3 – WITHDRAW`: Checks daily limit ($M + \text{spent} \le \text{limit}$) and magnitude comparison ($B_{\text{current}} \ge M$).
- `S4 – DEPOSIT`: Evaluates addition and 16-bit capacity overflow ($\le 65,535$).
- `S5 – BALANCE`: Direct read-only path without memory write assertion.
- `S6 – TRANSFER`: Validates target card ID and routes atomic debit/credit.
- `S7 – INTEREST`: Calculates pro-rated annual interest bonus.
- `S8 – UPDATE`: Asserts `REGISTER_WRITE = 1` to latch updated balance in sequential memory.
- `S9 – OUTPUT`: Illuminates green indicator lamp and strobes receipt generator.
- `S10 – REJECT`: Illuminates red indicator lamp and outputs corresponding Reject Code (1 to 8).
- `S11 – END`: Resets handshake signals and transitions back to `S0 – IDLE`.

### Section D: Transaction Processor (ALU)
- **Path 1 (00): Withdrawal Subtraction**
  $$B_{\text{new}} = B_{\text{current}} - M \quad (\text{when } B_{\text{current}} \ge M)$$
- **Path 2 (01): Deposit Addition**
  $$B_{\text{new}} = B_{\text{current}} + M \quad (\text{with overflow limit } \le ₹65,535)$$
- **Path 3 (10): Balance Enquiry**
  $$B_{\text{new}} = B_{\text{current}} \quad (\text{with } \text{REGISTER\_WRITE} = 0)$$

### Section E: Sequential Balance Memory Subsystem
- Preserves financial balances between discrete simulation steps.
- Modeled as a discrete-time Unit Delay block ($1/z$, sample time = 1s, initial condition = ₹5,000).
- State transfer equation:
  $$Q_{\text{next}} = \begin{cases} B_{\text{new}}, & \text{REGISTER\_WRITE} = 1 \\ Q_{\text{current}}, & \text{REGISTER\_WRITE} = 0 \end{cases}$$

### Section F: Final Output Unit & Dashboard Indicators
- **Updated Balance Display**: Numerical digital readout.
- **Approved Lamp**: Green LED asserted on valid FSM completion (`APPROVAL = 1`).
- **Rejected Lamp**: Red LED asserted on authentication or balance failure (`REJECTION = 1`).
- **Receipt Strobe**: Generates thermal slip and PDF receipt with unique identifier.

---

## 3. Truth Table & 3-Variable Karnaugh Map Optimization

The multi-stage authorization gate considers three fundamental system variables:
- **Variable A**: PIN Correctness ($\text{PIN\_INPUT} == \text{REGISTERED\_PIN}$)
- **Variable B**: Card Validity ($\text{CARD\_INPUT} == \text{REGISTERED\_CARD\_ID}$)
- **Variable C**: Sufficient Funds ($B_{\text{current}} \ge M$)

### Truth Table
| Minterm | PIN (A) | Card (B) | Funds (C) | Approval (Y) | System Action |
|:---:|:---:|:---:|:---:|:---:|:---|
| $m_0$ | 0 | 0 | 0 | 0 | Rejection (Invalid Card & PIN) |
| $m_1$ | 0 | 0 | 1 | 0 | Rejection (Invalid Credentials) |
| $m_2$ | 0 | 1 | 0 | 0 | Rejection (Wrong PIN) |
| $m_3$ | 0 | 1 | 1 | 0 | Rejection (Wrong PIN) |
| $m_4$ | 1 | 0 | 0 | 0 | Rejection (Unrecognized Card) |
| $m_5$ | 1 | 0 | 1 | 0 | Rejection (Unrecognized Card) |
| $m_6$ | 1 | 1 | 0 | 0 | Rejection (Insufficient Balance) |
| $m_7$ | 1 | 1 | 1 | 1 | **APPROVED** (All checks satisfied) |

### Karnaugh Map (3-Variable: $A \backslash BC$)
```
      BC
A     00    01    11    10
0      0     0     0     0
1      0     0   1(m7)   0
```

- **Canonical Sum of Products (SOP):**
  $$Y = \Sigma m(7) = A \cdot B \cdot C$$
- **Rejection Signal:**
  $$\overline{Y} = (A \cdot B \cdot C)' = \overline{A} + \overline{B} + \overline{C} \quad (\text{by De Morgan's Law})$$

---

## 4. Hardware Reject Codes (atm_bank.v)
| Reject Code | Symbolic Constant | Description |
|:---:|:---|:---|
| `0` | `RC_NONE` | Transaction Approved (Green indicator) |
| `1` | `RC_INVALID_CARD` | Card ID not found in registered memory |
| `2` | `RC_INVALID_PIN` | Entered PIN does not match registered hash |
| `3` | `RC_ACCOUNT_LOCKED` | Account blocked after 3 consecutive wrong attempts |
| `4` | `RC_DAILY_LIMIT` | Cumulative withdrawals exceed ₹20,000 daily limit |
| `5` | `RC_INSUFFICIENT_FND` | Requested amount exceeds available balance |
| `6` | `RC_INVALID_TX` | Unknown or illegal transaction opcode |
| `7` | `RC_TARGET_NOT_FOUND` | Recipient card ID not found for fund transfer |
| `8` | `RC_OVERFLOW` | Result exceeds 16-bit capacity limit (> ₹65,535) |

---

## 5. Functional Requirements Verification Matrix (FR-01 to FR-12)
All 12 functional requirements have been verified programmatically and attain a **100.0% PASS compliance score**:
- **FR-01: Card Insertion & Identification** – PASS (Sections A & B)
- **FR-02: 10-Digit Interactive Keypad Format** – PASS (Section A)
- **FR-03: PIN Verification & Bcrypt/Comparator Check** – PASS (Section B)
- **FR-04: 3-Attempt Security Lockout Rule** – PASS (Sections B & C)
- **FR-05: Account Status & Balance Retrieval (Read-Only)** – PASS (Sections D & E)
- **FR-06: Cash Withdrawal with Magnitude Comparison** – PASS (Section D)
- **FR-07: Daily Withdrawal Limit Enforcement (₹20,000)** – PASS (Sections C & D)
- **FR-08: Cash Deposit & 16-Bit Overflow Check** – PASS (Section D)
- **FR-09: Inter-Account Fund Transfer Routing** – PASS (Sections C & D)
- **FR-10: Interest Bonus Credit Calculation** – PASS (Sections D & E)
- **FR-11: Sequential State Latching & Audit Logging** – PASS (Section E)
- **FR-12: Visual Indicators, Audio Alerts & Thermal/PDF Receipts** – PASS (Section F)

