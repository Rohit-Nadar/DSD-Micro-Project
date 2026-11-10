import React, { useState } from 'react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  HelpCircle, 
  Send, 
  TrendingUp, 
  Search, 
  FileText, 
  Clock, 
  ShieldCheck,
  CreditCard,
  LogOut,
  Download
} from 'lucide-react';
import { formatCurrency, maskCardNumber, formatDateTime } from '../utils/formatters';
import { playKeyBeep } from '../utils/audio';

export default function ScreenHome({ 
  account, 
  transactions = [], 
  onSelectAction, 
  onLogout,
  onViewReceipt,
  onSearchHistory
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const quickActions = [
    {
      id: 'WITHDRAW',
      title: 'Cash Withdrawal',
      desc: 'Magnitude Comparator ALU (00)',
      icon: ArrowDownCircle,
      gradient: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400 hover:border-amber-400'
    },
    {
      id: 'DEPOSIT',
      title: 'Cash Deposit',
      desc: '16-Bit Adder Subsystem (01)',
      icon: ArrowUpCircle,
      gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400 hover:border-emerald-400'
    },
    {
      id: 'BALANCE_ENQUIRY',
      title: 'Balance Enquiry',
      desc: 'Direct Read Path (10)',
      icon: HelpCircle,
      gradient: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-400 hover:border-cyan-400'
    },
    {
      id: 'TRANSFER',
      title: 'Fund Transfer',
      desc: 'Inter-Account Bus (011)',
      icon: Send,
      gradient: 'from-blue-500/20 to-indigo-500/10 border-blue-500/40 text-blue-400 hover:border-blue-400'
    },
    {
      id: 'INTEREST',
      title: 'Interest Credit',
      desc: 'Incentive Calculator (100)',
      icon: TrendingUp,
      gradient: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400 hover:border-purple-400'
    }
  ];

  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.tx_type?.toLowerCase().includes(q) ||
      t.receipt_no?.toLowerCase().includes(q) ||
      String(t.amount).includes(q)
    );
  });

  const dailySpent = account?.daily_withdrawn || 0;
  const dailyLimit = account?.daily_limit || 20000;
  const limitPercent = Math.min(100, Math.round((dailySpent / dailyLimit) * 100));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome & Balance Card */}
      <div className="bg-gradient-to-br from-[var(--color-card)] via-[var(--color-card)] to-[var(--color-card2)] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-colors duration-300">
        {/* Decorative glow in corner */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 pb-4 border-b border-[var(--color-border)]">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">
              Authenticated Account • Terminal KITS-01
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight font-['Chakra_Petch']">
              {account?.account_holder || 'Authorized Cardholder'}
            </h1>
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mt-1">
              <CreditCard className="h-3.5 w-3.5 text-slate-500" />
              <span>Card: {maskCardNumber(account?.card_id)}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium flex items-center">
                <ShieldCheck className="h-3 w-3 mr-1" /> Verified
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              playKeyBeep(700, 0.05);
              onLogout();
            }}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[var(--color-hover)] hover:bg-rose-500/20 text-[var(--color-muted)] hover:text-rose-300 border border-[var(--color-border)] hover:border-rose-500/40 text-xs font-semibold transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>End Session</span>
          </button>
        </div>

        {/* Big Balance & Limit Bar */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <span className="text-xs uppercase font-mono tracking-wider text-[var(--color-muted)]">
              Sequential Balance Memory Register [15:0] (FR-05)
            </span>
            <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 font-mono tracking-tight mt-1">
              {formatCurrency(account?.balance)}
            </div>
            <div className="text-xs text-[var(--color-muted)] mt-1">
              Baseline Unit Delay Initial Condition: {formatCurrency(account?.opening_balance || 5000)}
            </div>
          </div>

          {/* Daily Limit Gauge */}
          <div className="bg-[var(--color-card2)]/80 border border-[var(--color-border)] rounded-2xl p-3.5 transition-colors">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[var(--color-muted)] font-mono">Daily Withdrawal Limit</span>
              <span className="font-mono text-teal-400 font-bold">{limitPercent}%</span>
            </div>
            <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  limitPercent > 80 ? 'bg-rose-500' : limitPercent > 50 ? 'bg-amber-500' : 'bg-teal-400'
                }`}
                style={{ width: `${limitPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[var(--color-muted)] font-mono mt-1.5">
              <span>Spent: {formatCurrency(dailySpent)}</span>
              <span>Max: {formatCurrency(dailyLimit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards (Simulink Stateflow Handshakes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider font-mono">
            Select Banking Operation (Section C FSM States)
          </h3>
          <span className="text-xs text-slate-500 font-mono">FR-05 to FR-10</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  playKeyBeep(1200, 0.05);
                  onSelectAction(act.id);
                }}
                className={`p-4 rounded-2xl border bg-gradient-to-b ${act.gradient} text-left transition-all transform hover:-translate-y-1 hover:shadow-lg active:scale-95 flex flex-col justify-between group`}
              >
                <div className="h-10 w-10 rounded-xl bg-[var(--color-card2)]/90 border border-[var(--color-border)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-[var(--color-text)] font-['Chakra_Petch']">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {act.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Transaction History (Last 8 Transactions) */}
      <div className="bg-[var(--color-card)]/90 border border-[var(--color-border)] rounded-3xl p-5 shadow-xl space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-teal-400" />
            <h3 className="font-bold text-sm text-[var(--color-text)] uppercase font-mono tracking-wider">
              Live Audit Log & History (Last 8 Transactions)
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search type or receipt..."
              className="w-full bg-[var(--color-input)] border border-[var(--color-border)] focus:border-teal-400 text-xs rounded-xl pl-8 pr-3 py-2 text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none"
            />
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-mono">
            No transactions found. Perform an operation above to record an audit entry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800/80 pb-2">
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Balance After</th>
                  <th className="py-2 px-3">Receipt No</th>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id || tx.receipt_no} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        tx.approved
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {tx.approved ? 'APPROVED' : 'REJECTED'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--color-text)]">
                      {tx.tx_type}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[var(--color-text)]">
                      {tx.amount > 0 ? formatCurrency(tx.amount) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-teal-300 font-bold">
                      {formatCurrency(tx.balance_after)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {tx.receipt_no}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {formatDateTime(tx.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          playKeyBeep(1100, 0.04);
                          onViewReceipt(tx);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 transition-colors"
                        title="View Thermal Receipt & PDF"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

