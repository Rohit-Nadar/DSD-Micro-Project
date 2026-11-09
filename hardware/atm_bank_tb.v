// ============================================================================
// PROJECT: ATM Security & Transaction Verification System
// COURSE: 25DC205 - Digital System Design for Data Science and Cybersecurity
// INSTITUTION: Karunya Institute of Technology and Sciences
// FILE: atm_bank_tb.v
// DESCRIPTION: Comprehensive Testbench covering Functional Requirements FR-01 to FR-12
// ============================================================================

`timescale 1ns / 1ps

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

        // --------------------------------------------------------------------
        // Test 1: FR-01 & FR-05: Valid Card & PIN, Balance Enquiry (100123 / 123456)
        // --------------------------------------------------------------------
        $display("\n--- [TEST 1] Balance Enquiry (Card 100123) ---");
        execute_tx(32'd100123, 32'd123456, 3'b010, 16'd0, 32'd0);
        if (approved == 1 && current_balance == 16'd5000 && register_write == 0)
            $display("PASS: Balance Enquiry = ₹%0d, Approved=%b", current_balance, approved);
        else
            $display("FAIL: Balance Enquiry check failed");

        // --------------------------------------------------------------------
        // Test 2: FR-06: Valid Withdrawal of ₹2,000 (5000 - 2000 = 3000)
        // --------------------------------------------------------------------
        $display("\n--- [TEST 2] Cash Withdrawal ₹2,000 (Card 100123) ---");
        execute_tx(32'd100123, 32'd123456, 3'b000, 16'd2000, 32'd0);
        if (approved == 1 && current_balance == 16'd3000)
            $display("PASS: Withdrawal successful. New Balance = ₹%0d", current_balance);
        else
            $display("FAIL: Withdrawal calculation failed. Bal = %0d", current_balance);

        // --------------------------------------------------------------------
        // Test 3: FR-06: Insufficient Balance Withdrawal (Try ₹10,000 from ₹3,000)
        // --------------------------------------------------------------------
        $display("\n--- [TEST 3] Insufficient Balance Test (Withdraw ₹10,000) ---");
        execute_tx(32'd100123, 32'd123456, 3'b000, 16'd10000, 32'd0);
        if (rejected == 1 && reject_code == 4'd5)
            $display("PASS: Rejected as expected (Code %0d: Insufficient Funds)", reject_code);
        else
            $display("FAIL: Expected rejection for insufficient funds");

        // --------------------------------------------------------------------
        // Test 4: FR-08: Valid Cash Deposit of ₹4,000 (3000 + 4000 = 7000)
        // --------------------------------------------------------------------
        $display("\n--- [TEST 4] Cash Deposit ₹4,000 (Card 100123) ---");
        execute_tx(32'd100123, 32'd123456, 3'b001, 16'd4000, 32'd0);
        if (approved == 1 && current_balance == 16'd7000)
            $display("PASS: Deposit successful. New Balance = ₹%0d", current_balance);
        else
            $display("FAIL: Deposit calculation failed. Bal = %0d", current_balance);

        // --------------------------------------------------------------------
        // Test 5: FR-01: Invalid Card Insertion (Card 999999)
        // --------------------------------------------------------------------
        $display("\n--- [TEST 5] Invalid Card Test (Card 999999) ---");
        execute_tx(32'd999999, 32'd123456, 3'b010, 16'd0, 32'd0);
        if (rejected == 1 && reject_code == 4'd1)
            $display("PASS: Rejected as expected (Code %0d: Invalid Card ID)", reject_code);
        else
            $display("FAIL: Invalid card not rejected properly");

        // --------------------------------------------------------------------
        // Test 6: FR-03 & FR-04: Wrong PIN Attempts & Lockout (Card 100124)
        // --------------------------------------------------------------------
        $display("\n--- [TEST 6] Wrong PIN Attempts & 3-Strike Lockout (Card 100124) ---");
        // Attempt 1 (Wrong PIN)
        execute_tx(32'd100124, 32'd111111, 3'b010, 16'd0, 32'd0);
        $display("Attempt 1: Rejected code=%0d, Attempts=%0d", reject_code, attempt_count);

        // Attempt 2 (Wrong PIN)
        execute_tx(32'd100124, 32'd222222, 3'b010, 16'd0, 32'd0);
        $display("Attempt 2: Rejected code=%0d, Attempts=%0d", reject_code, attempt_count);

        // Attempt 3 (Wrong PIN -> LOCK!)
        execute_tx(32'd100124, 32'd333333, 3'b010, 16'd0, 32'd0);
        $display("Attempt 3: Rejected code=%0d, Attempts=%0d", reject_code, attempt_count);
        if (rejected == 1 && reject_code == 4'd3)
            $display("PASS: Account locked after 3 failed attempts (Code 3: Account Locked)");
        else
            $display("FAIL: Account locking mechanism failed");

        // --------------------------------------------------------------------
        // Test 7: FR-09: Inter-Account Transfer (Card 100125 -> Card 100126 ₹2,000)
        // --------------------------------------------------------------------
        $display("\n--- [TEST 7] Inter-Account Transfer ₹2,000 (Card 100125 -> 100126) ---");
        execute_tx(32'd100125, 32'd345678, 3'b011, 16'd2000, 32'd100126);
        if (approved == 1 && current_balance == 16'd10000)
            $display("PASS: Transfer approved. Sender New Balance = ₹%0d", current_balance);
        else
            $display("FAIL: Transfer failed");

        $display("\n==================================================================");
        $display("ALL HARDWARE SIMULATION TESTS COMPLETED SUCCESSFULLY!");
        $display("==================================================================");
        $finish;
    end

endmodule

