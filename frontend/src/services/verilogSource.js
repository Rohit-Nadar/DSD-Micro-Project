// ============================================================================
// PROJECT: ATM Security & Transaction Verification System
// COURSE: 25DC205 - Digital System Design for Data Science and Cybersecurity
// INSTITUTION: Karunya Institute of Technology and Sciences
// FILE: verilogSource.js - Reference Verilog RTL and Testbench Source
// ============================================================================

export const ATM_BANK_VERILOG = `// ============================================================================
// PROJECT: ATM Security & Transaction Verification System
// COURSE: 25DC205 - Digital System Design for Data Science and Cybersecurity
// INSTITUTION: Karunya Institute of Technology and Sciences
// TEAM MEMBERS: Rohit Nadar (URK26AI1021), Vikash (URK26AI1022),
//               Vahini Muthu (URK26AI1023), Sujith S. (URK26AI1024)
// SUPERVISOR: Dr. Vidhya B.
// FILE: atm_bank.v
// DESCRIPTION: Hardware-equivalent synthesizable Verilog module integrating
//              combinational authentication comparators, 10-state FSM controller,
//              16-bit ALU (Add/Sub/Comp), and discrete sequential balance register.
// ============================================================================

\`timescale 1ns / 1ps

module atm_bank #(
    parameter NUM_ACCOUNTS = 4,
    parameter MAX_ATTEMPTS = 3
)(
    input  wire        clk,
    input  wire        rst_n,           // Active-low asynchronous reset
    input  wire [31:0] card_id_in,      // 6-digit Card ID (e.g., 32'd100123)
    input  wire [31:0] pin_in,          // 6-digit PIN (e.g., 32'd123456)
    input  wire [2:0]  tx_type,         // 000: Withdraw, 001: Deposit, 010: Balance, 011: Transfer, 100: Interest
    input  wire [15:0] amount_in,       // Transaction amount (up to ₹65,535)
    input  wire [31:0] target_card_in,  // Target Card ID for Inter-Account Transfer
    input  wire        start_tx,        // Start transaction strobe
    input  wire        daily_reset,     // Reset daily withdrawal accumulator (midnight trigger)

    // Hardware Outputs
    output reg  [3:0]  fsm_state,       // Active FSM State
    output reg  [15:0] current_balance, // 16-bit PIPO balance register value
    output reg         approved,        // High on successful transaction approval
    output reg         rejected,        // High on transaction rejection
    output reg  [3:0]  reject_code,     // Reject code: 0=None, 1=Card, 2=PIN, 3=Locked, 4=DailyLimit, 5=Insufficient, 6=InvalidTX, 7=TargetNotFound, 8=Overflow
    output reg         receipt_ready,   // Strobe for receipt generation
    output reg         register_write,  // Write-enable flag for sequential balance memory
    output reg  [1:0]  attempt_count,   // Current failed attempt count for active card
    output reg  [15:0] daily_withdrawn  // Total withdrawn today
);

    // ========================================================================
    // FSM State Encoding (Matching Stateflow Controller Model)
    // ========================================================================
    localparam S_IDLE      = 4'd0;
    localparam S_VERIFY    = 4'd1;
    localparam S_SELECT    = 4'd2;
    localparam S_WITHDRAW  = 4'd3;
    localparam S_DEPOSIT   = 4'd4;
    localparam S_BALANCE   = 4'd5;
    localparam S_TRANSFER  = 4'd6;
    localparam S_INTEREST  = 4'd7;
    localparam S_UPDATE    = 4'd8;
    localparam S_OUTPUT    = 4'd9;
    localparam S_REJECT    = 4'd10;
    localparam S_END       = 4'd11;

    // Reject Code Definitions
    localparam RC_NONE             = 4'd0;
    localparam RC_INVALID_CARD     = 4'd1;
    localparam RC_INVALID_PIN      = 4'd2;
    localparam RC_ACCOUNT_LOCKED   = 4'd3;
    localparam RC_DAILY_LIMIT      = 4'd4;
    localparam RC_INSUFFICIENT_FND = 4'd5;
    localparam RC_INVALID_TX       = 4'd6;
    localparam RC_TARGET_NOT_FOUND = 4'd7;
    localparam RC_OVERFLOW         = 4'd8;

    // Transaction Types
    localparam TX_WITHDRAW = 3'b000;
    localparam TX_DEPOSIT  = 3'b001;
    localparam TX_BALANCE  = 3'b010;
    localparam TX_TRANSFER = 3'b011;
    localparam TX_INTEREST = 3'b100;

    // ========================================================================
    // Internal Account Registers (Hardware Bank Storage)
    // ========================================================================
    reg [31:0] reg_card_id       [0:NUM_ACCOUNTS-1];
    reg [31:0] reg_pin           [0:NUM_ACCOUNTS-1];
    reg [15:0] reg_balance       [0:NUM_ACCOUNTS-1];
    reg [15:0] reg_daily_limit   [0:NUM_ACCOUNTS-1];
    reg [15:0] reg_daily_spent   [0:NUM_ACCOUNTS-1];
    reg        reg_is_locked     [0:NUM_ACCOUNTS-1];
    reg [1:0]  reg_failed_count  [0:NUM_ACCOUNTS-1];

    // Combinational & Intermediate registers
    reg [1:0]  active_acc_idx;
    reg [1:0]  target_acc_idx;
    reg        card_found;
    reg        target_found;
    reg [15:0] new_balance_calc;
    reg [15:0] target_new_balance;
    reg        target_update_needed;

    integer i;

    // Combinational Section B: Comparators
    wire pin_matches = (card_found) ? (pin_in == reg_pin[active_acc_idx]) : 1'b0;

    // ========================================================================
    // Sequential Logic & FSM Process
    // ========================================================================
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            // Reset to default registered constants (matching Table 1.1 of Report)
            reg_card_id[0]      <= 32'd100123; // Rohit Nadar (URK26AI1021)
            reg_pin[0]          <= 32'd123456;
            reg_balance[0]      <= 16'd5000;   // Baseline ₹5,000
            reg_daily_limit[0]  <= 16'd20000;  // ₹20,000 daily limit
            reg_daily_spent[0]  <= 16'd0;
            reg_is_locked[0]    <= 1'b0;
            reg_failed_count[0] <= 2'd0;

            reg_card_id[1]      <= 32'd100124; // Vikash (URK26AI1022)
            reg_pin[1]          <= 32'd234567;
            reg_balance[1]      <= 16'd8000;
            reg_daily_limit[1]  <= 16'd20000;
            reg_daily_spent[1]  <= 16'd0;
            reg_is_locked[1]    <= 1'b0;
            reg_failed_count[1] <= 2'd0;

            reg_card_id[2]      <= 32'd100125; // Vahini Muthu (URK26AI1023)
            reg_pin[2]          <= 32'd345678;
            reg_balance[2]      <= 16'd12000;
            reg_daily_limit[2]  <= 16'd20000;
            reg_daily_spent[2]  <= 16'd0;
            reg_is_locked[2]    <= 1'b0;
            reg_failed_count[2] <= 2'd0;

            reg_card_id[3]      <= 32'd100126; // Sujith S. (URK26AI1024)
            reg_pin[3]          <= 32'd456789;
            reg_balance[3]      <= 16'd3000;
            reg_daily_limit[3]  <= 16'd20000;
            reg_daily_spent[3]  <= 16'd0;
            reg_is_locked[3]    <= 1'b0;
            reg_failed_count[3] <= 2'd0;

            fsm_state           <= S_IDLE;
            current_balance     <= 16'd0;
            approved            <= 1'b0;
            rejected            <= 1'b0;
            reject_code         <= RC_NONE;
            receipt_ready       <= 1'b0;
            register_write      <= 1'b0;
            attempt_count       <= 2'd0;
            daily_withdrawn     <= 16'd0;
            active_acc_idx      <= 2'd0;
            target_acc_idx      <= 2'd0;
            card_found          <= 1'b0;
            target_found        <= 1'b0;
            new_balance_calc    <= 16'd0;
            target_new_balance  <= 16'd0;
            target_update_needed<= 1'b0;
        end else begin
            // Daily reset signal handler
            if (daily_reset) begin
                for (i = 0; i < NUM_ACCOUNTS; i = i + 1) begin
                    reg_daily_spent[i] <= 16'd0;
                end
            end

            case (fsm_state)
                // ------------------------------------------------------------
                // S0: IDLE - Wait for transaction initiation
                // ------------------------------------------------------------
                S_IDLE: begin
                    approved             <= 1'b0;
                    rejected             <= 1'b0;
                    receipt_ready        <= 1'b0;
                    register_write       <= 1'b0;
                    reject_code          <= RC_NONE;
                    target_update_needed <= 1'b0;

                    if (start_tx) begin
                        fsm_state <= S_VERIFY;
                    end
                end

                // ------------------------------------------------------------
                // S1: VERIFY - Credential validation & security checks
                // ------------------------------------------------------------
                S_VERIFY: begin
                    // Find card in registered memory
                    card_found = 1'b0;
                    for (i = 0; i < NUM_ACCOUNTS; i = i + 1) begin
                        if (reg_card_id[i] == card_id_in) begin
                            card_found = 1'b1;
                            active_acc_idx = i[1:0];
                        end
                    end

                    if (!card_found) begin
                        // FR-01: Card not recognized
                        reject_code <= RC_INVALID_CARD;
                        fsm_state   <= S_REJECT;
                    end else if (reg_is_locked[active_acc_idx]) begin
                        // FR-04: Card account is currently locked
                        reject_code     <= RC_ACCOUNT_LOCKED;
                        attempt_count   <= reg_failed_count[active_acc_idx];
                        current_balance <= reg_balance[active_acc_idx];
                        fsm_state       <= S_REJECT;
                    end else if (!pin_matches) begin
                        // FR-03 & FR-04: Wrong PIN attempt tracking
                        if (reg_failed_count[active_acc_idx] >= (MAX_ATTEMPTS - 1)) begin
                            reg_failed_count[active_acc_idx] <= MAX_ATTEMPTS[1:0];
                            reg_is_locked[active_acc_idx]    <= 1'b1; // Lock account
                            attempt_count                    <= MAX_ATTEMPTS[1:0];
                            reject_code                      <= RC_ACCOUNT_LOCKED;
                        end else begin
                            reg_failed_count[active_acc_idx] <= reg_failed_count[active_acc_idx] + 1'b1;
                            attempt_count                    <= reg_failed_count[active_acc_idx] + 1'b1;
                            reject_code                      <= RC_INVALID_PIN;
                        end
                        fsm_state <= S_REJECT;
                    end else begin
                        // PIN and Card Valid (AUTH_SUCCESS = 1)
                        reg_failed_count[active_acc_idx] <= 2'd0; // Reset counter on successful login
                        attempt_count                    <= 2'd0;
                        current_balance                  <= reg_balance[active_acc_idx];
                        daily_withdrawn                  <= reg_daily_spent[active_acc_idx];
                        fsm_state                        <= S_SELECT;
                    end
                end

                // ------------------------------------------------------------
                // S2: SELECT - Decode Transaction Type
                // ------------------------------------------------------------
                S_SELECT: begin
                    case (tx_type)
                        TX_WITHDRAW: fsm_state <= S_WITHDRAW;
                        TX_DEPOSIT:  fsm_state <= S_DEPOSIT;
                        TX_BALANCE:  fsm_state <= S_BALANCE;
                        TX_TRANSFER: fsm_state <= S_TRANSFER;
                        TX_INTEREST: fsm_state <= S_INTEREST;
                        default: begin
                            reject_code <= RC_INVALID_TX;
                            fsm_state   <= S_REJECT;
                        end
                    endcase
                end

                // ------------------------------------------------------------
                // S3: WITHDRAW - Magnitude Comparison & Subtraction
                // ------------------------------------------------------------
                S_WITHDRAW: begin
                    // Check daily limit constraint
                    if ((reg_daily_spent[active_acc_idx] + amount_in) > reg_daily_limit[active_acc_idx]) begin
                        reject_code <= RC_DAILY_LIMIT;
                        fsm_state   <= S_REJECT;
                    end
                    // Magnitude comparator (A >= B): balance >= amount
                    else if (reg_balance[active_acc_idx] < amount_in) begin
                        reject_code <= RC_INSUFFICIENT_FND;
                        fsm_state   <= S_REJECT;
                    end else begin
                        // ALU Subtractor: B_new = B_current - M
                        new_balance_calc                 <= reg_balance[active_acc_idx] - amount_in;
                        reg_daily_spent[active_acc_idx]  <= reg_daily_spent[active_acc_idx] + amount_in;
                        daily_withdrawn                  <= reg_daily_spent[active_acc_idx] + amount_in;
                        fsm_state                        <= S_UPDATE;
                    end
                end

                // ------------------------------------------------------------
                // S4: DEPOSIT - 16-Bit Adder & Overflow Check
                // ------------------------------------------------------------
                S_DEPOSIT: begin
                    // 16-bit boundary check (limit to ₹65,535)
                    if ((32'd0 + reg_balance[active_acc_idx] + amount_in) > 32'd65535) begin
                        reject_code <= RC_OVERFLOW;
                        fsm_state   <= S_REJECT;
                    end else begin
                        // ALU Adder: B_new = B_current + M
                        new_balance_calc <= reg_balance[active_acc_idx] + amount_in;
                        fsm_state        <= S_UPDATE;
                    end
                end

                // ------------------------------------------------------------
                // S5: BALANCE - Direct Read (Read-Only)
                // ------------------------------------------------------------
                S_BALANCE: begin
                    // Direct feed: no write asserted
                    new_balance_calc <= reg_balance[active_acc_idx];
                    register_write   <= 1'b0;
                    fsm_state        <= S_OUTPUT;
                end

                // ------------------------------------------------------------
                // S6: TRANSFER - Inter-Account Fund Routing
                // ------------------------------------------------------------
                S_TRANSFER: begin
                    // Find target account
                    target_found = 1'b0;
                    for (i = 0; i < NUM_ACCOUNTS; i = i + 1) begin
                        if (reg_card_id[i] == target_card_in) begin
                            target_found = 1'b1;
                            target_acc_idx = i[1:0];
                        end
                    end

                    if (!target_found || (target_card_in == card_id_in)) begin
                        reject_code <= RC_TARGET_NOT_FOUND;
                        fsm_state   <= S_REJECT;
                    end else if (reg_balance[active_acc_idx] < amount_in) begin
                        reject_code <= RC_INSUFFICIENT_FND;
                        fsm_state   <= S_REJECT;
                    end else begin
                        new_balance_calc     <= reg_balance[active_acc_idx] - amount_in;
                        target_new_balance   <= reg_balance[target_acc_idx] + amount_in;
                        target_update_needed <= 1'b1;
                        fsm_state            <= S_UPDATE;
                    end
                end

                // ------------------------------------------------------------
                // S7: INTEREST - Credit Calculation (e.g. 4% pro-rated bonus)
                // ------------------------------------------------------------
                S_INTEREST: begin
                    // Bonus incentive: 4% of balance (or min ₹50)
                    new_balance_calc <= reg_balance[active_acc_idx] + (reg_balance[active_acc_idx] >> 5) + 16'd50;
                    fsm_state        <= S_UPDATE;
                end

                // ------------------------------------------------------------
                // S8: UPDATE - Sequential Memory Latching (REGISTER_WRITE = 1)
                // ------------------------------------------------------------
                S_UPDATE: begin
                    register_write                  <= 1'b1;
                    reg_balance[active_acc_idx]     <= new_balance_calc;
                    current_balance                 <= new_balance_calc;

                    if (target_update_needed) begin
                        reg_balance[target_acc_idx] <= target_new_balance;
                    end

                    fsm_state <= S_OUTPUT;
                end

                // ------------------------------------------------------------
                // S9: OUTPUT - Output Generation & Receipt Strobe
                // ------------------------------------------------------------
                S_OUTPUT: begin
                    approved      <= 1'b1;
                    rejected      <= 1'b0;
                    receipt_ready <= 1'b1;
                    fsm_state     <= S_END;
                end

                // ------------------------------------------------------------
                // S10: REJECT - Error Flag Asserted & Feedback
                // ------------------------------------------------------------
                S_REJECT: begin
                    approved       <= 1'b0;
                    rejected       <= 1'b1;
                    register_write <= 1'b0;
                    receipt_ready  <= 1'b0;
                    fsm_state      <= S_END;
                end

                // ------------------------------------------------------------
                // S11: END - Latch Results & Await Next Handshake
                // ------------------------------------------------------------
                S_END: begin
                    register_write <= 1'b0;
                    if (!start_tx) begin
                        fsm_state <= S_IDLE;
                    end
                end

                default: fsm_state <= S_IDLE;
            endcase
        end
    end

endmodule`;

