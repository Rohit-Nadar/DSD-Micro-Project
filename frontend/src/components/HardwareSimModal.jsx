import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Zap,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Send,
  Database
} from 'lucide-react';
import { browserSimulator, FSM_STATES, REJECT_CODES } from '../services/verilogEngine';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { playKeyBeep } from '../utils/audio';
import { ATM_BANK_VERILOG, ATM_BANK_TESTBENCH } from '../services/verilogSource';

export default function HardwareSimModal() {
  // Registered members with distinct PINs
  const memberPins = {
    100123: 123456, // Rohit Nadar (Lead)
    100124: 234567, // Vikash (Member)
    100125: 345678, // Vahini Muthu (Member)
    100126: 456789  // Sujith S. (Member)
  };

  const memberNames = {
    100123: 'Rohit Nadar (Lead)',
    100124: 'Vikash (Member)',
    100125: 'Vahini Muthu (Member)',
    100126: 'Sujith S. (Member)'
  };

  // Hardware Input Vectors
  const [cardId, setCardId] = useState(100123);
  const [pin, setPin] = useState(123456);
  const [txType, setTxType] = useState(0); // 0=Withdraw, 1=Deposit, 2=Balance, 3=Transfer, 4=Interest, 7=Invalid
  const [amount, setAmount] = useState(2000);
  const [targetCard, setTargetCard] = useState(100124);

  // Tab View: SIM | CODE | TESTBENCH
  const [activeTab, setActiveTab] = useState('SIM');
  const [simulationResult, setSimulationResult] = useState(null);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [autoRunning, setAutoRunning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedType, setCopiedType] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [activePreset, setActivePreset] = useState('WITHDRAW_PASS');

  const waveformCanvasRef = useRef(null);

  // Synchronize PIN whenever Card ID selection changes
  const handleCardChange = (newCid) => {
    setCardId(newCid);
    if (memberPins[newCid]) {
      setPin(memberPins[newCid]);
    }
  };

  // Run simulation engine (FastAPI Backend with seamless browser engine fallback)
  const handleRunSimulation = useCallback(async (overrideParams = null) => {
    playKeyBeep(1400, 0.05);
    setAutoRunning(false);

    const cId = overrideParams?.cardId ?? cardId;
    const pCode = overrideParams?.pin ?? pin;
    const tOp = overrideParams?.txType ?? txType;
    const amt = overrideParams?.amount ?? amount;
    const tgt = overrideParams?.targetCard ?? targetCard;

    try {
      const res = await api.simulateHardware({
        cardId: cId,
        pin: pCode,
        txType: tOp,
        amount: amt,
        targetCardId: tgt
      });

      setSimulationResult(res);
      setCurrentCycleIndex(0);
    } catch (e) {
      // Browser cycle-accurate simulation fallback
      const res = browserSimulator.runSimulation({
        cardId: cId,
        pin: pCode,
        txType: tOp,
        amount: amt,
        targetCard: tgt
      });

      setSimulationResult({
        success: res.success,
        approved: res.approved,
        rejected: !res.approved,
        reject_code: res.rejectCode,
        reject_reason: res.rejectReason,
        final_balance: res.finalBalance,
        daily_withdrawn: res.dailyWithdrawn,
        total_cycles: res.cycles.length,
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
        accounts_snapshot: res.accounts || browserSimulator.accounts
      });
      setCurrentCycleIndex(0);
    }
  }, [cardId, pin, txType, amount, targetCard]);

  // Reset internal hardware registers / RAM to clean factory state
  const handleResetHardwareRegisters = async () => {
    setIsResetting(true);
    playKeyBeep(700, 0.08);
    browserSimulator.reset();
    try {
      await api.resetHardware();
    } catch (e) {
      // Ignored
    }
    setTimeout(() => {
      setIsResetting(false);
      handleRunSimulation({
        cardId: 100123,
        pin: 123456,
        txType: 0,
        amount: 2000,
        targetCard: 100124
      });
    }, 250);
  };

  // Preset Verification Vectors
  const presets = [
    {
      id: 'WITHDRAW_PASS',
      label: 'Withdraw ₹2,000 (Pass)',
      badge: 'FR-06 Approved',
      color: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10',
      params: { cardId: 100123, pin: 123456, txType: 0, amount: 2000, targetCard: 100124 }
    },
    {
      id: 'DEPOSIT_PASS',
      label: 'Deposit ₹3,000 (Pass)',
      badge: 'FR-08 Approved',
      color: 'border-teal-500/40 text-teal-300 hover:bg-teal-500/10',
      params: { cardId: 100123, pin: 123456, txType: 1, amount: 3000, targetCard: 100124 }
    },
    {
      id: 'BALANCE_READ',
      label: 'Balance Enquiry (FR-05)',
      badge: 'Read-Only (RegWrite=0)',
      color: 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10',
      params: { cardId: 100123, pin: 123456, txType: 2, amount: 0, targetCard: 100124 }
    },
    {
      id: 'TRANSFER_PASS',
      label: 'Transfer ₹1,000 to 100124',
      badge: 'FR-09 Inter-Account',
      color: 'border-purple-500/40 text-purple-300 hover:bg-purple-500/10',
      params: { cardId: 100123, pin: 123456, txType: 3, amount: 1000, targetCard: 100124 }
    },
    {
      id: 'INTEREST_PASS',
      label: 'Interest Bonus (FR-10)',
      badge: 'Pro-Rated Bonus',
      color: 'border-sky-500/40 text-sky-300 hover:bg-sky-500/10',
      params: { cardId: 100123, pin: 123456, txType: 4, amount: 0, targetCard: 100124 }
    },
    {
      id: 'WRONG_PIN',
      label: 'Wrong PIN Attempt',
      badge: 'Reject Code 2',
      color: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10',
      params: { cardId: 100123, pin: 999999, txType: 0, amount: 2000, targetCard: 100124 }
    },
    {
      id: 'LOCKOUT_3X',
      label: '3x Wrong PIN Lockout',
      badge: 'Reject Code 3 (FR-04)',
      color: 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10',
      params: { cardId: 100124, pin: 111111, txType: 2, amount: 0, targetCard: 100124 }
    },
    {
      id: 'DAILY_LIMIT',
      label: 'Daily Limit ₹25,000 Exceeded',
      badge: 'Reject Code 4 (FR-07)',
      color: 'border-orange-500/40 text-orange-300 hover:bg-orange-500/10',
      params: { cardId: 100123, pin: 123456, txType: 0, amount: 25000, targetCard: 100124 }
    },
    {
      id: 'INSUFFICIENT',
      label: 'Insufficient Funds ₹60,000',
      badge: 'Reject Code 5 (FR-06)',
      color: 'border-red-500/40 text-red-300 hover:bg-red-500/10',
      params: { cardId: 100123, pin: 123456, txType: 0, amount: 60000, targetCard: 100124 }
    },
    {
      id: 'OVERFLOW_16BIT',
      label: '16-Bit Overflow (₹65k+)',
      badge: 'Reject Code 8 (FR-08)',
      color: 'border-pink-500/40 text-pink-300 hover:bg-pink-500/10',
      params: { cardId: 100123, pin: 123456, txType: 1, amount: 65000, targetCard: 100124 }
    },
    {
      id: 'INVALID_CARD',
      label: 'Invalid Card 999999',
      badge: 'Reject Code 1 (FR-01)',
      color: 'border-slate-500/40 text-slate-300 hover:bg-slate-500/10',
      params: { cardId: 999999, pin: 123456, txType: 0, amount: 2000, targetCard: 100124 }
    }
  ];

  const handleApplyPreset = (preset) => {
    setActivePreset(preset.id);
    setCardId(preset.params.cardId);
    setPin(preset.params.pin);
    setTxType(preset.params.txType);
    setAmount(preset.params.amount);
    setTargetCard(preset.params.targetCard);
    handleRunSimulation(preset.params);
  };

  // Initial simulation run on mount
  useEffect(() => {
    handleRunSimulation();
  }, []);

  // Auto-run clock stepper (2Hz clock cycle stepping)
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

  // Render Logic Analyzer Timing Waveform on Canvas with Retina crispness
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !simulationResult?.clock_cycles) return;

    const ctx = canvas.getContext('2d');
    const cycles = simulationResult.clock_cycles;

    // Responsive canvas dimensions
    const containerWidth = canvas.parentElement?.clientWidth || 800;
    const width = Math.max(760, containerWidth);
    const height = 280;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Dark grid background
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, width, height);

    // Signals to draw
    const signals = [
      { name: 'CLK', type: 'clk', color: '#38BDF8' },
      { name: 'START_TX', type: 'digital', key: 'start', color: '#F59E0B' },
      { name: 'FSM_STATE', type: 'bus', key: 'fsm_state_name', color: '#C084FC' },
      { name: 'REG_WRITE', type: 'digital', key: 'register_write', color: '#34D399' },
      { name: 'APPROVED', type: 'digital', key: 'approved', color: '#10B981' },
      { name: 'REJECTED', type: 'digital', key: 'rejected', color: '#EF4444' },
      { name: 'BALANCE', type: 'bus', key: 'current_balance', color: '#2DD4BF' }
    ];

    const startX = 110;
    const cycleWidth = Math.max(48, (width - startX - 20) / Math.max(1, cycles.length));
    const rowHeight = 34;

    // Header cycle marks
    ctx.fillStyle = '#64748B';
    ctx.font = '10px "JetBrains Mono", monospace';
    cycles.forEach((c, i) => {
      const x = startX + i * cycleWidth;
      ctx.fillText(`T${i}`, x + 6, 16);
      
      // Vertical grid lines
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x, height);
      ctx.stroke();
    });

    // Highlight current active cycle cursor
    if (cycles[currentCycleIndex]) {
      const curX = startX + currentCycleIndex * cycleWidth;
      ctx.fillStyle = 'rgba(20, 184, 166, 0.16)';
      ctx.fillRect(curX, 22, cycleWidth, height - 22);
      ctx.strokeStyle = '#14B8A6';
      ctx.lineWidth = 2;
      ctx.strokeRect(curX, 22, cycleWidth, height - 22);
    }

    // Draw signals
    signals.forEach((sig, sIdx) => {
      const y = 32 + sIdx * rowHeight;

      // Signal Label
      ctx.fillStyle = sig.color;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText(sig.name, 10, y + 16);

      if (sig.type === 'clk') {
        // Draw square clock pulses (100MHz)
        ctx.strokeStyle = sig.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        cycles.forEach((_, i) => {
          const x = startX + i * cycleWidth;
          const half = cycleWidth / 2;
          ctx.moveTo(x, y + 20);
          ctx.lineTo(x, y + 4);
          ctx.lineTo(x + half, y + 4);
          ctx.lineTo(x + half, y + 20);
          ctx.lineTo(x + cycleWidth, y + 20);
        });
        ctx.stroke();
      } else if (sig.type === 'digital') {
        ctx.strokeStyle = sig.color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        let prevVal = 0;
        cycles.forEach((c, i) => {
          const val = sig.key === 'start' ? (i === 1 ? 1 : 0) : (c[sig.key] ? 1 : 0);
          const x = startX + i * cycleWidth;
          const lineY = val === 1 ? y + 4 : y + 20;

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
        // Multi-bit bus hexagonal frames
        cycles.forEach((c, i) => {
          const x = startX + i * cycleWidth;
          const rawVal = c[sig.key];
          const valStr = sig.key === 'current_balance' ? `₹${rawVal}` : String(rawVal);

          ctx.strokeStyle = sig.color;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x + 2, y + 4, cycleWidth - 4, 16);

          ctx.fillStyle = '#E2E8F0';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(valStr.slice(0, 7), x + 4, y + 16);
        });
      }
    });
  }, [simulationResult, currentCycleIndex]);

  const activeCycle = simulationResult?.clock_cycles?.[currentCycleIndex] || {};

  const handleCopyCode = (text, type) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setCopiedType(type);
    setTimeout(() => {
      setIsCopied(false);
      setCopiedType('');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Cpu className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-['Chakra_Petch'] tracking-wide">
                Real-Time Verilog Hardware Simulator (atm_bank.v)
              </h2>
              <p className="text-xs text-slate-400">
                Cycle-accurate digital logic simulation with waveform analyzer, 10-state FSM tracker, and ROM/RAM inspector
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setActiveTab('SIM')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all flex items-center space-x-1.5 ${
              activeTab === 'SIM' 
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Simulator & Waveform</span>
          </button>
          <button
            onClick={() => setActiveTab('CODE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all flex items-center space-x-1.5 ${
              activeTab === 'CODE' 
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>atm_bank.v (RTL)</span>
          </button>
          <button
            onClick={() => setActiveTab('TESTBENCH')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all flex items-center space-x-1.5 ${
              activeTab === 'TESTBENCH' 
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>atm_bank_tb.v (Testbench)</span>
          </button>
        </div>
      </div>

      {activeTab === 'SIM' && (
        <>
          {/* Quick 1-Click Verification Test Vectors / Presets */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl shadow-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1.5 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-semibold text-slate-300 uppercase tracking-wide">
                  Quick Verification Presets (FR-01 to FR-12 Branches)
                </span>
              </div>
              <span className="text-slate-500 text-[11px]">Click any preset to simulate instantly</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {presets.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition-all flex items-center space-x-1.5 ${p.color} ${
                    activePreset === p.id ? 'bg-slate-800 ring-2 ring-teal-400/50' : 'bg-slate-950/70'
                  }`}
                >
                  <span className="font-bold">{p.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-750">
                    {p.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section A: Hardware Input Vector Configuration Bar */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold pb-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sliders className="h-4 w-4" />
                <span>Section A: Hardware Input Vector Configuration</span>
              </div>
              <span className="text-slate-500">Clk Period: 10ns (100MHz) • IEEE 1364-2001</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs font-mono">
              {/* Card ID Selection */}
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Card ID [31:0]</label>
                <select
                  value={cardId}
                  onChange={(e) => handleCardChange(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 font-mono"
                >
                  <option value={100123}>100123 (Rohit • PIN: 123456)</option>
                  <option value={100124}>100124 (Vikash • PIN: 234567)</option>
                  <option value={100125}>100125 (Vahini • PIN: 345678)</option>
                  <option value={100126}>100126 (Sujith • PIN: 456789)</option>
                  <option value={999999}>999999 (Invalid Card Test)</option>
                </select>
              </div>

              {/* PIN Input */}
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">
                  PIN [31:0] <span className="text-teal-400 font-normal">({memberNames[cardId] ? 'Distinct' : 'Custom'})</span>
                </label>
                <input
                  type="number"
                  value={pin}
                  onChange={(e) => setPin(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 font-mono"
                />
              </div>

              {/* TX Opcode */}
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">TX Opcode [2:0]</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 font-mono"
                >
                  <option value={0}>000: WITHDRAW</option>
                  <option value={1}>001: DEPOSIT</option>
                  <option value={2}>010: BALANCE ENQUIRY</option>
                  <option value={3}>011: TRANSFER</option>
                  <option value={4}>100: INTEREST BONUS</option>
                  <option value={7}>111: INVALID OP (Test Code 6)</option>
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Amount [15:0] (INR)</label>
                <input
                  type="number"
                  disabled={txType === 2 || txType === 4}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 disabled:opacity-40 font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => handleRunSimulation()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold font-['Chakra_Petch'] uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center space-x-1.5"
                >
                  <Zap className="h-4 w-4" />
                  <span>Run Verilog</span>
                </button>

                <button
                  onClick={handleResetHardwareRegisters}
                  disabled={isResetting}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-slate-600 transition-colors"
                  title="Reset Hardware Account Registers & RAM"
                >
                  <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin text-teal-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Target Card Input if Transfer is selected */}
            {txType === 3 && (
              <div className="pt-2 border-t border-slate-850 flex items-center space-x-3 text-xs font-mono">
                <span className="text-purple-400 font-semibold flex items-center gap-1">
                  <Send className="h-3.5 w-3.5" />
                  Target Recipient Card [31:0]:
                </span>
                <select
                  value={targetCard}
                  onChange={(e) => setTargetCard(Number(e.target.value))}
                  className="bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-1.5 text-white outline-none focus:ring-1 focus:ring-purple-400 font-mono"
                >
                  <option value={100124}>100124 (Vikash)</option>
                  <option value={100125}>100125 (Vahini Muthu)</option>
                  <option value={100126}>100126 (Sujith S.)</option>
                  <option value={100123}>100123 (Rohit Nadar)</option>
                  <option value={999999}>999999 (Non-existent target)</option>
                </select>
              </div>
            )}
          </div>

          {/* Real-time Hardware Result Status Banner */}
          {simulationResult && (
            <div className={`p-4 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
              simulationResult.approved 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                  simulationResult.approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {simulationResult.approved ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                </div>
                <div>
                  <div className="font-['Chakra_Petch'] font-bold text-base tracking-wide flex items-center gap-2">
                    <span>
                      {simulationResult.approved ? 'HARDWARE ASSERTION: TRANSACTION APPROVED' : 'HARDWARE ASSERTION: TRANSACTION REJECTED'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-950/80 border border-current">
                      Code {simulationResult.reject_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono">
                    {simulationResult.reject_reason || (simulationResult.approved ? 'All comparators passed (A >= B, Auth Match, Capacity Valid)' : 'Constraint violated')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs font-mono">
                <div className="text-right">
                  <div className="text-slate-400 text-[11px]">Final Balance [15:0]</div>
                  <div className="font-bold text-sm text-white">{formatCurrency(simulationResult.final_balance ?? activeCycle?.current_balance)}</div>
                </div>
                <div className="text-right border-l border-slate-800 pl-4">
                  <div className="text-slate-400 text-[11px]">Total Clock Cycles</div>
                  <div className="font-bold text-sm text-teal-400">{simulationResult.total_cycles || simulationResult.clock_cycles?.length} CLKs</div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper & Playback Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRunning(!autoRunning)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  autoRunning
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
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
              Active Clock: <strong className="text-teal-400">T{currentCycleIndex}</strong> / T{(simulationResult?.clock_cycles?.length || 1) - 1} • State: <strong className="text-white">{activeCycle?.fsm_state_name || 'S_IDLE'}</strong>
            </div>
          </div>

          {/* FSM State Machine Visual Node Graph */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-300 uppercase">
                Section C: 10-State Algorithmic Stateflow FSM Transition Graph
              </span>
              <span className="text-teal-400">
                Active State: <strong>{activeCycle?.fsm_state_name || 'S_IDLE'}</strong> (Code {activeCycle?.fsm_state_code ?? 0})
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
                height={280}
                className="w-full bg-slate-950 block"
              />
            </div>
          </div>

          {/* Hardware Bus Registers & Status Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Bus Signal Values */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
              <div className="text-xs font-mono font-bold text-slate-300 uppercase pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>Cycle T{currentCycleIndex} Internal Hardware Signals</span>
                <span className="text-teal-400 text-[11px] font-normal">Section D & E ALU Buses</span>
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
                <div className="p-2.5 rounded-lg bg-slate-950 text-slate-300 text-[11px] border border-slate-850">
                  <strong className="text-teal-400">Hardware Step: </strong> {activeCycle?.comment || 'Idle state'}
                </div>
              </div>
            </div>

            {/* Account Bank Register Memory Snapshot */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
              <div className="text-xs font-mono font-bold text-slate-300 uppercase pb-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Database className="h-3.5 w-3.5 text-teal-400" />
                  <span>Hardware Account Register Bank (ROM/RAM)</span>
                </div>
                <button
                  onClick={handleResetHardwareRegisters}
                  className="text-[10px] text-teal-400 hover:text-teal-300 underline font-mono"
                >
                  Reset Registers
                </button>
              </div>
              <div className="space-y-2 text-xs font-mono">
                {(simulationResult?.accounts_snapshot || browserSimulator.accounts).map((acc) => (
                  <div key={acc.card} className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{acc.name || memberNames[acc.card] || `Card ${acc.card}`}</span>
                        {cardId === acc.card && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Card: <strong className="text-slate-200">{acc.card}</strong> • PIN: <strong className="text-amber-300">{acc.pin || memberPins[acc.card]}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-teal-400 font-bold">{formatCurrency(acc.bal)}</div>
                      <div className="text-[10px] mt-0.5">
                        {acc.locked ? (
                          <span className="text-rose-400 font-bold">LOCKED (3 fails)</span>
                        ) : (
                          <span className="text-slate-500">Fails: {acc.attempts || 0}/3</span>
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

      {/* Tab 2: Verilog Source Code (atm_bank.v) */}
      {activeTab === 'CODE' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <FileCode className="h-4 w-4 text-teal-400" />
              <span className="font-bold text-white">hardware/atm_bank.v</span>
              <span>(Synthesizable IEEE 1364-2001 Verilog RTL • 378 Lines)</span>
            </div>
            <button
              onClick={() => handleCopyCode(ATM_BANK_VERILOG, 'RTL')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs transition-colors"
            >
              {isCopied && copiedType === 'RTL' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied && copiedType === 'RTL' ? 'Copied!' : 'Copy atm_bank.v'}</span>
            </button>
          </div>

          <pre className="text-xs text-emerald-400 overflow-x-auto p-4 bg-slate-900/60 rounded-2xl max-h-[560px] leading-relaxed">
            {ATM_BANK_VERILOG}
          </pre>
        </div>
      )}

      {/* Tab 3: Testbench Source Code (atm_bank_tb.v) */}
      {activeTab === 'TESTBENCH' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Terminal className="h-4 w-4 text-purple-400" />
              <span className="font-bold text-white">hardware/atm_bank_tb.v</span>
              <span>(Verification Testbench Covering Tests 1 to 7 • 192 Lines)</span>
            </div>
            <button
              onClick={() => handleCopyCode(ATM_BANK_TESTBENCH, 'TB')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs transition-colors"
            >
              {isCopied && copiedType === 'TB' ? <Check className="h-3.5 w-3.5 text-purple-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied && copiedType === 'TB' ? 'Copied!' : 'Copy atm_bank_tb.v'}</span>
            </button>
          </div>

          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-300">
            <strong>Terminal Compilation & Simulation Command:</strong>
            <code className="block mt-1 px-2.5 py-1.5 bg-slate-950 rounded-lg text-teal-300">
              iverilog -o atm_bank_sim hardware/atm_bank.v hardware/atm_bank_tb.v && vvp atm_bank_sim
            </code>
          </div>

          <pre className="text-xs text-purple-300 overflow-x-auto p-4 bg-slate-900/60 rounded-2xl max-h-[500px] leading-relaxed">
            {ATM_BANK_TESTBENCH}
          </pre>
        </div>
      )}

    </div>
  );
}
