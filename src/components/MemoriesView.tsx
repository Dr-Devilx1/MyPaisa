import React, { useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import {
  Sparkles,
  Trophy,
  History,
  Calendar,
  Flame,
  Plus,
  Trash2,
  Heart,
  Laptop,
  CheckCircle2,
  Award,
  Zap,
  Tag
} from 'lucide-react';
import { FinancialMemory } from '../types';

export const MemoriesView: React.FC = () => {
  const { memories, addMemory, deleteMemory, userProfile } = useFinancials();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Tech & Work');
  const [effortDays, setEffortDays] = useState('90');
  const [effortNote, setEffortNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const isDark = userProfile.themeMode === 'dark';

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount)) return;

    addMemory({
      title: title.trim(),
      date: new Date().toISOString().split('T')[0],
      type: 'goal_completed',
      amount: parsedAmount,
      category,
      effortDays: parseInt(effortDays, 10) || 30,
      effortNote: effortNote.trim() || 'Consistent monthly effort towards financial freedom.',
    });

    setTitle('');
    setAmount('');
    setEffortNote('');
    setIsAdding(false);
  };

  // Find On This Day Flashbacks (memories or major transactions recorded past years/months)
  const todayMonthDay = new Date().toISOString().slice(5, 10); // MM-DD
  const onThisDayMemories = memories.filter((m) => m.date.endsWith(todayMonthDay) || m.type === 'goal_completed');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-16 md:pb-6">
      {/* Header */}
      <div className={`p-7 rounded-[2rem] border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Financial Memory Vault & Effort Milestones
            </h2>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            Celebrate past financial achievements, "On This Day" flashbacks, and effort milestones.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Log Achievement Memory
        </button>
      </div>

      {/* Add Memory Modal / Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateMemory}
          className={`p-6 rounded-[2rem] border shadow-xl flex flex-col gap-4 animate-in slide-in-from-top-4 duration-200 ${
            isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Award className="h-4 w-4 text-amber-500" /> Record New Achievement Memory
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Achievement Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bought M2 Workstation Laptop"
                className={`w-full px-4 py-2.5 text-xs rounded-xl border outline-none ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Amount ({userProfile.currencySymbol}) *</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1400"
                className={`w-full px-4 py-2.5 text-xs font-mono font-bold rounded-xl border outline-none ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Tech & Work / Gadgets"
                className={`w-full px-4 py-2.5 text-xs rounded-xl border outline-none ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block">Effort Duration (Days Saved)</label>
              <input
                type="number"
                value={effortDays}
                onChange={(e) => setEffortDays(e.target.value)}
                placeholder="120"
                className={`w-full px-4 py-2.5 text-xs font-mono rounded-xl border outline-none ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block">Effort Story & Discipline Notes</label>
            <textarea
              rows={2}
              value={effortNote}
              onChange={(e) => setEffortNote(e.target.value)}
              placeholder="e.g. Saved $350 every month from freelance project earnings to acquire laptop without debt."
              className={`w-full p-3 text-xs rounded-xl border outline-none ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400"
            >
              Save Memory
            </button>
          </div>
        </form>
      )}

      {/* On This Day Highlights Section */}
      <div className={`p-6 rounded-[2rem] border shadow-lg bg-gradient-to-br ${
        isDark
          ? 'from-amber-950/30 via-[#131316] to-[#131316] border-amber-500/20'
          : 'from-amber-50 via-white to-slate-50 border-amber-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
          <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            On This Day & Effort Story Highlights
          </h3>
        </div>
        <p className="text-xs text-zinc-500 mb-5">
          "On This Day" flashbacks showcase how your discipline transformed past savings into tangible assets.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className={`p-6 rounded-3xl border relative group transition-all hover:scale-[1.01] ${
                isDark
                  ? 'bg-zinc-900/80 border-zinc-800 hover:border-amber-500/40'
                  : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {mem.title}
                    </h4>
                    <span className="text-[11px] text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {mem.date} • {mem.category}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${mem.title}"? This cannot be undone.`)) {
                      deleteMemory(mem.id);
                    }
                  }}
                  className="mp-tap flex shrink-0 items-center justify-center rounded-xl p-2 text-zinc-500 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 transition-all"
                  title="Remove Memory"
                  aria-label={`Delete ${mem.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Amount & Effort Badge */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 mb-3">
                <span className="flex min-w-0 items-center gap-1 truncate text-xs font-bold text-amber-500">
                  <Zap className="h-3.5 w-3.5 shrink-0" /> Effort: {mem.effortDays || 90} Days Saved
                </span>
                <span className="mp-num shrink-0 text-base font-mono font-bold text-emerald-500">
                  {userProfile.currencySymbol}{mem.amount.toLocaleString()}
                </span>
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                "{mem.effortNote || 'Achieved through consistent budgeting and dedicated financial discipline.'}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
