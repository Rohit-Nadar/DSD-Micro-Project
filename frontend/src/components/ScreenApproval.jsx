import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Download, 
  RotateCcw, 
  Clock, 
  ShieldCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { playSuccessChime, playErrorAlert, playKeyBeep } from '../utils/audio';
import { api } from '../services/api';

export default function ScreenApproval({
  result,
  onDone,
  onViewReceipt
}) {
  const [countdown, setCountdown] = useState(30);

  const isApproved = result?.approved || false;
  const rejectCode = result?.reject_code || 0;
  const receiptNo = result?.receipt_no;
  const message = result?.message || (isApproved ? 'Transaction Approved Successfully' : 'Transaction Rejected');

  // Trigger sound effect and confetti on mount
  useEffect(() => {
    if (isApproved) {
      playSuccessChime();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    } else {
      playErrorAlert();
    }
  }, [isApproved]);

  // Auto-logout countdown timer (30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDone]);

  const handleDownloadPdf = () => {
    if (!receiptNo) return;
    playKeyBeep(1200, 0.05);
    window.open(api.getPdfReceiptUrl(receiptNo), '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl mx-auto text-center">
      
      {/* Big Animated Indicator Lamp */}
      <div className="py-6 flex flex-col items-center justify-center space-y-4">
        <div className={`h-28 w-28 rounded-full flex items-center justify-center shadow-2xl transition-all animate-bounce ${
          isApproved
            ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 glow-green'
            : 'bg-gradient-to-tr from-rose-600 to-red-500 text-white glow-red'
        }`}>
          {isApproved ? (
            <CheckCircle2 className="h-16 w-16 stroke-[2.5]" />
          ) : (
            <XCircle className="h-16 w-16 stroke-[2.5]" />
          )}
        </div>

        <div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border ${
            isApproved 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {isApproved ? 'TRANSACTION APPROVED (FSM S9: OUTPUT)' : `TRANSACTION REJECTED (FSM S10: REJECT • CODE ${rejectCode})`}
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Chakra_Petch'] mt-2">
            {isApproved ? 'TRANSACTION COMPLETED' : 'TRANSACTION FAILED'}
          </h2>

          <p className="text-sm text-slate-300 max-w-md mx-auto mt-2">
            {message}
          </p>
        </div>
      </div>

      {/* Transaction Details Card */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Terminal KITS-DSD-ATM-01</span>
          {receiptNo && (
            <span className="text-teal-400 font-bold">Receipt: {receiptNo}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block">Operation Type</span>
            <span className="text-white font-bold text-sm">
              {result?.transaction?.tx_type || 'BANKING OPERATION'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Transaction Amount</span>
            <span className="text-white font-bold text-sm">
              {formatCurrency(result?.transaction?.amount || 0)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Previous Balance</span>
            <span className="text-slate-400 font-bold">
              {formatCurrency(result?.transaction?.balance_before || result?.account?.balance || 0)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Updated Balance [15:0]</span>
            <span className="text-emerald-400 font-black text-base">
              {formatCurrency(result?.account?.balance ?? result?.transaction?.balance_after ?? 0)}
            </span>
          </div>
        </div>

        {/* Action Buttons: View Receipt / Download PDF */}
        {isApproved && (
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                playKeyBeep(1100, 0.04);
                onViewReceipt(result.transaction);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              <FileText className="h-4 w-4 text-teal-400" />
              <span>View Thermal Slip</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex-1 py-2.5 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-md shadow-teal-500/10"
            >
              <Download className="h-4 w-4 text-teal-400" />
              <span>Download PDF Receipt</span>
            </button>
          </div>
        )}
      </div>

      {/* Auto-logout countdown indicator & Return button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-amber-400 animate-spin" />
          <span>Auto-ejecting card in <strong className="text-white">{countdown}s</strong></span>
        </div>

        <button
          onClick={() => {
            playKeyBeep(800, 0.04);
            onDone();
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold uppercase tracking-wider flex items-center space-x-1.5 hover:from-teal-400 hover:to-cyan-400 transition-all shadow-md"
        >
          <span>Finish & Eject Card</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
}

