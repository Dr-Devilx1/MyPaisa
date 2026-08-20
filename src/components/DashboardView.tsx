import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Brain,
  CalendarClock,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings as SettingsIcon,
  Smartphone,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react';
import { useFinancials } from '../state/FinancialContext';
import { MainCategory, FinancialAccountType } from '../types';
import { Logo } from './Logo';

const ACCOUNT_TYPE_ICON: Record<FinancialAccountType, React.ElementType> = {
  bank: Landmark,
  wallet: Smartphone,
  cash: Wallet,
};

/**
 * Dashboard — rebuilt to the layout you asked for.
 *
 *   1. Identity + balance, with a hide toggle, and Add money / Withdraw.
 *   2. Money summary: income in, money out, net, savings, spend per category,
 *      and the AI score board.
 *   3. Fixed monthly liabilities.
 *
 * Every figure here is scoped to the current calendar month, which is what the
 * labels always claimed. The previous version summed every transaction ever
 * recorded under headings that said "Monthly", so the numbers only grew and
 * never reset at month end.
 */

const SPEND_CATEGORIES: MainCategory[] = [
  'Food & Living',
  'Housing & Utilities',
  'Transportation',
  'Shopping & Personal',
  'Health & Medical',
  'Entertainment & Travel',
  'Education & Work',
  'Donations & Charity',
];

const CATEGORY_TONE: Record<string, string> = {
  'Food & Living': '#FF751F',
  'Housing & Utilities': '#3B82F6',
  Transportation: '#8B5CF6',
  'Shopping & Personal': '#EC4899',
  'Health & Medical': '#EF4444',
  'Entertainment & Travel': '#06B6D4',
  'Education & Work': '#F59E0B',
  'Donations & Charity': '#22C55E',
  'Loans & Debts': '#94A3B8',
  OTHERS: '#64748B',
};

const FIELD =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 outline-none focus:border-amber-500';

