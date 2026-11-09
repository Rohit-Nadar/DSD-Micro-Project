// ============================================================================
// In-Browser Cycle-Accurate Verilog Hardware Simulator for atm_bank.v
// ============================================================================

export const FSM_STATES = [
  { code: 0, name: 'S_IDLE', desc: 'Awaiting Start Strobe' },
  { code: 1, name: 'S_VERIFY', desc: 'Evaluating Comparators' },
  { code: 2, name: 'S_SELECT', desc: 'Decoding Opcode' },
  { code: 3, name: 'S_WITHDRAW', desc: 'ALU Subtractor & Limit Check' },
  { code: 4, name: 'S_DEPOSIT', desc: 'ALU Adder & Overflow Check' },
  { code: 5, name: 'S_BALANCE', desc: 'Direct Read Path' },
  { code: 6, name: 'S_TRANSFER', desc: 'Routing Inter-Account Transfer' },
  { code: 7, name: 'S_INTEREST', desc: 'Computing Pro-rated Interest' },
  { code: 8, name: 'S_UPDATE', desc: 'Asserting REGISTER_WRITE Latch' },
  { code: 9, name: 'S_OUTPUT', desc: 'Asserting APPROVAL & Receipt' },
  { code: 10, name: 'S_REJECT', desc: 'Asserting REJECT & Error Flag' },
  { code: 11, name: 'S_END', desc: 'Handshake Cleanup' }
];

export const REJECT_CODES = {
  0: 'None / Approved',
  1: 'Invalid Card ID',
  2: 'Invalid PIN',
  3: 'Account Blocked (3 Wrong PINs)',
  4: 'Daily Limit Exceeded',
  5: 'Insufficient Funds',
  6: 'Invalid Transaction Type',
  7: 'Target Account Not Found',
  8: '16-bit Overflow (> ₹65,535)'
};

export class BrowserVerilogSimulator {
  constructor() {
    this.reset();
  }

  reset() {
    this.accounts = [
      { card: 100123, pin: 123456, bal: 5000, limit: 20000, spent: 0, locked: false, attempts: 0, name: 'Rohit Nadar (URK26AI1021)' },
      { card: 100124, pin: 234567, bal: 8000, limit: 20000, spent: 0, locked: false, attempts: 0, name: 'Vikash (URK26AI1022)' },
      { card: 100125, pin: 345678, bal: 12000, limit: 20000, spent: 0, locked: false, attempts: 0, name: 'Vahini Muthu (URK26AI1023)' },
      { card: 100126, pin: 456789, bal: 3000, limit: 20000, spent: 0, locked: false, attempts: 0, name: 'Sujith S. (URK26AI1024)' }
    ];

    this.fsmState = 0;
    this.currentBalance = 0;
    this.approved = 0;
    this.rejected = 0;
    this.rejectCode = 0;
    this.receiptReady = 0;
    this.registerWrite = 0;
    this.attemptCount = 0;
    this.dailyWithdrawn = 0;
    this.cycleCount = 0;
    this.waveformHistory = [];
  }

