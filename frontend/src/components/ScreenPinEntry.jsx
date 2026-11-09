import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Eye, EyeOff, Lock, UserCheck } from 'lucide-react';
import Keypad from './Keypad';
import { playKeyBeep } from '../utils/audio';

export default function ScreenPinEntry({ 
  cardId, 
  accountHolder, 
  onPinSubmit, 
  onCancel, 
  failedAttempts = 0, 
  errorMsg = null, 
  isLoading = false 
}) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleDigitPress = (d) => {
    if (pin.length < 6) {
      setPin(prev => prev + d);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleEnter = () => {
    if (pin.length === 6) {
      onPinSubmit(pin);
    } else {
      playKeyBeep(350, 0.1);
    }
  };

  const remainingAttempts = Math.max(0, 3 - failedAttempts);

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-medium">
          <KeyRound className="h-3.5 w-3.5" />
          <span>Section B: 32-bit Equality Comparator PIN Authentication (FR-02 & FR-03)</span>
        </div>
        <h2 className="text-2xl font-bold text-white font-['Chakra_Petch'] tracking-wide">
          ENTER YOUR 6-DIGIT PIN
        </h2>
        <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
          <UserCheck className="h-4 w-4 text-teal-400" />
          <span>Card ID: <strong className="font-mono text-white">{cardId}</strong></span>
          <span>•</span>
          <span className="text-teal-300 font-medium">{accountHolder}</span>
        </div>
      </div>

      {/* PIN Display Box */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-2xl relative">
        <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-mono">
          <span>Security Input [31:0]</span>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              failedAttempts === 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : failedAttempts === 1
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
            }`}>
              Attempt: {failedAttempts} / 3
            </span>
            <button
              onClick={() => setShowPin(!showPin)}
              className="p-1 hover:text-white transition-colors"
              title={showPin ? "Hide PIN" : "Show PIN"}
            >
              {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* 6 Circular PIN Slots */}
        <div className="flex justify-center items-center gap-3 py-4">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const hasChar = pin.length > idx;
            const char = pin[idx];
            return (
              <div
                key={idx}
                className={`h-12 w-12 rounded-xl flex items-center justify-center font-mono text-2xl font-bold transition-all ${
                  hasChar
                    ? 'bg-teal-500/20 border-2 border-teal-400 text-teal-300 shadow-lg shadow-teal-500/20 scale-105'
                    : 'bg-slate-950 border border-slate-700 text-slate-600'
                }`}
              >
                {hasChar ? (showPin ? char : '●') : ''}
              </div>
            );
          })}
        </div>

        {/* Attempt warning */}
        {failedAttempts > 0 && failedAttempts < 3 && (
          <div className="mt-2 text-center text-xs text-amber-400 flex items-center justify-center space-x-1 font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>WARNING: {remainingAttempts} incorrect attempt(s) remaining before security lockout (FR-04)!</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center flex items-center justify-center space-x-1.5 animate-shake">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* On-Screen Hardware Keypad */}
      <Keypad
        onDigitPress={handleDigitPress}
        onClear={handleClear}
        onCancel={onCancel}
        onEnter={handleEnter}
        disabled={isLoading}
      />
    </div>
  );
}

