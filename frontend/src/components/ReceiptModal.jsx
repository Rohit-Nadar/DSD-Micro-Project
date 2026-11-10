import React from 'react';
import { X, Download, Printer, ShieldCheck } from 'lucide-react';
import { formatCurrency, maskCardNumber, formatDateTime } from '../utils/formatters';
import { api } from '../services/api';
import { playKeyBeep } from '../utils/audio';

export default function ReceiptModal({ transaction, onClose }) {
  if (!transaction) return null;

  const handleDownloadPdf = () => {
    playKeyBeep(1200, 0.05);
    window.open(api.getPdfReceiptUrl(transaction.receipt_no), '_blank');
  };

  const handlePrint = () => {
    playKeyBeep(1000, 0.04);
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl space-y-4">
        
        {/* Thermal Slip Body */}
        <div className="receipt-paper p-6 rounded-2xl font-mono text-xs text-slate-800 space-y-4 select-text">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <h3 className="font-bold text-sm text-slate-950 uppercase tracking-wider">
              KARUNYA DIGITAL BANK
            </h3>
            <p className="text-[10px] text-slate-600">
              ATM Security & Transaction System
            </p>
            <p className="text-[9px] text-slate-500">
              Terminal: KITS-DSD-ATM-01 • Division of Physical Sciences
            </p>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">DATE/TIME:</span>
              <span className="font-bold">{formatDateTime(transaction.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">RECEIPT NO:</span>
              <span className="font-bold">{transaction.receipt_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CARD NUMBER:</span>
              <span className="font-bold">{maskCardNumber(transaction.card_id)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">STATUS:</span>
              <span className={transaction.approved ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                {transaction.approved ? 'APPROVED' : 'REJECTED'}
              </span>
            </div>
          </div>

          {/* Transaction Section */}
          <div className="py-2.5 border-t border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">TRANSACTION:</span>
              <span className="font-bold text-slate-950">{transaction.tx_type}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-semibold">AMOUNT:</span>
              <span className="font-bold text-slate-950">{formatCurrency(transaction.amount)}</span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-slate-600 font-semibold">AVAILABLE BAL:</span>
              <span className="font-black text-slate-950">{formatCurrency(transaction.balance_after)}</span>
            </div>
          </div>

          {/* Barcode Mock */}
          <div className="text-center pt-2 space-y-1">
            <div className="h-8 bg-slate-900 mx-auto w-3/4 flex items-center justify-center text-[8px] text-white tracking-[6px] font-mono select-none">
              ||| | |||| | ||| ||
            </div>
            <div className="text-[9px] text-slate-500">
              Verified via Simulink & Verilog FSM
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-between gap-2 px-2">
          <button
            onClick={handleDownloadPdf}
            className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-lg"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2.5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-hover)] text-[var(--color-text)] border border-[var(--color-border)] text-xs transition-colors"
            title="Print Receipt"
          >
            <Printer className="h-4 w-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-hover)] text-[var(--color-text)] border border-[var(--color-border)] text-xs transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

