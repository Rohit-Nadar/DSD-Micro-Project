import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle, 
  Check, 
  HelpCircle, 
  Sparkles, 
  Users,
  ShieldCheck
} from 'lucide-react';
import { formatCurrency, maskCardNumber } from '../utils/formatters';
import { playKeyBeep } from '../utils/audio';

export default function ScreenTransaction({
  actionType,
  account,
  onBack,
  onSubmitTransaction,
  isLoading
}) {
  const [amount, setAmount] = useState('');
  const [targetCard, setTargetCard] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const currentBal = account?.balance || 0;
  const dailySpent = account?.daily_withdrawn || 0;
  const dailyLimit = account?.daily_limit || 20000;
  const remainingDaily = Math.max(0, dailyLimit - dailySpent);

  const presets = [500, 1000, 2000, 5000, 10000];

  const demoRecipients = [
    { card: '100124', name: 'Vikash' },
    { card: '100125', name: 'Vahini Muthu' },
    { card: '100126', name: 'Sujith S.' },
    { card: '100123', name: 'Rohit Nadar' }
  ].filter(r => r.card !== account?.card_id);

  const handleSubmit = (e) => {
    e?.preventDefault();
    setErrorMsg('');

    const amtNum = Number(amount) || 0;

    if (actionType === 'BALANCE_ENQUIRY') {
      onSubmitTransaction({ txType: 'BALANCE_ENQUIRY', amount: 0 });
      return;
    }

    if (actionType === 'INTEREST') {
      onSubmitTransaction({ txType: 'INTEREST', amount: 0 });
      return;
    }

    if (amtNum <= 0) {
      setErrorMsg('Please specify an amount greater than zero.');
      playKeyBeep(350, 0.08);
      return;
    }

    if (actionType === 'WITHDRAW') {
      if (amtNum > currentBal) {
        setErrorMsg(`Insufficient funds! Requested ${formatCurrency(amtNum)} exceeds balance ${formatCurrency(currentBal)}. (FR-06)`);
        playKeyBeep(350, 0.08);
        return;
      }
      if ((dailySpent + amtNum) > dailyLimit) {
        setErrorMsg(`Daily limit exceeded! Remaining limit today is ${formatCurrency(remainingDaily)}. (FR-07)`);
        playKeyBeep(350, 0.08);
        return;
      }
    }

    if (actionType === 'DEPOSIT') {
      if ((currentBal + amtNum) > 65535) {
        setErrorMsg('Overflow! Resulting balance exceeds hardware 16-bit register capacity (₹65,535).');
        playKeyBeep(350, 0.08);
        return;
      }
    }

    if (actionType === 'TRANSFER') {
      if (!targetCard || targetCard.length !== 6) {
        setErrorMsg('Please enter a valid 6-digit destination Card ID.');
        playKeyBeep(350, 0.08);
        return;
      }
      if (targetCard === account?.card_id) {
        setErrorMsg('Cannot transfer funds to the same account.');
        playKeyBeep(350, 0.08);
        return;
      }
      if (amtNum > currentBal) {
        setErrorMsg(`Insufficient balance for transfer! (Available: ${formatCurrency(currentBal)})`);
        playKeyBeep(350, 0.08);
        return;
      }
    }

    playKeyBeep(1400, 0.06);
    onSubmitTransaction({
      txType: actionType,
      amount: amtNum,
      targetCardId: targetCard || null
    });
  };

  const getTitle = () => {
    switch (actionType) {
      case 'WITHDRAW': return 'CASH WITHDRAWAL (FSM S3: WITHDRAW)';
      case 'DEPOSIT': return 'CASH DEPOSIT (FSM S4: DEPOSIT)';
      case 'BALANCE_ENQUIRY': return 'BALANCE ENQUIRY (FSM S5: BALANCE)';
      case 'TRANSFER': return 'FUND TRANSFER (FSM S6: TRANSFER)';
      case 'INTEREST': return 'INTEREST INCENTIVE CREDIT (FSM S7)';
      default: return 'TRANSACTION';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            playKeyBeep(800, 0.04);
            onBack();
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-teal-500 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Menu</span>
        </button>

        <span className="text-xs font-mono text-teal-400">
          Avail Bal: <strong className="text-white">{formatCurrency(currentBal)}</strong>
        </span>
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-white font-['Chakra_Petch'] tracking-wide">
          {getTitle()}
        </h2>
        <p className="text-xs text-slate-400 font-mono">
          Hardware ALU & Sequential Memory Operations (Sections D & E)
        </p>
      </div>

      {/* Main Action Form */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5">
        
        {/* Balance Enquiry Direct Review */}
        {actionType === 'BALANCE_ENQUIRY' && (
          <div className="space-y-4 py-4 text-center">
            <div className="text-xs uppercase font-mono text-slate-400">
              Current Balance from 16-bit PIPO Unit Delay Memory
            </div>
            <div className="text-4xl sm:text-5xl font-black text-emerald-400 font-mono">
              {formatCurrency(currentBal)}
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono">
              Signal REGISTER_WRITE = 0 (Direct Read Path - No Memory Modification)
            </div>
          </div>
        )}

        {/* Interest Bonus Review */}
        {actionType === 'INTEREST' && (
          <div className="space-y-4 py-4 text-center">
            <div className="text-xs uppercase font-mono text-slate-400">
              Calculated Interest Incentive (FR-10)
            </div>
            <div className="text-3xl font-black text-teal-400 font-mono">
              + {formatCurrency(Math.floor(currentBal / 32) + 50)}
            </div>
            <p className="text-xs text-slate-400">
              Annual incentive bonus automatically calculated and ready to credit to your account balance.
            </p>
          </div>
        )}

        {/* Transfer Destination Card Input */}
        {actionType === 'TRANSFER' && (
          <div className="space-y-3">
            <label className="block text-xs font-mono uppercase text-slate-300 font-semibold">
              Recipient 6-Digit Card ID (FR-09)
            </label>
            <input
              type="text"
              maxLength={6}
              value={targetCard}
              onChange={(e) => setTargetCard(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 100124"
              className="w-full bg-slate-950 border border-slate-700 focus:border-teal-400 rounded-xl px-4 py-3 text-lg font-mono text-white placeholder-slate-600 outline-none"
            />

            {/* Quick Demo Recipient Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Users className="h-3 w-3 text-teal-400" />
                <span>Quick Select Destination Account:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {demoRecipients.map(r => (
                  <button
                    key={r.card}
                    type="button"
                    onClick={() => {
                      playKeyBeep(1100, 0.04);
                      setTargetCard(r.card);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                      targetCard === r.card
                        ? 'bg-teal-500/20 text-teal-300 border-teal-400 font-bold'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {r.name} ({r.card})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Amount Input for Withdraw / Deposit / Transfer */}
        {(actionType === 'WITHDRAW' || actionType === 'DEPOSIT' || actionType === 'TRANSFER') && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <label className="font-mono uppercase text-slate-300 font-semibold">
                  Transaction Amount (INR)
                </label>
                {actionType === 'WITHDRAW' && (
                  <span className="text-slate-400 font-mono text-[11px]">
                    Daily Limit Remaining: {formatCurrency(remainingDaily)}
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-3 text-lg font-bold text-slate-500 font-mono">₹</span>
                <input
                  type="number"
                  min={1}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-teal-400 rounded-xl pl-9 pr-4 py-3 text-xl font-bold font-mono text-white placeholder-slate-600 outline-none"
                />
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <span className="block text-[11px] text-slate-400 font-mono mb-2">Quick Presets:</span>
              <div className="grid grid-cols-5 gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      playKeyBeep(1200, 0.04);
                      setAmount(String(p));
                    }}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                      Number(amount) === p
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                        : 'bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    ₹{p.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Execution Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl font-bold font-['Chakra_Petch'] text-base uppercase tracking-wider bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500 hover:from-teal-400 hover:to-cyan-300 text-slate-950 shadow-xl shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all transform active:scale-98 disabled:opacity-50"
        >
          <span>{isLoading ? 'Executing ALU Subsystems...' : 'Execute Transaction'}</span>
          <ArrowRight className="h-5 w-5" />
        </button>

      </div>
    </div>
  );
}

