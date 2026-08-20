import React, { useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import {
  Utensils,
  Coffee,
  Shirt,
  Bus,
  Home,
  Plus,
  Trash2,
  Sparkles,
  TrendingDown,
  Calendar,
  AlertCircle,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';

export const HostelModeView: React.FC = () => {
  const { hostelEntries, addHostelEntry, deleteHostelEntry, userProfile } = useFinancials();
  const isDark = userProfile.themeMode === 'dark';

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [entryDate, setEntryDate] = useState(todayStr);
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [dinner, setDinner] = useState('');
  const [tea, setTea] = useState('');
  const [laundry, setLaundry] = useState('');
  const [transport, setTransport] = useState('');
  const [messFee, setMessFee] = useState('');
  const [notes, setNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const numBf = parseFloat(breakfast) || 0;
  const numLu = parseFloat(lunch) || 0;
  const numDi = parseFloat(dinner) || 0;
  const numTea = parseFloat(tea) || 0;
  const numLau = parseFloat(laundry) || 0;
  const numTr = parseFloat(transport) || 0;
  const numMess = parseFloat(messFee) || 0;

  const dailyTotal = numBf + numLu + numDi + numTea + numLau + numTr + numMess;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dailyTotal <= 0) return;

    addHostelEntry({
      date: entryDate,
      breakfastAmount: numBf,
      lunchAmount: numLu,
      dinnerAmount: numDi,
      teaAmount: numTea,
      laundryAmount: numLau,
      transportAmount: numTr,
      messFeeAmount: numMess,
      breakfastNotes: notes,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);

    // Reset inputs
    setBreakfast('');
    setLunch('');
    setDinner('');
    setTea('');
    setLaundry('');
    setTransport('');
    setMessFee('');
    setNotes('');
  };

  // Monthly aggregated totals
  const totalHostelSpent = hostelEntries.reduce(
    (sum, e) =>
      sum +
      e.breakfastAmount +
      e.lunchAmount +
      e.dinnerAmount +
      e.teaAmount +
      e.laundryAmount +
      e.transportAmount +
      e.messFeeAmount,
    0
  );

  const totalTeaSpent = hostelEntries.reduce((sum, e) => sum + e.teaAmount, 0);
  const totalLaundrySpent = hostelEntries.reduce((sum, e) => sum + e.laundryAmount, 0);
  const totalFoodSpent = hostelEntries.reduce(
    (sum, e) => sum + e.breakfastAmount + e.lunchAmount + e.dinnerAmount,
    0
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-16 md:pb-6">
      {/* Header Banner */}
      <div
        className={`p-6 rounded-[2rem] border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
          isDark
            ? 'bg-gradient-to-r from-amber-950/40 via-[#131316] to-[#09090B] border-amber-900/30'
            : 'bg-gradient-to-r from-amber-500/10 via-white to-orange-50 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shadow-inner">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Hostel Life Expense Manager
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold border border-amber-500/30">
                AI Health & Budget Mode
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Track daily Mess, Tea, Meals, Transport & Laundry with smart AI savings & nutrition advice.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className={`px-4 py-2 rounded-2xl border text-right ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total Hostel Expense</span>
            <span className="mp-num text-lg font-extrabold text-amber-500">
              {userProfile.currencySymbol}
              {totalHostelSpent.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col (Span 2): Daily Log Form & Recent Entries */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Daily Tracker Card */}
          <div
            className={`p-6 rounded-[2rem] border shadow-xl transition-all ${
              isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                  Record Today's Hostel Log
                </h2>
              </div>

              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
              />
            </div>

            {savedSuccess && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Hostel entry saved & synced with main expense transactions!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Inputs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Breakfast */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Utensils className="h-3.5 w-3.5 text-amber-400" /> Breakfast
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-500">{userProfile.currencySymbol}</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={breakfast}
                      onChange={(e) => setBreakfast(e.target.value)}
                      className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-bold ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Lunch */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Utensils className="h-3.5 w-3.5 text-orange-400" /> Lunch
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-500">{userProfile.currencySymbol}</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={lunch}
                      onChange={(e) => setLunch(e.target.value)}
                      className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-bold ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Dinner */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Utensils className="h-3.5 w-3.5 text-red-400" /> Dinner
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-500">{userProfile.currencySymbol}</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={dinner}
                      onChange={(e) => setDinner(e.target.value)}
                      className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-bold ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Tea & Snacks */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Coffee className="h-3.5 w-3.5 text-amber-500" /> Tea & Snacks
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-500">{userProfile.currencySymbol}</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={tea}
                      onChange={(e) => setTea(e.target.value)}
                      className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-bold ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Laundry */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Shirt className="h-3.5 w-3.5 text-sky-400" /> Laundry
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-500">{userProfile.currencySymbol}</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={laundry}
                      onChange={(e) => setLaundry(e.target.value)}
                      className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-bold ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Transport */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Bus className="h-3.5 w-3.5 text-emerald-400" /> Transport
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-500">{userProfile.currencySymbol}</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-bold ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Mess Fee / Contribution */}
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                  <Home className="h-3.5 w-3.5 text-indigo-400" /> Monthly Mess Fee / Contribution
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-500">{userProfile.currencySymbol}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={messFee}
                    onChange={(e) => setMessFee(e.target.value)}
                    className={`w-full pl-6 pr-2 py-1.5 rounded-xl border text-xs font-bold ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>
              </div>

              {/* Remarks/Notes */}
              <input
                type="text"
                placeholder="Optional notes (e.g. Tea at canteen with friends, monthly laundry token...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-zinc-50 border-zinc-300 text-zinc-800'
                }`}
              />

              {/* Submit & Total Banner */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-zinc-500 font-bold uppercase">Daily Total:</span>
                  <span className="text-xl font-extrabold text-amber-500">
                    {userProfile.currencySymbol}
                    {dailyTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={dailyTotal <= 0}
                  className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Save Daily Log
                </button>
              </div>
            </form>
          </div>

          {/* Past Entries List */}
          <div
            className={`p-6 rounded-[2rem] border shadow-xl transition-all ${
              isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-slate-200/90'
            }`}
          >
            <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
              Recent Hostel Activity Logs
            </h2>

            {hostelEntries.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                No hostel logs recorded yet. Add your daily meals or tea expenses above!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {hostelEntries.slice(0, 10).map((entry) => {
                  const entrySum =
                    entry.breakfastAmount +
                    entry.lunchAmount +
                    entry.dinnerAmount +
                    entry.teaAmount +
                    entry.laundryAmount +
                    entry.transportAmount +
                    entry.messFeeAmount;

                  return (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-zinc-300">{entry.date}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Hostel Log
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
                          {entry.breakfastAmount > 0 && <span>Bf: {userProfile.currencySymbol}{entry.breakfastAmount}</span>}
                          {entry.lunchAmount > 0 && <span>Lu: {userProfile.currencySymbol}{entry.lunchAmount}</span>}
                          {entry.dinnerAmount > 0 && <span>Di: {userProfile.currencySymbol}{entry.dinnerAmount}</span>}
                          {entry.teaAmount > 0 && <span>Tea: {userProfile.currencySymbol}{entry.teaAmount}</span>}
                          {entry.laundryAmount > 0 && <span>Lau: {userProfile.currencySymbol}{entry.laundryAmount}</span>}
                          {entry.transportAmount > 0 && <span>Tr: {userProfile.currencySymbol}{entry.transportAmount}</span>}
                          {entry.messFeeAmount > 0 && <span>Mess: {userProfile.currencySymbol}{entry.messFeeAmount}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-extrabold text-amber-500">
                          {userProfile.currencySymbol}
                          {entrySum.toLocaleString()}
                        </span>
                        <button
                          onClick={() => deleteHostelEntry(entry.id)}
                          className="p-1.5 rounded-xl hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col (Span 1): AI Healthier & Cheaper Recommendations */}
        <div className="flex flex-col gap-6">
          <div
            className={`p-6 rounded-[2rem] border shadow-xl transition-all ${
              isDark
                ? 'bg-gradient-to-br from-[#18181B] via-[#131316] to-[#09090B] border-amber-500/30'
                : 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-500/20">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                AI Health & Savings Suggestions
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              {/* Tea & Snack Tip */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-amber-200/80'}`}>
                <div className="flex items-center gap-2 mb-1.5 text-amber-500 text-xs font-bold">
                  <Coffee className="h-4 w-4" />
                  <span>Tea Stall Optimization</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You spent <strong className="text-amber-400">{userProfile.currencySymbol}{totalTeaSpent}</strong> on canteen tea/snacks.
                  Replacing afternoon fried samosas with boiled eggs or oats can save up to <strong>35%</strong> monthly while boosting protein intake!
                </p>
              </div>

              {/* Laundry Tip */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-amber-200/80'}`}>
                <div className="flex items-center gap-2 mb-1.5 text-sky-400 text-xs font-bold">
                  <Shirt className="h-4 w-4" />
                  <span>Laundry Bulk Savings</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Combine laundry tokens with room-mates for full washer loads. Bulk washing reduces monthly laundry expenses by roughly <strong>40%</strong>.
                </p>
              </div>

              {/* Mess Fee vs Outside Food Tip */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-amber-200/80'}`}>
                <div className="flex items-center gap-2 mb-1.5 text-emerald-400 text-xs font-bold">
                  <Utensils className="h-4 w-4" />
                  <span>Mess Meal Utilization</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Missing mess dinners to order fast food adds an average of <strong>{userProfile.currencySymbol}45/week</strong> in avoidable expenses.
                  Attending mess meals consistently keeps food budget steady!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
