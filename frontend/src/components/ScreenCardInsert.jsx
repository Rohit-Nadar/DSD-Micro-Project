import React, { useState } from 'react';
import { CreditCard, ArrowRight, ShieldAlert, CheckCircle, Sparkles, KeyRound } from 'lucide-react';
import { playCardInsertSound, playKeyBeep } from '../utils/audio';

export default function ScreenCardInsert({ onCardVerified, errorMsg, isLoading }) {
  const [cardInput, setCardInput] = useState('');
  const [selectedDemo, setSelectedDemo] = useState(null);

  // Each registered member has a unique Card ID, distinct PIN, and initial balance
  const demoAccounts = [
    { card: '100123', pin: '123456', name: 'Rohit Nadar', role: 'Team Lead (URK26AI1021)', bal: '₹5,000' },
    { card: '100124', pin: '234567', name: 'Vikash', role: 'Member (URK26AI1022)', bal: '₹8,000' },
    { card: '100125', pin: '345678', name: 'Vahini Muthu', role: 'Member (URK26AI1023)', bal: '₹12,000' },
    { card: '100126', pin: '456789', name: 'Sujith S.', role: 'Member (URK26AI1024)', bal: '₹3,000' },
  ];

  const handleInsert = (cardIdToUse) => {
    const cid = cardIdToUse || cardInput;
    if (cid.length !== 6 || !/^\d+$/.test(cid)) {
      playKeyBeep(400, 0.1);
      return;
    }
    playCardInsertSound();
    onCardVerified(cid);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-medium">
          <CreditCard className="h-3.5 w-3.5" />
          <span>Section A & B: Registered Data & Identification (FR-01)</span>
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text)] font-['Chakra_Petch'] tracking-wide">
          INSERT YOUR ATM CARD
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Enter your 6-digit Card ID or select any registered member below
        </p>
      </div>

      {/* Card Input & Slot Animation */}
      <div className="bg-[var(--color-card)]/90 border border-[var(--color-border)] rounded-2xl p-6 shadow-xl relative overflow-hidden transition-colors">
        {/* Animated Card Slot Indicator */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-400 animate-ping" />
            <span className="text-xs uppercase font-mono text-[var(--color-muted)]">Card Reader Port [31:0]</span>
          </div>
          <span className="text-xs text-[var(--color-muted)] font-mono">Format: 6-Digit BCD</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              maxLength={6}
              value={cardInput}
              onChange={(e) => setCardInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit Card ID (e.g. 100123)"
              className="w-full bg-[var(--color-input)] border border-[var(--color-border)] focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 rounded-xl px-4 py-3.5 text-lg font-mono tracking-widest text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none transition-all"
            />
            {cardInput.length === 6 && (
              <span className="absolute right-3 top-3.5 text-teal-400">
                <CheckCircle className="h-6 w-6" />
              </span>
            )}
          </div>

          <button
            disabled={cardInput.length !== 6 || isLoading}
            onClick={() => handleInsert(cardInput)}
            className="px-6 py-3.5 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 flex items-center justify-center space-x-2 transition-all shadow-lg shadow-teal-500/20"
          >
            <span>{isLoading ? 'Verifying...' : 'Insert Card'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-2 animate-shake">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Quick Select Demo Accounts with DISTINCT PASSWORDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            <span>Registered Team Members (Different Passwords for Each Member)</span>
          </div>
          <span className="text-slate-500">Click to Select</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {demoAccounts.map((acc) => (
            <div
              key={acc.card}
              onClick={() => {
                setCardInput(acc.card);
                setSelectedDemo(acc.card);
                handleInsert(acc.card);
              }}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
                selectedDemo === acc.card
                  ? 'bg-teal-500/15 border-teal-500/60 shadow-md shadow-teal-500/10'
                  : 'bg-[var(--color-card)]/80 hover:bg-[var(--color-hover)] border-[var(--color-border)] hover:border-teal-500/40'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-slate-800 group-hover:bg-teal-500/20 flex items-center justify-center transition-colors">
                  <CreditCard className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-[var(--color-text)] group-hover:text-teal-300 transition-colors">
                    {acc.name}
                  </div>
                  <div className="text-xs text-[var(--color-muted)] font-mono flex items-center gap-2 mt-0.5">
                    <span>Card: <strong className="text-teal-400">{acc.card}</strong></span>
                    <span>•</span>
                    <span className="flex items-center text-amber-300">
                      <KeyRound className="h-3 w-3 mr-0.5 inline" />
                      PIN: <strong>{acc.pin}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-bold text-emerald-400">{acc.bal}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono group-hover:text-teal-400">
                  Select →
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