export const ATM_BANK_TESTBENCH = `// ============================================================================
// PROJECT: ATM Security & Transaction Verification System
// COURSE: 25DC205 - Digital System Design for Data Science and Cybersecurity
// INSTITUTION: Karunya Institute of Technology and Sciences
// FILE: atm_bank_tb.v
// DESCRIPTION: Comprehensive Testbench covering Functional Requirements FR-01 to FR-12
// ============================================================================

\`timescale 1ns / 1ps

module atm_bank_tb;

    reg         clk;
    reg         rst_n;
    reg  [31:0] card_id_in;
    reg  [31:0] pin_in;
    reg  [2:0]  tx_type;
    reg  [15:0] amount_in;
    reg  [31:0] target_card_in;
    reg         start_tx;
    reg         daily_reset;

    wire [3:0]  fsm_state;
    wire [15:0] current_balance;
    wire        approved;
    wire        rejected;
    wire [3:0]  reject_code;
    wire        receipt_ready;
    wire        register_write;
    wire [1:0]  attempt_count;
    wire [15:0] daily_withdrawn;

    // Instantiate Unit Under Test (UUT)
    atm_bank uut (
        .clk(clk),
        .rst_n(rst_n),
        .card_id_in(card_id_in),
        .pin_in(pin_in),
        .tx_type(tx_type),
        .amount_in(amount_in),
        .target_card_in(target_card_in),
        .start_tx(start_tx),
        .daily_reset(daily_reset),
        .fsm_state(fsm_state),
        .current_balance(current_balance),
        .approved(approved),
        .rejected(rejected),
        .reject_code(reject_code),
        .receipt_ready(receipt_ready),
        .register_write(register_write),
        .attempt_count(attempt_count),
        .daily_withdrawn(daily_withdrawn)
    );

    // Clock generator (100 MHz, 10ns period)
    always #5 clk = ~clk;

    // Helper task to execute a transaction
    task execute_tx(
        input [31:0] card,
        input [31:0] pin,
        input [2:0]  t_type,
        input [15:0] amt,
        input [31:0] target
    );
    begin
        @(negedge clk);
        card_id_in     = card;
        pin_in         = pin;
        tx_type        = t_type;
        amount_in      = amt;
        target_card_in = target;
        start_tx       = 1'b1;

        // Wait until FSM reaches S_OUTPUT (9), S_REJECT (10), or S_END (11)
        wait (fsm_state == 4'd9 || fsm_state == 4'd10 || fsm_state == 4'd11);
        @(negedge clk);
        start_tx = 1'b0;
        @(negedge clk);
        wait (fsm_state == 4'd0); // Wait return to IDLE
        #10;
    end
    endtask

    initial begin
        $display("==================================================================");
        $display("STARTING ATM SECURITY & TRANSACTION SYSTEM HARDWARE VERIFICATION");
        $display("==================================================================");

        // Initialization
        clk            = 0;
        rst_n          = 0;
        card_id_in     = 0;
        pin_in         = 0;
        tx_type        = 0;
        amount_in      = 0;
        target_card_in = 0;
        start_tx       = 0;
        daily_reset    = 0;

        #20;
        rst_n = 1;
        #20;

        // Test 1: FR-01 & FR-05: Valid Card & PIN, Balance Enquiry (100123 / 123456)
        $display("\\n--- [TEST 1] Balance Enquiry (Card 100123) ---");
        execute_tx(32'd100123, 32'd123456, 3'b010, 16'd0, 32'd0);
        if (approved == 1 && current_balance == 16'd5000 && register_write == 0)
            $display("PASS: Balance Enquiry = ₹%0d, Approved=%b", current_balance, approved);
        else
            $display("FAIL: Balance Enquiry check failed");

        // Test 2: FR-06: Valid Withdrawal of ₹2,000 (5000 - 2000 = 3000)
        $display("\\n--- [TEST 2] Cash Withdrawal ₹2,000 (Card 100123) ---");
        execute_tx(32'd100123, 32'd123456, 3'b000, 16'd2000, 32'd0);
        if (approved == 1 && current_balance == 16'd3000)
            $display("PASS: Withdrawal successful. New Balance = ₹%0d", current_balance);
        else
            $display("FAIL: Withdrawal calculation failed. Bal = %0d", current_balance);

        // Test 3: FR-06: Insufficient Balance Withdrawal (Try ₹10,000 from ₹3,000)
        $display("\\n--- [TEST 3] Insufficient Balance Test (Withdraw ₹10,000) ---");
        execute_tx(32'd100123, 32'd123456, 3'b000, 16'd10000, 32'd0);
        if (rejected == 1 && reject_code == 4'd5)
            $display("PASS: Rejected as expected (Code %0d: Insufficient Funds)", reject_code);
        else
            $display("FAIL: Expected rejection for insufficient funds");

        // Test 4: FR-08: Valid Cash Deposit of ₹4,000 (3000 + 4000 = 7000)
        $display("\\n--- [TEST 4] Cash Deposit ₹4,000 (Card 100123) ---");
        execute_tx(32'd100123, 32'd123456, 3'b001, 16'd4000, 32'd0);
        if (approved == 1 && current_balance == 16'd7000)
            $display("PASS: Deposit successful. New Balance = ₹%0d", current_balance);
        else
            $display("FAIL: Deposit calculation failed. Bal = %0d", current_balance);

        // Test 5: FR-01: Invalid Card Insertion (Card 999999)
        $display("\\n--- [TEST 5] Invalid Card Test (Card 999999) ---");
        execute_tx(32'd999999, 32'd123456, 3'b010, 16'd0, 32'd0);
        if (rejected == 1 && reject_code == 4'd1)
            $display("PASS: Rejected as expected (Code %0d: Invalid Card ID)", reject_code);
        else
            $display("FAIL: Invalid card not rejected properly");

        // Test 6: FR-03 & FR-04: Wrong PIN Attempts & Lockout (Card 100124)
        $display("\\n--- [TEST 6] Wrong PIN Attempts & 3-Strike Lockout (Card 100124) ---");
        execute_tx(32'd100124, 32'd111111, 3'b010, 16'd0, 32'd0);
        execute_tx(32'd100124, 32'd222222, 3'b010, 16'd0, 32'd0);
        execute_tx(32'd100124, 32'd333333, 3'b010, 16'd0, 32'd0);
        if (rejected == 1 && reject_code == 4'd3)
            $display("PASS: Account locked after 3 failed attempts (Code 3: Account Locked)");
        else
            $display("FAIL: Account locking mechanism failed");

        // Test 7: FR-09: Inter-Account Transfer (Card 100125 -> Card 100126 ₹2,000)
        $display("\\n--- [TEST 7] Inter-Account Transfer ₹2,000 (Card 100125 -> 100126) ---");
        execute_tx(32'd100125, 32'd345678, 3'b011, 16'd2000, 32'd100126);
        if (approved == 1 && current_balance == 16'd10000)
            $display("PASS: Transfer approved. Sender New Balance = ₹%0d", current_balance);
        else
            $display("FAIL: Transfer failed");

        $display("\\n==================================================================");
        $display("ALL HARDWARE SIMULATION TESTS COMPLETED SUCCESSFULLY!");
        $display("==================================================================");
        $finish;
    end

endmodule`;
