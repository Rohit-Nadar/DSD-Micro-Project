import React, { useEffect } from 'react';
import { playKeyBeep } from '../utils/audio';

export default function Keypad({ 
  onDigitPress, 
  onClear, 
  onCancel, 
  onEnter, 
  disabled = false,
  activeKey = null 
}) {
  const digits = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  // Listen to physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (disabled) return;
      if (e.key >= '0' && e.key <= '9') {
        playKeyBeep(1200 + parseInt(e.key) * 40, 0.04);
        onDigitPress(e.key);
      } else if (e.key === 'Enter') {
        playKeyBeep(1600, 0.06);
        onEnter();
      } else if (e.key === 'Backspace') {
        playKeyBeep(900, 0.04);
        onClear();
      } else if (e.key === 'Escape') {
        playKeyBeep(600, 0.06);
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onDigitPress, onClear, onCancel, onEnter]);

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md max-w-sm mx-auto">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400">
        <span className="font-mono uppercase tracking-wider font-semibold text-slate-400">
          Hardware Keypad (FR-02)
        </span>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-teal-400 border border-slate-700">
          Tactile BCD
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {/* Left 3 columns: Digits */}
        <div className="col-span-3 grid grid-cols-3 gap-2 sm:gap-2.5">
          {digits.map((row, rIdx) => (
            row.map((d) => {
              const isSpecial = d === '*' || d === '#';
              return (
                <button
                  key={d}
                  disabled={disabled || isSpecial}
                  onClick={() => {
                    playKeyBeep(1200 + (parseInt(d) || 0) * 40, 0.04);
                    onDigitPress(d);
                  }}
                  className={`relative py-3.5 sm:py-4 rounded-xl text-lg sm:text-xl font-bold font-mono transition-all transform active:scale-95 shadow-md flex items-center justify-center ${
                    isSpecial
                      ? 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                      : 'bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-650 hover:to-slate-750 text-slate-100 border-t border-slate-600 border-b-2 border-b-slate-900 shadow-slate-950/50 hover:border-teal-500/50 active:translate-y-0.5'
                  }`}
                >
                  <span className="drop-shadow">{d}</span>
                  {/* Subtle Braille pip on '5' key */}
                  {d === '5' && (
                    <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-slate-400" />
                  )}
                </button>
              );
            })
          ))}
        </div>

        {/* Right column: Action keys (Cancel, Clear, Blank, Enter) */}
        <div className="col-span-1 flex flex-col space-y-2 sm:space-y-2.5">
          {/* CANCEL */}
          <button
            disabled={disabled}
            onClick={() => {
              playKeyBeep(600, 0.07);
              onCancel();
            }}
            className="flex-1 py-3 px-1 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-650 text-white border-t border-rose-400 border-b-2 border-b-rose-900 shadow-md shadow-rose-950/40 transform active:scale-95 active:translate-y-0.5 flex flex-col items-center justify-center"
          >
            <span>Cancel</span>
          </button>

          {/* CLEAR */}
          <button
            disabled={disabled}
            onClick={() => {
              playKeyBeep(900, 0.05);
              onClear();
            }}
            className="flex-1 py-3 px-1 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-550 text-slate-950 border-t border-amber-300 border-b-2 border-b-amber-800 shadow-md shadow-amber-950/40 transform active:scale-95 active:translate-y-0.5 flex flex-col items-center justify-center"
          >
            <span>Clear</span>
          </button>

          {/* ENTER */}
          <button
            disabled={disabled}
            onClick={() => {
              playKeyBeep(1600, 0.08);
              onEnter();
            }}
            className="flex-[1.5] py-4 px-1 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-550 text-slate-950 border-t border-emerald-300 border-b-2 border-b-emerald-800 shadow-md shadow-emerald-950/40 transform active:scale-95 active:translate-y-0.5 flex flex-col items-center justify-center font-['Chakra_Petch']"
          >
            <span>Enter</span>
          </button>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-center text-slate-500 font-mono">
        Keyboard Shortcuts: 0–9 Digits • Enter [Confirm] • Backspace [Clear] • Esc [Cancel]
      </div>
    </div>
  );
}