  runSimulation({ cardId, pin, txType, amount = 0, targetCard = 0 }) {
    const cycles = [];
    let state = 0;
    let appr = 0;
    let rej = 0;
    let rCode = 0;
    let regWrite = 0;
    let receipt = 0;
    let curBal = 0;
    let attempts = 0;
    let spent = 0;

    const logCycle = (st, comment) => {
      cycles.push({
        cycle: cycles.length,
        state,
        stateName: FSM_STATES[state]?.name || 'UNKNOWN',
        curBal,
        approved: appr,
        rejected: rej,
        rejectCode: rCode,
        rejectReason: REJECT_CODES[rCode] || '',
        registerWrite: regWrite,
        receiptReady: receipt,
        attempts,
        spent,
        comment
      });
    };

    // Cycle 0: IDLE
    state = 0;
    logCycle(state, 'S_IDLE: Awaiting Start Strobe');

    // Cycle 1: VERIFY
    state = 1;
    const activeAcc = this.accounts.find(a => a.card === Number(cardId));
    if (!activeAcc) {
      rCode = 1;
      rej = 1;
      state = 10;
      logCycle(state, 'REJECT: Card ID not found in hardware register bank');
      state = 11;
      logCycle(state, 'S_END: Terminating transaction');
      state = 0;
      logCycle(state, 'S_IDLE: Reset');
      return { 
        success: false, 
        approved: false, 
        cycles, 
        rejectCode: rCode, 
        rejectReason: REJECT_CODES[rCode],
        finalBalance: 0,
        dailyWithdrawn: 0,
        accounts: JSON.parse(JSON.stringify(this.accounts))
      };
    }

    curBal = activeAcc.bal;
    spent = activeAcc.spent;
    attempts = activeAcc.attempts;

    if (activeAcc.locked) {
      rCode = 3;
      rej = 1;
      state = 10;
      logCycle(state, 'REJECT: Account locked (3 previous failed attempts)');
      state = 11;
      logCycle(state, 'S_END: Terminating transaction');
      state = 0;
      logCycle(state, 'S_IDLE: Reset');
      return { 
        success: false, 
        approved: false, 
        cycles, 
        rejectCode: rCode, 
        rejectReason: REJECT_CODES[rCode],
        finalBalance: curBal,
        dailyWithdrawn: spent,
        accounts: JSON.parse(JSON.stringify(this.accounts))
      };
    }

    if (activeAcc.pin !== Number(pin)) {
      activeAcc.attempts += 1;
      attempts = activeAcc.attempts;
      if (activeAcc.attempts >= 3) {
        activeAcc.locked = true;
        rCode = 3;
        logCycle(state, 'S_VERIFY: Wrong PIN (Attempt 3/3). Account LOCKED!');
      } else {
        rCode = 2;
        logCycle(state, `S_VERIFY: Wrong PIN (Attempt ${activeAcc.attempts}/3)`);
      }
      rej = 1;
      state = 10;
      logCycle(state, 'REJECT: Authentication failed');
      state = 11;
      logCycle(state, 'S_END: Terminating transaction');
      state = 0;
      logCycle(state, 'S_IDLE: Reset');
      return { 
        success: false, 
        approved: false, 
        cycles, 
        rejectCode: rCode, 
        rejectReason: REJECT_CODES[rCode],
        finalBalance: curBal,
        dailyWithdrawn: spent,
        accounts: JSON.parse(JSON.stringify(this.accounts))
      };
    }

    // Success authentication
    activeAcc.attempts = 0;
    attempts = 0;
    logCycle(state, 'S_VERIFY: PIN & Card Valid (AUTH_SUCCESS = 1)');

    // Cycle 2: SELECT
    state = 2;
    logCycle(state, `S_SELECT: Decoding Opcode (${txType})`);

    let nextBal = curBal;
    const amt = Number(amount) || 0;

    if (txType === 0) { // WITHDRAW
      state = 3;
      logCycle(state, 'S_WITHDRAW: Checking Daily Limit & Magnitude Comparator (A >= B)');
      if ((activeAcc.spent + amt) > activeAcc.limit) {
        rCode = 4;
        rej = 1;
        state = 10;
        logCycle(state, `REJECT: Daily limit exceeded (Spent ₹${activeAcc.spent} + ₹${amt} > ₹${activeAcc.limit})`);
      } else if (activeAcc.bal < amt) {
        rCode = 5;
        rej = 1;
        state = 10;
        logCycle(state, `REJECT: Insufficient funds (Bal ₹${activeAcc.bal} < ₹${amt})`);
      } else {
        nextBal = activeAcc.bal - amt;
        activeAcc.spent += amt;
        spent = activeAcc.spent;
        logCycle(state, `ALU Subtraction: ₹${activeAcc.bal} - ₹${amt} = ₹${nextBal}`);
        state = 8;
      }
    } else if (txType === 1) { // DEPOSIT
      state = 4;
      logCycle(state, 'S_DEPOSIT: Adder Execution & 16-Bit Overflow Check');
      if ((activeAcc.bal + amt) > 65535) {
        rCode = 8;
        rej = 1;
        state = 10;
        logCycle(state, 'REJECT: 16-bit capacity overflow (> ₹65,535)');
      } else {
        nextBal = activeAcc.bal + amt;
        logCycle(state, `ALU Addition: ₹${activeAcc.bal} + ₹${amt} = ₹${nextBal}`);
        state = 8;
      }
    } else if (txType === 2) { // BALANCE
      state = 5;
      logCycle(state, `S_BALANCE: Direct Memory Read (₹${activeAcc.bal}). REGISTER_WRITE = 0`);
      state = 9;
    } else if (txType === 3) { // TRANSFER
      state = 6;
      logCycle(state, `S_TRANSFER: Routing Inter-Account Transfer to ${targetCard}`);
      const targetAcc = this.accounts.find(a => a.card === Number(targetCard));
      if (!targetAcc || Number(targetCard) === Number(cardId)) {
        rCode = 7;
        rej = 1;
        state = 10;
        logCycle(state, 'REJECT: Target card not found or self-transfer');
      } else if (activeAcc.bal < amt) {
        rCode = 5;
        rej = 1;
        state = 10;
        logCycle(state, 'REJECT: Insufficient balance for transfer');
      } else {
        nextBal = activeAcc.bal - amt;
        targetAcc.bal += amt;
        logCycle(state, `TRANSFER ALU: Deducted ₹${amt} from sender, credited to ${targetAcc.card}`);
        state = 8;
      }
    } else if (txType === 4) { // INTEREST
      state = 7;
      const interest = Math.floor(activeAcc.bal / 32) + 50;
      nextBal = activeAcc.bal + interest;
      logCycle(state, `S_INTEREST: Pro-rated bonus credited: +₹${interest}`);
      state = 8;
    } else {
      rCode = 6;
      rej = 1;
      state = 10;
      logCycle(state, 'REJECT: Unknown opcode');
    }

    if (state === 10) {
      logCycle(state, `S_REJECT: Error ${rCode} (${REJECT_CODES[rCode]})`);
      state = 11;
      logCycle(state, 'S_END: Terminating');
      state = 0;
      logCycle(state, 'S_IDLE: Reset');
      return { 
        success: false, 
        approved: false, 
        cycles, 
        rejectCode: rCode, 
        rejectReason: REJECT_CODES[rCode],
        finalBalance: curBal,
        dailyWithdrawn: spent,
        accounts: JSON.parse(JSON.stringify(this.accounts))
      };
    }

    if (state === 8) {
      regWrite = 1;
      activeAcc.bal = nextBal;
      curBal = nextBal;
      logCycle(state, `S_UPDATE: REGISTER_WRITE = 1. Balance latched to ₹${nextBal}`);
      state = 9;
    }

    if (state === 9) {
      regWrite = 0;
      appr = 1;
      receipt = 1;
      logCycle(state, 'S_OUTPUT: APPROVAL = 1. Receipt strobe asserted');
      state = 11;
    }

    state = 11;
    logCycle(state, 'S_END: Transaction Completed');
    state = 0;
    logCycle(state, 'S_IDLE: Ready for next transaction');

    return {
      success: true,
      approved: true,
      cycles,
      finalBalance: curBal,
      dailyWithdrawn: spent,
      rejectCode: 0,
      accounts: JSON.parse(JSON.stringify(this.accounts))
    };
  }
}

export const browserSimulator = new BrowserVerilogSimulator();