export const DashboardView: React.FC = () => {
  const {
    userProfile,
    transactions,
    goals,
    fixedObligations,
    accounts,
    totalAccountsBalance,
    netWorth,
    monthlyIncome,
    monthlyExpense,
    monthlyNet,
    financialHealthScore,
    lastMonthHealthScore,
    totalFixedObligationsAmount,
    paidFixedObligationsAmount,
    setActiveTab,
    addTransaction,
    toggleFixedObligationPaid,
    deleteFixedObligation,
    addFixedObligation,
    updateProfile,
  } = useFinancials();

  const cur = userProfile.currencySymbol;
  const hidden = userProfile.hideBalance === true;

  const [sheet, setSheet] = useState<'income' | 'expense' | null>(null);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MainCategory>('Food & Living');
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');

  const [isAddingBill, setIsAddingBill] = useState(false);
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDay, setBillDay] = useState('1');
  const [billError, setBillError] = useState('');

  const heroBalance = accounts.length > 0 ? totalAccountsBalance : netWorth;

  const groupedAccounts = useMemo(() => {
    const groups: Record<FinancialAccountType, number> = { bank: 0, wallet: 0, cash: 0 };
    for (const a of accounts) groups[a.type] += a.balance;
    return groups;
  }, [accounts]);

  const firstName = (userProfile.name || 'there').split(' ')[0];
  const scoreDelta = financialHealthScore - lastMonthHealthScore;

  const categorySpend = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.isPending || t.type !== 'expense') continue;
      const when = new Date(t.date).getTime();
      if (Number.isNaN(when) || when < from) continue;
      const key = t.mainCategory || 'OTHERS';
      totals.set(key, (totals.get(key) ?? 0) + t.amount);
    }

    const rows = [...SPEND_CATEGORIES, 'OTHERS' as MainCategory].map((c) => ({
      category: c,
      amount: totals.get(c) ?? 0,
    }));
    return rows.filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const topSpendMax = categorySpend[0]?.amount ?? 0;
  const totalSaved = useMemo(() => goals.reduce((s, g) => s + g.currentAmount, 0), [goals]);
  const unpaidCount = useMemo(
    () => fixedObligations.filter((o) => !o.isPaid).length,
    [fixedObligations]
  );

  const money = (n: number) => (hidden ? '••••••' : `${cur}${n.toLocaleString()}`);

  const openSheet = (kind: 'income' | 'expense') => {
    setSheet(kind);
    setAmount('');
    setTitle('');
    setCategory('Food & Living');
    setAccountId('');
    setError('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (!sheet) return;

    const mainCategory: MainCategory = sheet === 'income' ? 'Income' : category;
    addTransaction({
      title: title.trim() || (sheet === 'income' ? 'Money added' : 'Money spent'),
      amount: value,
      type: sheet,
      mainCategory,
      subCategory: '',
      category: mainCategory,
      date: new Date().toISOString(),
      paymentMethod: 'Cash',
      accountId: accountId || undefined,
      notes: '',
      tags: [],
    });

    setSheet(null);
  };

  const submitBill = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(billAmount);
    const day = parseInt(billDay, 10);
    if (!billTitle.trim()) {
      setBillError('Give the bill a name.');
      return;
    }
    if (Number.isNaN(value) || value <= 0) {
      setBillError('Enter an amount greater than zero.');
      return;
    }
    if (Number.isNaN(day) || day < 1 || day > 31) {
      setBillError('Due day must be between 1 and 31.');
      return;
    }
    addFixedObligation({
      title: billTitle.trim(),
      amount: value,
      dueDateDay: day,
      category: 'Housing & Utilities',
    });
    setBillTitle('');
    setBillAmount('');
    setBillDay('1');
    setBillError('');
    setIsAddingBill(false);
  };

  return (
    <div className="flex flex-col gap-4 pb-28">
      {/* ===================== 1. IDENTITY + BALANCE ===================== */}
      <section
        className="relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6"
        style={{ background: 'linear-gradient(145deg, #FF8A3D 0%, #FF751F 55%, #E85D0A 100%)' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95">
            {userProfile.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Logo className="h-7 w-7" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
              Welcome back
            </p>
            <p className="mp-clamp-1 text-base font-extrabold text-white">{firstName}</p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="mp-tap flex items-center justify-center rounded-full text-white/85"
            aria-label="Open settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
              {accounts.length > 0 ? 'Total balance' : 'Available balance'}
            </p>
            <p className="mp-num mt-0.5 truncate text-[1.9rem] font-extrabold leading-tight text-white sm:text-4xl">
              {money(heroBalance)}
            </p>
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className="mt-1 text-[11px] font-semibold text-white/80 underline underline-offset-2"
              >
                Across {accounts.length} account{accounts.length === 1 ? '' : 's'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => updateProfile({ hideBalance: !hidden })}
            className="mp-tap mb-1 flex shrink-0 items-center justify-center rounded-full text-white/85"
            aria-label={hidden ? 'Show balance' : 'Hide balance'}
          >
            {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => openSheet('income')}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-3.5 text-sm font-bold text-[#B34400] transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" /> Add money
          </button>
          <button
            type="button"
            onClick={() => openSheet('expense')}
            className="flex items-center justify-center gap-2 rounded-xl bg-black/25 px-3 py-3.5 text-sm font-bold text-white ring-1 ring-white/25 transition-transform active:scale-95"
          >
            <ArrowUpRight className="h-4 w-4" /> Withdraw
          </button>
        </div>
      </section>

      {/* Inline add / withdraw form */}
      {sheet && (
        <form onSubmit={submit} className="mp-card flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">
              {sheet === 'income' ? 'Add money' : 'Record a withdrawal'}
            </h3>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="mp-tap flex items-center justify-center rounded-full mp-text-3"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Amount in ${userProfile.currencyCode}`}
            className={FIELD}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What was it for?"
            className={FIELD}
          />

          {sheet === 'expense' && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MainCategory)}
              className={FIELD}
            >
              {SPEND_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="OTHERS">Others</option>
            </select>
          )}

          {accounts.length > 0 && (
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={FIELD}
            >
              <option value="">Not linked to an account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}

          <button
            type="submit"
            className="mp-brand-bg rounded-xl py-3.5 text-sm font-bold"
            style={{ color: 'var(--brand-ink)' }}
          >
            Save
          </button>
        </form>
      )}

      {/* ===================== YOUR ACCOUNTS (banks, wallets, cash) ===================== */}
      <section className="mp-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WalletCards className="h-4 w-4 mp-brand-fg" />
            <h3 className="text-sm font-bold">Your accounts</h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className="flex items-center gap-0.5 text-[11px] font-bold mp-brand-fg"
          >
            Manage <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {accounts.length === 0 ? (
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 py-4 text-xs font-bold mp-text-2 hover:border-zinc-500"
          >
            <Plus className="h-4 w-4" /> Add your banks, wallets & cash
          </button>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {(['bank', 'wallet', 'cash'] as FinancialAccountType[]).map((t) => {
                const Icon = ACCOUNT_TYPE_ICON[t];
                const label = t === 'bank' ? 'Banks' : t === 'wallet' ? 'Wallets' : 'Cash';
                return (
                  <div key={t} className="mp-inset p-3">
                    <Icon className="h-3.5 w-3.5 mp-text-3" />
                    <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide mp-text-3">{label}</p>
                    <p className="mp-num truncate text-sm font-extrabold">{money(groupedAccounts[t])}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {accounts.map((a) => {
                const Icon = ACCOUNT_TYPE_ICON[a.type];
                return (
                  <div key={a.id} className="flex items-center gap-3 py-1.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                      <Icon className="h-3.5 w-3.5 mp-brand-fg" />
                    </span>
                    <span className="mp-clamp-1 min-w-0 flex-1 text-xs font-semibold">{a.name}</span>
                    <span className="mp-num shrink-0 text-xs font-bold">{money(a.balance)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ===================== 2. THIS MONTH ===================== */}
      <section className="grid grid-cols-2 gap-3">
        <div className="mp-card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </span>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide mp-text-3">Income in</p>
          <p className="mp-num truncate text-lg font-extrabold text-emerald-400">{money(monthlyIncome)}</p>
        </div>

        <div className="mp-card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10">
            <TrendingDown className="h-4 w-4 text-rose-400" />
          </span>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide mp-text-3">Money out</p>
          <p className="mp-num truncate text-lg font-extrabold text-rose-400">{money(monthlyExpense)}</p>
        </div>

        <div className="mp-card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
            <Wallet className="h-4 w-4 text-amber-400" />
          </span>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide mp-text-3">Net this month</p>
          <p className={`mp-num truncate text-lg font-extrabold ${monthlyNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {money(monthlyNet)}
          </p>
        </div>

        <button type="button" onClick={() => setActiveTab('goals')} className="mp-card p-4 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10">
            <PiggyBank className="h-4 w-4 text-cyan-400" />
          </span>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide mp-text-3">Total saved</p>
          <p className="mp-num truncate text-lg font-extrabold text-cyan-400">{money(totalSaved)}</p>
        </button>
      </section>

      {/* ===================== SPEND BY CATEGORY ===================== */}
      <section className="mp-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold">Where it went</h3>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className="flex items-center gap-0.5 text-[11px] font-bold mp-brand-fg"
          >
            Details <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {categorySpend.length === 0 ? (
          <p className="py-6 text-center text-xs mp-text-3">No spending recorded this month yet.</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {categorySpend.slice(0, 6).map((row) => {
              const tone = CATEGORY_TONE[row.category] ?? '#64748B';
              const pct = topSpendMax > 0 ? (row.amount / topSpendMax) * 100 : 0;
              const share = monthlyExpense > 0 ? Math.round((row.amount / monthlyExpense) * 100) : 0;

              return (
                <div key={row.category}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="mp-clamp-1 text-xs font-semibold">{row.category}</span>
                    <span className="mp-num shrink-0 text-xs font-bold">
                      {money(row.amount)}
                      <span className="ml-1.5 font-medium mp-text-3">{share}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================== AI SCORE BOARD ===================== */}
      <section className="mp-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
            <Brain className="h-5 w-5 text-violet-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold">Financial health</h3>
            <p className="text-[11px] mp-text-3">
              {scoreDelta === 0
                ? 'Same as last month'
                : `${scoreDelta > 0 ? '+' : ''}${scoreDelta} vs last month`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="mp-num text-2xl font-extrabold mp-brand-fg">{financialHealthScore}</span>
            <span className="text-xs font-bold mp-text-3">/100</span>
          </div>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(3, financialHealthScore)}%`,
              background:
                financialHealthScore >= 70 ? '#22C55E' : financialHealthScore >= 45 ? '#F59E0B' : '#F43F5E',
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 py-3 text-xs font-bold text-violet-400"
        >
          <Sparkles className="h-4 w-4" /> Ask the assistant
        </button>
      </section>

      {/* ===================== 3. FIXED MONTHLY LIABILITIES ===================== */}
      <section className="mp-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 mp-brand-fg" />
            <h3 className="text-sm font-bold">Fixed monthly liabilities</h3>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="mp-num text-xs font-bold mp-text-2">
              {money(paidFixedObligationsAmount)} / {money(totalFixedObligationsAmount)}
            </span>
            <button
              type="button"
              onClick={() => setIsAddingBill((v) => !v)}
              className="mp-tap flex items-center justify-center rounded-full mp-brand-fg"
              aria-label="Add a recurring bill"
              title="Add a recurring bill"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isAddingBill && (
          <form onSubmit={submitBill} className="mp-inset mb-3 flex flex-col gap-2.5 p-4">
            <input
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              placeholder="e.g. House Rent, Wifi Bill"
              className={FIELD}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="number"
                inputMode="decimal"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder={`Amount (${cur})`}
                className={FIELD}
              />
              <input
                type="number"
                min={1}
                max={31}
                value={billDay}
                onChange={(e) => setBillDay(e.target.value)}
                placeholder="Due day (1-31)"
                className={FIELD}
              />
            </div>
            {billError && <p className="text-xs font-semibold text-rose-400">{billError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingBill(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold mp-text-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="mp-brand-bg rounded-xl px-5 py-2 text-xs font-bold"
                style={{ color: 'var(--brand-ink)' }}
              >
                Save bill
              </button>
            </div>
          </form>
        )}

        {fixedObligations.length === 0 ? (
          <p className="py-6 text-center text-xs mp-text-3">No recurring bills added yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fixedObligations.map((o) => (
              <div key={o.id} className="mp-inset flex items-center gap-3 p-3.5">
                <button
                  type="button"
                  onClick={() => toggleFixedObligationPaid(o.id)}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    o.isPaid ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'
                  }`}
                  aria-label={o.isPaid ? `Mark ${o.title} unpaid` : `Mark ${o.title} paid`}
                >
                  {o.isPaid && <Check className="h-3.5 w-3.5 text-black" />}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`mp-clamp-1 text-xs font-bold ${o.isPaid ? 'line-through mp-text-3' : ''}`}>
                    {o.title}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] mp-text-3">
                    <CalendarClock className="h-3 w-3" /> Day {o.dueDateDay}
                  </p>
                </div>

                <span className={`mp-num shrink-0 text-xs font-bold ${o.isPaid ? 'mp-text-3' : ''}`}>
                  {money(o.amount)}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete "${o.title}"? This cannot be undone.`)) {
                      deleteFixedObligation(o.id);
                    }
                  }}
                  className="mp-tap flex shrink-0 items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400"
                  aria-label={`Delete ${o.title}`}
                  title="Delete bill"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {unpaidCount > 0 && (
          <p className="mt-3 text-[11px] font-semibold text-amber-400">
            {unpaidCount} bill{unpaidCount === 1 ? '' : 's'} still due this month.
          </p>
        )}
      </section>
    </div>
  );
};
