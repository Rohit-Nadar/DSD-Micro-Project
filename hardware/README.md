# Hardware Implementation: synthesizable atm_bank.v

This directory contains the synthesizable IEEE 1364-2001 Verilog implementation of the **ATM Security & Transaction Verification System** matching the Simulink architecture.

## Files
- `atm_bank.v`: Core hardware module integrating:
  - Pre-loaded account bank registers (4 demonstration accounts)
  - Combinational comparators for Card ID and PIN verification
  - 10-state Algorithmic Stateflow FSM controller (`S_IDLE` through `S_END`)
  - Arithmetic Logic Unit (ALU): Adders, Subtractors, and Magnitude Comparators
  - Discrete-time sequential balance memory with `REGISTER_WRITE` enable
  - Reject codes:
    - `0`: None / Approved
    - `1`: Invalid Card ID
    - `2`: Invalid PIN
    - `3`: Account Blocked (after 3 consecutive failed attempts)
    - `4`: Daily Limit Exceeded (₹20,000 threshold)
    - `5`: Insufficient Balance
    - `6`: Invalid Transaction Selection
    - `7`: Target Account Not Found (for transfers)
    - `8`: 16-bit Overflow (> ₹65,535)
- `atm_bank_tb.v`: Comprehensive testbench exercising:
  - Test 1: Balance Enquiry (`010`)
  - Test 2: Cash Withdrawal (`000`)
  - Test 3: Insufficient Funds Rejection (Code `5`)
  - Test 4: Cash Deposit (`001`)
  - Test 5: Unrecognized Card ID Rejection (Code `1`)
  - Test 6: 3 Consecutive Wrong PINs & Automatic Lockout (Code `3`)
  - Test 7: Inter-Account Fund Transfer (`011`)

## Simulation with Icarus Verilog
```bash
iverilog -o atm_bank_sim atm_bank.v atm_bank_tb.v
vvp atm_bank_sim
```

## Simulation in Web Browser / Python
The web application includes an interactive cycle-accurate hardware simulation tab that executes `atm_bank.v` in real-time, displaying digital logic analyzer waveforms, bus signals, and FSM transition states.

