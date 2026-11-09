# ============================================================================
# PROJECT: ATM Security & Transaction Verification System
# FILE: backend/verilog_simulator.py
# DESCRIPTION: Cycle-accurate Verilog FSM hardware engine & waveform generator
# ============================================================================

import subprocess
import shutil
import os
from typing import Dict, Any, List

# State and code definitions matching atm_bank.v
FSM_STATES = {
    0: "S_IDLE",
    1: "S_VERIFY",
    2: "S_SELECT",
    3: "S_WITHDRAW",
    4: "S_DEPOSIT",
    5: "S_BALANCE",
    6: "S_TRANSFER",
    7: "S_INTEREST",
    8: "S_UPDATE",
    9: "S_OUTPUT",
    10: "S_REJECT",
    11: "S_END"
}

REJECT_CODES = {
    0: "None / Approved",
    1: "Invalid Card ID",
    2: "Invalid PIN",
    3: "Account Blocked (3 Wrong PINs)",
    4: "Daily Withdrawal Limit Exceeded",
    5: "Insufficient Balance",
    6: "Invalid Transaction Selection",
    7: "Target Account Not Found",
    8: "Arithmetic Overflow (> ₹65,535)"
}

class AtmBankHardwareSim:
    """Cycle-accurate software model of the synthesizable atm_bank.v hardware."""

    def __init__(self):
        self.reset()

    def reset(self):
        # 4 hardware accounts matching table
        self.accounts = [
            {"card": 100123, "pin": 123456, "bal": 5000, "limit": 20000, "spent": 0, "locked": False, "attempts": 0, "name": "Rohit Nadar (URK26AI1021)"},
            {"card": 100124, "pin": 234567, "bal": 8000, "limit": 20000, "spent": 0, "locked": False, "attempts": 0, "name": "Vikash (URK26AI1022)"},
            {"card": 100125, "pin": 345678, "bal": 12000, "limit": 20000, "spent": 0, "locked": False, "attempts": 0, "name": "Vahini Muthu (URK26AI1023)"},
            {"card": 100126, "pin": 456789, "bal": 3000, "limit": 20000, "spent": 0, "locked": False, "attempts": 0, "name": "Sujith S. (URK26AI1024)"},
        ]
        self.fsm_state = 0
        self.current_balance = 0
        self.approved = False
        self.rejected = False
        self.reject_code = 0
        self.receipt_ready = False
        self.register_write = False
        self.daily_withdrawn = 0
        self.attempt_count = 0

    def run_transaction(self, card_id: int, pin: int, tx_type: int, amount: int = 0, target_card: int = 0) -> Dict[str, Any]:
        """
        Executes a hardware transaction cycle-by-cycle, capturing clock cycles,
        FSM transitions, signal levels, and register state evolution.
        """
        cycles: List[Dict[str, Any]] = []
        clock = 0

        def log_cycle(comment: str):
            nonlocal clock
            cycles.append({
                "cycle": clock,
                "fsm_state_code": self.fsm_state,
                "fsm_state_name": FSM_STATES.get(self.fsm_state, "UNKNOWN"),
                "current_balance": self.current_balance,
                "approved": 1 if self.approved else 0,
                "rejected": 1 if self.rejected else 0,
                "reject_code": self.reject_code,
                "reject_reason": REJECT_CODES.get(self.reject_code, ""),
                "register_write": 1 if self.register_write else 0,
                "receipt_ready": 1 if self.receipt_ready else 0,
                "attempt_count": self.attempt_count,
                "daily_withdrawn": self.daily_withdrawn,
                "comment": comment
            })
            clock += 1

        # Cycle 0: Idle State
        self.fsm_state = 0
        self.approved = False
        self.rejected = False
        self.receipt_ready = False
        self.register_write = False
        self.reject_code = 0
        log_cycle("S_IDLE: Awaiting Start Strobe")

        # Cycle 1: Start Strobe & Transition to S_VERIFY
        self.fsm_state = 1
        log_cycle("S_VERIFY: Evaluating 32-bit Comparators for Card & PIN")

        # Verification logic
        active_acc = None
        for acc in self.accounts:
            if acc["card"] == card_id:
                active_acc = acc
                break

        if not active_acc:
            self.reject_code = 1
            self.fsm_state = 10  # S_REJECT
            self.rejected = True
            log_cycle("REJECT: Card ID not found in hardware register bank")
            self.fsm_state = 11  # S_END
            log_cycle("S_END: Terminating transaction")
            self.fsm_state = 0
            log_cycle("S_IDLE: Ready for next transaction")
            return self._build_result(cycles)

        self.attempt_count = active_acc["attempts"]
        self.current_balance = active_acc["bal"]
        self.daily_withdrawn = active_acc["spent"]

        if active_acc["locked"]:
            self.reject_code = 3
            self.fsm_state = 10  # S_REJECT
            self.rejected = True
            log_cycle("REJECT: Account locked due to prior 3 wrong attempts")
            self.fsm_state = 11
            log_cycle("S_END: Terminating transaction")
            self.fsm_state = 0
            log_cycle("S_IDLE: Ready")
            return self._build_result(cycles)

        if active_acc["pin"] != pin:
            active_acc["attempts"] += 1
            self.attempt_count = active_acc["attempts"]
            if active_acc["attempts"] >= 3:
                active_acc["locked"] = True
                self.reject_code = 3
                log_cycle(f"S_VERIFY: Wrong PIN (Attempt 3). Account LOCKED!")
            else:
                self.reject_code = 2
                log_cycle(f"S_VERIFY: Wrong PIN (Attempt {active_acc['attempts']}/3)")
            self.fsm_state = 10
            self.rejected = True
            log_cycle("REJECT: Authentication failed")
            self.fsm_state = 11
            log_cycle("S_END: Terminating transaction")
            self.fsm_state = 0
            log_cycle("S_IDLE: Ready")
            return self._build_result(cycles)

        # Successful PIN & Card Verification
        active_acc["attempts"] = 0
        self.attempt_count = 0
        log_cycle("S_VERIFY: AUTH_SUCCESS = 1 (PIN and Card ID match)")

        # Cycle 2: S_SELECT
        self.fsm_state = 2
        log_cycle(f"S_SELECT: Decoding Transaction Type ({tx_type})")

        new_bal = active_acc["bal"]
        target_acc = None

        if tx_type == 0:  # WITHDRAW
            self.fsm_state = 3
            log_cycle("S_WITHDRAW: Checking Daily Limit & Magnitude Comparator (A >= B)")
            if (active_acc["spent"] + amount) > active_acc["limit"]:
                self.reject_code = 4
                self.fsm_state = 10
                self.rejected = True
                log_cycle(f"REJECT: Daily limit exceeded (Spent ₹{active_acc['spent']} + ₹{amount} > ₹{active_acc['limit']})")
            elif active_acc["bal"] < amount:
                self.reject_code = 5
                self.fsm_state = 10
                self.rejected = True
                log_cycle(f"REJECT: Insufficient balance (Balance ₹{active_acc['bal']} < ₹{amount})")
            else:
                new_bal = active_acc["bal"] - amount
                active_acc["spent"] += amount
                self.daily_withdrawn = active_acc["spent"]
                log_cycle(f"ALU Subtraction: ₹{active_acc['bal']} - ₹{amount} = ₹{new_bal}")
                self.fsm_state = 8  # S_UPDATE

        elif tx_type == 1:  # DEPOSIT
            self.fsm_state = 4
            log_cycle("S_DEPOSIT: Adder Execution & 16-bit Overflow Verification")
            if (active_acc["bal"] + amount) > 65535:
                self.reject_code = 8
                self.fsm_state = 10
                self.rejected = True
                log_cycle("REJECT: 16-bit Capacity Overflow (> ₹65,535)")
            else:
                new_bal = active_acc["bal"] + amount
                log_cycle(f"ALU Addition: ₹{active_acc['bal']} + ₹{amount} = ₹{new_bal}")
                self.fsm_state = 8  # S_UPDATE

        elif tx_type == 2:  # BALANCE ENQUIRY
            self.fsm_state = 5
            log_cycle(f"S_BALANCE: Direct Memory Read (₹{active_acc['bal']}). REGISTER_WRITE = 0")
            self.fsm_state = 9  # Direct to S_OUTPUT

        elif tx_type == 3:  # TRANSFER
            self.fsm_state = 6
            log_cycle(f"S_TRANSFER: Validating Target Card {target_card}")
            for acc in self.accounts:
                if acc["card"] == target_card:
                    target_acc = acc
                    break

            if not target_acc or target_card == card_id:
                self.reject_code = 7
                self.fsm_state = 10
                self.rejected = True
                log_cycle("REJECT: Target card invalid or self-transfer attempted")
            elif active_acc["bal"] < amount:
                self.reject_code = 5
                self.fsm_state = 10
                self.rejected = True
                log_cycle("REJECT: Insufficient funds for transfer")
            else:
                new_bal = active_acc["bal"] - amount
                target_acc["bal"] += amount
                log_cycle(f"TRANSFER ALU: Deduct ₹{amount} from sender, credit target account")
                self.fsm_state = 8  # S_UPDATE

        elif tx_type == 4:  # INTEREST
            self.fsm_state = 7
            interest = (active_acc["bal"] >> 5) + 50
            new_bal = active_acc["bal"] + interest
            log_cycle(f"S_INTEREST: Pro-rated interest credit computed: +₹{interest}")
            self.fsm_state = 8

        else:
            self.reject_code = 6
            self.fsm_state = 10
            self.rejected = True
            log_cycle("REJECT: Unknown transaction opcode")

        # If rejected, proceed to S_REJECT -> S_END
        if self.fsm_state == 10:
            log_cycle(f"S_REJECT: Error Code {self.reject_code} ({REJECT_CODES.get(self.reject_code)})")
            self.fsm_state = 11
            log_cycle("S_END: Releasing bus")
            self.fsm_state = 0
            log_cycle("S_IDLE: Reset to ready")
            return self._build_result(cycles)

        # S_UPDATE: Sequential Balance Memory Latch
        if self.fsm_state == 8:
            self.register_write = True
            active_acc["bal"] = new_bal
            self.current_balance = new_bal
            log_cycle(f"S_UPDATE: REGISTER_WRITE = 1. Balance Latch updated to ₹{new_bal}")
            self.fsm_state = 9

        # S_OUTPUT: Displays and Receipt
        if self.fsm_state == 9:
            self.register_write = False
            self.approved = True
            self.receipt_ready = True
            log_cycle("S_OUTPUT: APPROVAL = 1. Receipt strobe asserted.")
            self.fsm_state = 11

        # S_END
        self.fsm_state = 11
        log_cycle("S_END: Transaction Completed.")
        self.fsm_state = 0
        log_cycle("S_IDLE: Ready for next operation.")

        return self._build_result(cycles)

    def _build_result(self, cycles: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "success": self.approved,
            "approved": self.approved,
            "rejected": self.rejected,
            "reject_code": self.reject_code,
            "reject_reason": REJECT_CODES.get(self.reject_code, ""),
            "final_balance": self.current_balance,
            "daily_withdrawn": self.daily_withdrawn,
            "attempt_count": self.attempt_count,
            "total_cycles": len(cycles),
            "clock_cycles": cycles,
            "accounts_snapshot": [
                {
                    "card": a["card"],
                    "name": a["name"],
                    "bal": a["bal"],
                    "locked": a["locked"],
                    "attempts": a["attempts"],
                    "spent": a["spent"]
                }
                for a in self.accounts
            ]
        }

# Global singleton simulator instance
hardware_engine = AtmBankHardwareSim()

