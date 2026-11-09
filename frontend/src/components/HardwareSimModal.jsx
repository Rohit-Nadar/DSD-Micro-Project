import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Play, 
  Pause, 
  StepForward, 
  RotateCcw, 
  FileCode, 
  Layers, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check,
  Terminal,
  Zap
} from 'lucide-react';
import { browserSimulator, FSM_STATES, REJECT_CODES } from '../services/verilogEngine';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { playKeyBeep } from '../utils/audio';

export default function HardwareSimModal() {
  const memberPins = {
    100123: 123456,
    100124: 234567,
    100125: 345678,
    100126: 456789
  };

  const handleCardChange = (newCid) => {
    setCardId(newCid);
    if (memberPins[newCid]) {
      setPin(memberPins[newCid]);
    }
  };
  const [txType, setTxType] = useState(0); // 0=Withdraw, 1=Deposit, 2=Balance, 3=Transfer, 4=Interest
  const [amount, setAmount] = useState(2000);
  const [targetCard, setTargetCard] = useState(100124);

  const [activeTab, setActiveTab] = useState('SIM'); // SIM | CODE | TESTBENCH
  const [simulationResult, setSimulationResult] = useState(null);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [autoRunning, setAutoRunning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const waveformCanvasRef = useRef(null);

  // Run simulation whenever user clicks "Run"
  const handleRunSimulation = async () => {
    playKeyBeep(1400, 0.06);
    setAutoRunning(false);
    
    // First try via backend, with instant fallback to browser engine
    try {
      const res = await api.simulateHardware({
        cardId,
        pin,
        txType,
        amount,
        targetCardId: targetCard
      });
      setSimulationResult(res);
      setCurrentCycleIndex(0);
    } catch (e) {
      // Use in-browser cycle-accurate simulator
      const res = browserSimulator.runSimulation({
        cardId,
        pin,
        txType,
        amount,
        targetCard
      });
      setSimulationResult({
        success: res.success,
        approved: res.approved,
        rejected: !res.approved,
        reject_code: res.rejectCode,
        reject_reason: res.rejectReason,
        final_balance: res.finalBalance,
        clock_cycles: res.cycles.map(c => ({
          cycle: c.cycle,
          fsm_state_code: c.state,
          fsm_state_name: c.stateName,
          current_balance: c.curBal,
          approved: c.approved,
          rejected: c.rejected,
          reject_code: c.rejectCode,
          register_write: c.registerWrite,
          receipt_ready: c.receiptReady,
          attempt_count: c.attempts,
          daily_withdrawn: c.spent,
          comment: c.comment
        })),
        accounts_snapshot: browserSimulator.accounts
      });
      setCurrentCycleIndex(0);
    }
  };

  // Initial simulation run on mount
  useEffect(() => {
    handleRunSimulation();
  }, []);

  // Auto-run stepper timer
  useEffect(() => {
    let interval = null;
    if (autoRunning && simulationResult?.clock_cycles) {
      interval = setInterval(() => {
        setCurrentCycleIndex(prev => {
          if (prev >= simulationResult.clock_cycles.length - 1) {
            setAutoRunning(false);
            return prev;
          }
          playKeyBeep(1200 + prev * 50, 0.03);
          return prev + 1;
        });
      }, 600);
    }
    return () => clearInterval(interval);
  }, [autoRunning, simulationResult]);

  // Render Logic Analyzer Waveform on Canvas
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !simulationResult?.clock_cycles) return;

    const ctx = canvas.getContext('2d');
    const cycles = simulationResult.clock_cycles;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark grid background
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, width, height);

    // Signals to draw
    const signals = [
      { name: 'CLK', type: 'digital' },
      { name: 'START_TX', type: 'digital', key: 'start' },
      { name: 'FSM_STATE', type: 'bus', key: 'fsm_state_name' },
      { name: 'REG_WRITE', type: 'digital', key: 'register_write' },
      { name: 'APPROVED', type: 'digital', key: 'approved', color: '#10B981' },
      { name: 'REJECTED', type: 'digital', key: 'rejected', color: '#EF4444' },
      { name: 'BALANCE', type: 'bus', key: 'current_balance' }
    ];

    const cycleWidth = Math.max(45, (width - 120) / Math.max(1, cycles.length));
    const startX = 110;
    const rowHeight = 32;

    // Draw header cycles
    ctx.fillStyle = '#64748B';
    ctx.font = '10px monospace';
    cycles.forEach((c, i) => {
      const x = startX + i * cycleWidth;
      ctx.fillText(`T${i}`, x + 5, 15);
      // Vertical grid line
      ctx.strokeStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height);
      ctx.stroke();
    });

    // Draw current cycle highlight cursor
    if (cycles[currentCycleIndex]) {
      const curX = startX + currentCycleIndex * cycleWidth;
      ctx.fillStyle = 'rgba(20, 184, 166, 0.15)';
      ctx.fillRect(curX, 20, cycleWidth, height - 20);
      ctx.strokeStyle = '#14B8A6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(curX, 20, cycleWidth, height - 20);
    }

    // Draw each signal
    signals.forEach((sig, sIdx) => {
      const y = 35 + sIdx * rowHeight;

      // Label
      ctx.fillStyle = sig.color || '#94A3B8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(sig.name, 10, y + 15);

      if (sig.name === 'CLK') {
        // Draw clock pulses
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        cycles.forEach((_, i) => {
          const x = startX + i * cycleWidth;
          const half = cycleWidth / 2;
          ctx.moveTo(x, y + 20);
          ctx.lineTo(x, y + 5);
          ctx.lineTo(x + half, y + 5);
          ctx.lineTo(x + half, y + 20);
          ctx.lineTo(x + cycleWidth, y + 20);
        });
        ctx.stroke();
      } else if (sig.type === 'digital') {
        ctx.strokeStyle = sig.color || '#2DD4BF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let prevVal = 0;
        cycles.forEach((c, i) => {
          const val = sig.key === 'start' ? (i === 1 ? 1 : 0) : (c[sig.key] ? 1 : 0);
          const x = startX + i * cycleWidth;
          const lineY = val === 1 ? y + 5 : y + 20;

          if (i === 0) {
            ctx.moveTo(x, lineY);
          } else if (val !== prevVal) {
            ctx.lineTo(x, lineY);
          }
          ctx.lineTo(x + cycleWidth, lineY);
          prevVal = val;
        });
        ctx.stroke();
      } else if (sig.type === 'bus') {
        // Bus hexagon style
        cycles.forEach((c, i) => {
          const x = startX + i * cycleWidth;
          const val = c[sig.key];
          ctx.strokeStyle = '#A855F7';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2, y + 4, cycleWidth - 4, 16);

          ctx.fillStyle = '#E2E8F0';
          ctx.font = '9px monospace';
          const txt = String(val);
          ctx.fillText(txt.slice(0, 7), x + 4, y + 16);
        });
      }
    });
  }, [simulationResult, currentCycleIndex]);

  const activeCycle = simulationResult?.clock_cycles?.[currentCycleIndex] || {};

  const verilogCode = `// ============================================================================
// PROJECT: ATM Security & Transaction Verification System
// COURSE: 25DC205 - Digital System Design for Data Science and Cybersecurity
// INSTITUTION: Karunya Institute of Technology and Sciences
// FILE: atm_bank.v
// ============================================================================

module atm_bank (
    input  wire        clk,
    input  wire        rst_n,
    input  wire [31:0] card_id_in,
    input  wire [31:0] pin_in,
    input  wire [2:0]  tx_type,         // 000: Withdraw, 001: Deposit, 010: Balance...
    input  wire [15:0] amount_in,
    input  wire [31:0] target_card_in,
    input  wire        start_tx,
    output reg  [3:0]  fsm_state,
    output reg  [15:0] current_balance,
    output reg         approved,
    output reg         rejected,
    output reg  [3:0]  reject_code,
    output reg         receipt_ready,
    output reg         register_write
);
    // 10-State Algorithmic Stateflow FSM
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

    // Combinational Verification & Sequential Balance Memory
    // ... [See complete synthesizable hardware code in /hardware/atm_bank.v]
endmodule`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(verilogCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white font-['Chakra_Petch']">
              Real-Time Verilog Hardware Simulator (atm_bank.v)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Cycle-accurate digital logic simulation with waveform timing analyzer and FSM state visualizer
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('SIM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
              activeTab === 'SIM' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Simulator & Waveform
          </button>
          <button
            onClick={() => setActiveTab('CODE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
              activeTab === 'CODE' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            atm_bank.v Code
          </button>
        </div>
      </div>

      {activeTab === 'SIM' && (
        <>
          {/* Hardware Input Configuration Bar */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>Section A: Hardware Input Vector Configuration</span>
              <span className="text-slate-500">Clk Period: 10ns (100MHz)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Card ID [31:0]</label>
                <select
                  value={cardId}
                  onChange={(e) => handleCardChange(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none font-mono"
                >
                  <option value={100123}>100123 (Rohit • PIN: 123456)</option>
                  <option value={100124}>100124 (Vikash • PIN: 234567)</option>
                  <option value={100125}>100125 (Vahini • PIN: 345678)</option>
                  <option value={100126}>100126 (Sujith • PIN: 456789)</option>
                  <option value={999999}>999999 (Invalid Card Test)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PIN [31:0]</label>
                <input
                  type="number"
                  value={pin}
                  onChange={(e) => setPin(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">TX Opcode [2:0]</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none font-mono"
                >
                  <option value={0}>000: WITHDRAW</option>
                  <option value={1}>001: DEPOSIT</option>
                  <option value={2}>010: BALANCE ENQUIRY</option>
                  <option value={3}>011: TRANSFER</option>
                  <option value={4}>100: INTEREST BONUS</option>
                  <option value={7}>111: INVALID OP</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Amount [15:0]</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRunSimulation}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold font-['Chakra_Petch'] uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-1"
                >
                  <Zap className="h-4 w-4" />
                  <span>Run Verilog</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stepper & Playback Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRunning(!autoRunning)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  autoRunning
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30'
                }`}
              >
                {autoRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{autoRunning ? 'Pause Clock' : 'Auto Clock (2Hz)'}</span>
              </button>

              <button
                onClick={() => {
                  playKeyBeep(1300, 0.04);
                  setCurrentCycleIndex(prev => Math.min((simulationResult?.clock_cycles?.length || 1) - 1, prev + 1));
                }}
                disabled={currentCycleIndex >= (simulationResult?.clock_cycles?.length || 1) - 1}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 text-xs font-mono font-semibold transition-colors"
              >
                <StepForward className="h-3.5 w-3.5" />
                <span>Step Clock</span>
              </button>

              <button
                onClick={() => {
                  playKeyBeep(800, 0.04);
                  setCurrentCycleIndex(0);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors"
                title="Reset to Clock Cycle T0"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Active Cycle: <strong className="text-teal-400">T{currentCycleIndex}</strong> / T{(simulationResult?.clock_cycles?.length || 1) - 1} • State: <strong className="text-white">{activeCycle?.fsm_state_name || 'S_IDLE'}</strong>
            </div>
          </div>

          {/* FSM State Machine Visual Node Graph */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-300 uppercase">
                Section C: 10-State Algorithmic Stateflow FSM Transition Graph
              </span>
              <span className="text-teal-400">
                Active: {activeCycle?.fsm_state_name || 'S_IDLE'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {FSM_STATES.map((st) => {
                const isCurrent = activeCycle?.fsm_state_code === st.code;
                return (
                  <div
                    key={st.code}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-teal-500/25 border-teal-400 text-teal-300 shadow-lg shadow-teal-500/20 scale-105 glow-teal'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="font-mono text-xs font-bold">
                      {st.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {st.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Waveform Logic Analyzer View */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-300 uppercase">
                Digital Timing Waveform (Logic Analyzer View)
              </span>
              <span className="text-xs text-slate-500">
                Signals: CLK • START_TX • FSM_STATE • REG_WRITE • APPROVED • REJECTED • BALANCE
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <canvas
                ref={waveformCanvasRef}
                width={800}
                height={260}
                className="w-full h-[260px] bg-slate-950"
              />
            </div>
          </div>

          {/* Hardware Bus Registers & Status Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bus Signal Values */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
              <div className="text-xs font-mono font-bold text-slate-300 uppercase pb-2 border-b border-slate-800">
                Cycle T{currentCycleIndex} Internal Signals
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between p-2 rounded-lg bg-slate-950">
                  <span className="text-slate-400">fsm_state [3:0]:</span>
                  <span className="text-teal-400 font-bold">{activeCycle?.fsm_state_name} (0x{activeCycle?.fsm_state_code?.toString(16)})</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-950">
                  <span className="text-slate-400">current_balance [15:0]:</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(activeCycle?.current_balance)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-950">
                  <span className="text-slate-400">register_write flag:</span>
                  <span className={activeCycle?.register_write ? "text-emerald-400 font-bold" : "text-slate-500"}>
                    {activeCycle?.register_write ? "1'b1 (LATCH ENABLED)" : "1'b0 (HOLD STATE)"}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-950">
                  <span className="text-slate-400">approved / rejected:</span>
                  <span>
                    {activeCycle?.approved ? (
                      <span className="text-emerald-400 font-bold">APPROVED = 1</span>
                    ) : activeCycle?.rejected ? (
                      <span className="text-rose-400 font-bold">REJECTED = 1 (Code {activeCycle?.reject_code})</span>
                    ) : (
                      <span className="text-slate-500">PENDING</span>
                    )}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 text-slate-400 text-[11px]">
                  <strong>Hardware Execution Step: </strong> {activeCycle?.comment || 'Idle state'}
                </div>
              </div>
            </div>

            {/* Account Bank Register Memory Snapshot */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
              <div className="text-xs font-mono font-bold text-slate-300 uppercase pb-2 border-b border-slate-800">
                Hardware Account Register Bank (ROM/RAM)
              </div>
              <div className="space-y-2 text-xs font-mono">
                {browserSimulator.accounts.map((acc) => (
                  <div key={acc.card} className="p-2 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{acc.name}</div>
                      <div className="text-slate-500 text-[11px]">Card ID: {acc.card} • PIN: {acc.pin}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-teal-400 font-bold">{formatCurrency(acc.bal)}</div>
                      <div className="text-[10px]">
                        {acc.locked ? (
                          <span className="text-rose-400 font-bold">LOCKED (3 fails)</span>
                        ) : (
                          <span className="text-slate-500">Attempts: {acc.attempts}/3</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Verilog Source Code Viewer */}
      {activeTab === 'CODE' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <FileCode className="h-4 w-4 text-teal-400" />
              <span>hardware/atm_bank.v (Synthesizable IEEE 1364-2001 Verilog)</span>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs transition-colors"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? 'Copied!' : 'Copy Verilog'}</span>
            </button>
          </div>

          <pre className="text-xs text-emerald-400 overflow-x-auto p-4 bg-slate-900/60 rounded-2xl max-h-[500px] leading-relaxed">
            {verilogCode}
          </pre>
        </div>
      )}
    </div>
  );
}

