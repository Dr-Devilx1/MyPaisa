import React, { useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import {
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  X,
  BellRing
} from 'lucide-react';
import { MainCategory } from '../types';
import { useBackHandler } from '../lib/useBackButton';

export const QuickLogModal: React.FC = () => {
  const {
    isQuickAddModalOpen,
    setIsQuickAddModalOpen,
    addQuickPendingTransaction,
    setIsPendingReviewOpen,
    userProfile,
  } = useFinancials();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<MainCategory>('Food & Living');
  const [notes, setNotes] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useBackHandler(isQuickAddModalOpen, () => setIsQuickAddModalOpen(false));

  if (!isQuickAddModalOpen) return null;

  const isDark = userProfile.themeMode === 'dark';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    addQuickPendingTransaction(
      title.trim() || (type === 'income' ? 'Quick Income Entry' : 'Quick Expense Entry'),
      parsedAmount,
      type,
      category,
      notes.trim() || undefined
    );

    setToastMessage('Transaction logged! Added to Pending Verification Queue.');
    setTimeout(() => {
      setToastMessage('');
      setIsQuickAddModalOpen(false);
      setTitle('');
      setAmount('');
      setNotes('');
    }, 1100);
  };

  return (
    /* LAYOUT FIX: the panel used `overflow-hidden` with no max-height and no
       inner scroll area, centred inside a fixed overlay. On a short screen -
       and on every screen once the keyboard opened - the top and bottom of the
       panel were clipped off with no way to scroll to them, which is why the
       close and submit buttons could not be reached. `.mp-modal` (see
       index.css) pins the header and footer and scrolls only the middle. */
    <div className="mp-modal-wrap bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`mp-modal ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
        {/* Header */}
        <div className="mp-modal-head p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Quick Capture (Pending Verification)</h3>
              <p className="text-xs text-zinc-500">Fast transaction logger with instant notification queue</p>
            </div>
          </div>
          <button
            onClick={() => setIsQuickAddModalOpen(false)}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mp-modal-body p-6 flex flex-col gap-4">
          {toastMessage && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold flex items-center gap-2 animate-bounce">
              <BellRing className="h-4 w-4 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Type Selector Toggle */}
          <div className={`grid grid-cols-2 p-1 rounded-2xl border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-200/70 border-slate-300/50'
          }`}>
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (category === 'Income') setCategory('Food & Living');
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-md'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="h-4 w-4" /> Expense Outflow
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('Income');
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" /> Earned Income
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Amount ({userProfile.currencySymbol}) *</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-lg font-bold text-zinc-400">{userProfile.currencySymbol}</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-9 pr-4 py-3 text-xl font-mono font-bold rounded-2xl border outline-none transition-all ${
                  isDark
                    ? 'bg-zinc-900/80 border-zinc-800 text-white focus:border-amber-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>
          </div>

          {/* Title / Description */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Quick Title / Note</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Coffee, Taxi, Grocery, Donation"
              className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${
                isDark
                  ? 'bg-zinc-900/80 border-zinc-800 text-white focus:border-amber-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Category Dropdown (with Donations & Charity option!) */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 flex items-center justify-between">
              <span>Category</span>
              <span className="text-[10px] text-amber-500 font-normal">Donations & Charity Included</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MainCategory)}
              className={`w-full px-4 py-2.5 text-xs font-semibold rounded-xl border outline-none transition-all ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-white focus:border-amber-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
              }`}
            >
              {type === 'income' ? (
                <option value="Income">Income (Salary, Freelance, Gift)</option>
              ) : (
                <>
                  <option value="Food & Living">Food & Living (Groceries, Dining)</option>
                  <option value="Housing & Utilities">Housing & Utilities (Rent, Power)</option>
                  <option value="Transportation">Transportation (Fuel, Transit)</option>
                  <option value="Shopping & Personal">Shopping & Personal</option>
                  <option value="Health & Medical">Health & Medical</option>
                  <option value="Entertainment & Travel">Entertainment & Travel</option>
                  <option value="Education & Work">Education & Work</option>
                  <option value="Donations & Charity">❤️ Donations & Charity / Zakat</option>
                  <option value="Loans & Debts">Loans & Debts</option>
                  <option value="OTHERS">OTHERS</option>
                </>
              )}
            </select>
          </div>

          {/* Submit */}
          <div className="mp-modal-foot -mx-5 mt-2 flex items-center gap-2 px-5 pt-3.5">
            <button
              type="button"
              onClick={() => setIsQuickAddModalOpen(false)}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3.5 text-sm font-bold text-zinc-300"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Log Pending Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
