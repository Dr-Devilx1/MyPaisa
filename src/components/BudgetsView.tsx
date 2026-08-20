import React, { useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import { TransactionCategory } from '../types';
import { PieChart, Plus, AlertTriangle, CheckCircle, Trash2, ShieldAlert } from 'lucide-react';

const CATEGORIES: TransactionCategory[] = [
  'Food & Dining',
  'Shopping',
  'Housing & Rent',
  'Transportation',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Education',
  'Travel',
  'Subscriptions',
  'Loans & Debts',
  'Other',
];

export const BudgetsView: React.FC = () => {
  const { budgets, setBudget, deleteBudget, userProfile } = useFinancials();

  const [category, setCategory] = useState<TransactionCategory>('Food & Dining');
  const [limitAmount, setLimitAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  const [isAdding, setIsAdding] = useState(false);

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(limitAmount);
    const threshold = parseInt(alertThreshold, 10);
    if (!isNaN(limit) && limit > 0) {
      setBudget(category, limit, threshold || 80);
      setLimitAmount('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131316] p-7 rounded-[2rem] border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Monthly Category Budgets</h2>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            Enforce spending discipline and receive real-time warnings before overspending.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all uppercase tracking-wider"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? 'Close Form' : 'Set Category Budget'}
        </button>
      </div>

      {/* Add/Edit Budget Form Panel */}
      {isAdding && (
        <form
          onSubmit={handleSaveBudget}
          className="rounded-[2rem] bg-[#131316] border border-zinc-800 p-7 shadow-xl flex flex-col gap-4 animate-in slide-in-from-top-2"
        >
          <h3 className="text-sm font-bold text-white border-b border-zinc-800 pb-2">
            Configure Budget Cap
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Monthly Cap ({userProfile.currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none font-bold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Warning Threshold (%)
              </label>
              <input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder="80"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-black hover:bg-emerald-400 uppercase tracking-wider"
            >
              Save Budget
            </button>
          </div>
        </form>
      )}

      {/* Budgets Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgets.map((b) => {
          const percent = Math.min(100, Math.round((b.spentAmount / b.limitAmount) * 100));
          const isOver = b.spentAmount > b.limitAmount;
          const isWarning = percent >= b.alertThresholdPercent;
          const remaining = b.limitAmount - b.spentAmount;

          return (
            <div
              key={b.id}
              className={`rounded-[2rem] p-7 border shadow-xl flex flex-col justify-between transition-all bg-[#131316] ${
                isOver
                  ? 'border-rose-500/40'
                  : isWarning
                  ? 'border-amber-500/40'
                  : 'border-zinc-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white">{b.category}</span>
                  <div className="flex items-center gap-2">
                    {isOver ? (
                      <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-rose-400 border border-rose-500/30">
                        <AlertTriangle className="h-3 w-3" /> Exceeded
                      </span>
                    ) : isWarning ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
                        <ShieldAlert className="h-3 w-3" /> Warning
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                        <CheckCircle className="h-3 w-3" /> Healthy
                      </span>
                    )}

                    <button
                      onClick={() => deleteBudget(b.id)}
                      className="p-1 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-medium tracking-tight text-white">
                    {userProfile.currencySymbol}
                    {b.spentAmount.toLocaleString()}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    Cap: {userProfile.currencySymbol}
                    {b.limitAmount.toLocaleString()}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden my-4 border border-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs">
                <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Remaining Cap:</span>
                <span
                  className={`font-semibold ${
                    remaining < 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {userProfile.currencySymbol}
                  {remaining.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
