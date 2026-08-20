import React, { useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import { Target, Plus, Shield, Laptop, Plane, Trophy, Trash2, ArrowUpRight, ArrowDownLeft, HandCoins } from 'lucide-react';

export const GoalsView: React.FC = () => {
  const { goals, addGoal, contributeToGoal, withdrawFromGoal, deleteGoal, userProfile } = useFinancials();

  const isDark = userProfile.themeMode === 'dark';

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
  );
  const [category, setCategory] = useState('Emergency');
  const [notes, setNotes] = useState('');

  // Contribution / Withdrawal Modal State
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [fundAmount, setFundAmount] = useState('');

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const curr = parseFloat(currentAmount) || 0;
    if (title.trim() && !isNaN(target) && target > 0) {
      addGoal({
        title,
        targetAmount: target,
        currentAmount: curr,
        deadline,
        category,
        icon: 'Target',
        color: '#10B981',
        notes,
      });
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('0');
      setNotes('');
      setIsAdding(false);
    }
  };

  const handleFundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fundAmount);
    if (selectedGoalId && !isNaN(amt) && amt > 0) {
      if (actionType === 'deposit') {
        contributeToGoal(selectedGoalId, amt);
      } else {
        withdrawFromGoal(selectedGoalId, amt);
      }
      setFundAmount('');
      setSelectedGoalId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-16 md:pb-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-7 rounded-[2rem] border shadow-xl transition-colors ${
        isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-5 w-5 text-indigo-500" />
            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Savings & Financial Goals
            </h2>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            Set clear targets for emergency funds, major purchases, or future vacations with deposit and withdrawal tracking.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all uppercase tracking-wider"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? 'Close Form' : 'Create New Goal'}
        </button>
      </div>

      {/* Add Goal Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateGoal}
          className={`rounded-[2rem] border p-7 shadow-xl flex flex-col gap-4 animate-in slide-in-from-top-2 ${
            isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          <h3 className={`text-sm font-bold border-b pb-2 ${isDark ? 'text-white border-zinc-800' : 'text-zinc-900 border-zinc-200'}`}>
            Define Goal Target
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Goal Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. House Down Payment"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-600' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                }`}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">
                Target Amount ({userProfile.currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 10000"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-bold focus:border-indigo-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                }`}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Initial Savings Deposit</label>
              <input
                type="number"
                step="0.01"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Target Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">Notes / Plan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Save $500 every paycheck into high-yield savings."
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:outline-none ${
                isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-600' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
              }`}
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 uppercase tracking-wider"
            >
              Save Goal
            </button>
          </div>
        </form>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((g) => {
          const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
          const remaining = Math.max(0, g.targetAmount - g.currentAmount);

          return (
            <div
              key={g.id}
              className={`rounded-[2rem] border p-6 shadow-xl flex flex-col justify-between transition-colors ${
                isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-500 border border-indigo-500/30">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{g.title}</h3>
                      <span className="text-[11px] text-zinc-500 font-mono">Target Date: {g.deadline}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteGoal(g.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-zinc-800 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="my-4">
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className={`mp-num truncate text-3xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {userProfile.currencySymbol}
                      {g.currentAmount.toLocaleString()}
                    </span>
                    <span className="mp-num shrink-0 text-xs font-bold text-indigo-500">{percent}%</span>
                  </div>

                  <div className={`w-full h-2.5 rounded-full overflow-hidden border ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                  }`}>
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between gap-2 text-[11px] text-zinc-500 font-mono mt-3">
                    <span className="mp-num truncate">
                      Target: {userProfile.currencySymbol}
                      {g.targetAmount.toLocaleString()}
                    </span>
                    <span className="mp-num shrink-0">
                      Rem: {userProfile.currencySymbol}
                      {remaining.toLocaleString()}
                    </span>
                  </div>
                </div>

                {g.notes && <p className="text-xs text-zinc-500 italic mb-4">"{g.notes}"</p>}
              </div>

              {/* Deposit and Withdrawal Actions */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-zinc-800/60">
                <button
                  onClick={() => {
                    setSelectedGoalId(g.id);
                    setActionType('deposit');
                  }}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Deposit
                </button>
                <button
                  onClick={() => {
                    setSelectedGoalId(g.id);
                    setActionType('withdraw');
                  }}
                  className={`rounded-xl border py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-rose-400 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 text-rose-600 hover:bg-zinc-200'
                  }`}
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  Withdraw
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fund Action Modal (Deposit or Withdrawal) */}
      {selectedGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
            isDark ? 'border-zinc-800 bg-[#09090B] text-white' : 'border-zinc-200 bg-white text-zinc-900'
          }`}>
            <h3 className="text-sm font-bold mb-1">
              {actionType === 'deposit' ? 'Deposit Funds to Savings Goal' : 'Withdraw Funds from Savings Goal'}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              {actionType === 'deposit' ? 'Add funds towards reaching your goal.' : 'Deduct funds from this goal target.'}
            </p>

            <form onSubmit={handleFundSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">
                  Amount ({userProfile.currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="e.g. 250"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold focus:border-indigo-500 focus:outline-none ${
                    isDark ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 bg-zinc-50 text-black'
                  }`}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedGoalId(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-5 py-2 text-xs font-bold text-white ${
                    actionType === 'deposit' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-rose-600 text-white hover:bg-rose-500'
                  }`}
                >
                  Confirm {actionType === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

