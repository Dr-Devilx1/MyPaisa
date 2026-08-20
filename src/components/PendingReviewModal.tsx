import React from 'react';
import { useFinancials } from '../state/FinancialContext';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';

export const PendingReviewModal: React.FC = () => {
  const {
    pendingTransactions,
    approvePendingTransaction,
    rejectPendingTransaction,
    isPendingReviewOpen,
    setIsPendingReviewOpen,
    userProfile,
  } = useFinancials();

  if (!isPendingReviewOpen) return null;

  const isDark = userProfile.themeMode === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-[#131316] border-zinc-800 text-zinc-100'
            : 'bg-[#F8FAFC] border-slate-200 text-slate-800 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className={`p-6 pb-4 border-b flex items-center justify-between ${
          isDark ? 'border-zinc-800/80 bg-zinc-900/50' : 'border-slate-200/80 bg-white/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold relative">
              <Bell className="h-5 w-5" />
              {pendingTransactions.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-zinc-950 font-mono text-[10px] font-bold flex items-center justify-center">
                  {pendingTransactions.length}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Pending Initialization Items</h3>
              <p className="text-xs text-zinc-500">Review quick logs before adding to core financials</p>
            </div>
          </div>
          <button
            onClick={() => setIsPendingReviewOpen(false)}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-6 flex flex-col gap-4 max-h-[420px] overflow-y-auto">
          {pendingTransactions.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold">All Pending Items Initialized!</p>
              <p className="text-xs text-zinc-500 max-w-xs">
                No unapproved quick capture logs. You can add quick income or expenses anytime with the Quick Log button.
              </p>
            </div>
          ) : (
            pendingTransactions.map((tx) => (
              <div
                key={tx.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  isDark
                    ? 'bg-zinc-900/90 border-zinc-800'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}
                  >
                    {tx.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm block tracking-tight">{tx.title}</span>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium mt-0.5">
                      <span className="bg-zinc-500/10 px-2 py-0.5 rounded-md text-[10px] font-semibold text-amber-500">
                        {tx.mainCategory}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-mono text-base font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{userProfile.currencySymbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => approvePendingTransaction(tx.id)}
                      className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors"
                      title="Approve & Initialize"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => rejectPendingTransaction(tx.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                      title="Reject & Delete"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
