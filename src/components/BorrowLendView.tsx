import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CalendarClock,
  Check,
  ChevronLeft,
  HandCoins,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useFinancials } from '../state/FinancialContext';
import { BorrowLendEntry, BorrowLendItem } from '../types';

/**
 * Borrow & Lend ledger.
 *
 * ============================================================================
 *  BUGS FIXED HERE — all four were invisible to `tsc` because @types/react was
 *  never installed, so `useFinancials()` returned `any` and every call site in
 *  the app went completely unchecked.
 * ============================================================================
 *
 *  1. RECORDING A PAYMENT DID NOTHING.
 *         addBorrowLendEntry(activeActionId, amt, 'repayment', note)
 *     The signature is (personId, entryType, amount, notes). Amount and entry
 *     type were passed in the wrong order, AND the string was 'repayment' where
 *     the union only accepts 'repaid'. So `entryType` arrived as a number,
 *     matched none of the branches in the reducer, and no balance ever moved.
 *     Waive-off appeared to work only because it went through a different
 *     helper that happened to pass its arguments correctly.
 *
 *  2. EVERY HISTORY ROW WAS MISLABELLED.
 *     The list compared `entry.type === 'initial'` and `=== 'repayment'`.
 *     Neither value exists — the union is 'lent' | 'borrowed' | 'repaid' |
 *     'waived'. No comparison ever matched.
 *
 *  3. THE REASON TEXT NEVER APPEARED.
 *     It read `entry.note`; the field is `entry.notes`. Silently undefined, so
 *     the "why" behind each movement was never shown.
 *
 *  4. `waivedAmount` IS OPTIONAL and was used unguarded in three arithmetic
 *     expressions, producing NaN for records created before the field existed.
 */

type ActionKind = 'repaid' | 'waived' | 'again';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Outstanding balance, safe against the optional `waivedAmount`. */
export function outstandingOf(item: BorrowLendItem): number {
  return Math.max(0, item.totalAmount - item.repaidAmount - (item.waivedAmount ?? 0));
}

const ENTRY_META: Record<
  BorrowLendEntry['type'],
  { label: string; tone: string; ring: string; Icon: typeof ArrowUpRight; sign: '+' | '-' }
> = {
  lent: { label: 'Lent out', tone: 'text-amber-400', ring: 'bg-amber-500/10', Icon: ArrowUpRight, sign: '+' },
  borrowed: { label: 'Borrowed', tone: 'text-amber-400', ring: 'bg-amber-500/10', Icon: ArrowDownLeft, sign: '+' },
  repaid: { label: 'Payment', tone: 'text-emerald-400', ring: 'bg-emerald-500/10', Icon: Check, sign: '-' },
  waived: { label: 'Waived off', tone: 'text-zinc-400', ring: 'bg-zinc-500/10', Icon: Ban, sign: '-' },
};

const FIELD =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 outline-none focus:border-amber-500';

export const BorrowLendView: React.FC = () => {
  const {
    borrowLend,
    addBorrowLendItem,
    addBorrowLendEntry,
    deleteBorrowLendItem,
    userProfile,
  } = useFinancials();

  const cur = userProfile.currencySymbol;

  const [openId, setOpenId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [error, setError] = useState('');

  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<'lent' | 'borrowed'>('lent');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const active = useMemo(
    () => borrowLend.find((b) => b.id === openId) ?? null,
    [borrowLend, openId]
  );

  const totals = useMemo(() => {
    let receive = 0;
    let pay = 0;
    for (const b of borrowLend) {
      const out = outstandingOf(b);
      if (b.type === 'lent') receive += out;
      else pay += out;
    }
    return { receive, pay, net: receive - pay };
  }, [borrowLend]);

  const closeAction = () => {
    setAction(null);
    setAmountInput('');
    setNoteInput('');
    setError('');
  };

  const submitAction = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!active || !action) return;

    const amt = parseFloat(amountInput);
    if (Number.isNaN(amt) || amt <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    const outstanding = outstandingOf(active);
    if ((action === 'repaid' || action === 'waived') && amt > outstanding) {
      setError(`That is more than the ${cur}${outstanding.toLocaleString()} still outstanding.`);
      return;
    }

    if (action === 'again') {
      addBorrowLendEntry(
        active.id,
        active.type,
        amt,
        noteInput.trim() || (active.type === 'lent' ? 'Lent again' : 'Borrowed again')
      );
    } else {
      // FIXED ARGUMENT ORDER: (personId, entryType, amount, notes)
      addBorrowLendEntry(
        active.id,
        action,
        amt,
        noteInput.trim() || (action === 'repaid' ? 'Payment recorded' : 'Amount waived off')
      );
    }

    closeAction();
  };

  const submitNewRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amount = parseFloat(totalAmount);
    if (!personName.trim()) {
      setError("Enter the person's name.");
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    addBorrowLendItem({
      personName: personName.trim(),
      type,
      totalAmount: amount,
      dueDate,
      contactPhone: phone.trim(),
      notes: notes.trim(),
    });
    setPersonName('');
    setTotalAmount('');
    setPhone('');
    setNotes('');
    setIsAdding(false);
  };

  /* ------------------------------ detail view ----------------------------- */

  if (active) {
    const outstanding = outstandingOf(active);
    const waived = active.waivedAmount ?? 0;
    const isLent = active.type === 'lent';
    const entries = [...(active.entries ?? [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
      <div className="flex flex-col gap-5 pb-28">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setOpenId(null); closeAction(); }}
            className="mp-tap flex items-center justify-center rounded-full text-zinc-400"
            aria-label="Back to list"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="mp-clamp-1 text-lg font-bold tracking-tight">{active.personName}</h2>
          <span
            className={`ml-auto shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
              active.status === 'settled'
                ? 'bg-emerald-500/10 text-emerald-400'
                : isLent
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            {active.status === 'settled' ? 'Settled' : isLent ? 'Owes you' : 'You owe'}
          </span>
        </div>

        <div className="mp-card p-6">
          <span className="text-xs font-semibold uppercase tracking-wide mp-text-3">Outstanding</span>
          <p className={`mp-num mt-1 text-3xl font-extrabold ${isLent ? 'text-emerald-400' : 'text-rose-400'}`}>
            {cur}{outstanding.toLocaleString()}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              { label: 'Total', value: active.totalAmount },
              { label: 'Paid', value: active.repaidAmount },
              { label: 'Waived', value: waived },
            ].map((s) => (
              <div key={s.label} className="mp-inset p-3">
                <span className="block text-[11px] font-semibold uppercase mp-text-3">{s.label}</span>
                <span className="mp-num text-sm font-bold">{cur}{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {active.dueDate && (
            <p className="mt-4 flex items-center gap-1.5 text-xs mp-text-2">
              <CalendarClock className="h-3.5 w-3.5" /> Due {fmtDate(active.dueDate)}
            </p>
          )}
          {active.notes && <p className="mt-2 text-xs mp-text-2">{active.notes}</p>}
        </div>

        {/* The three actions */}
        <div className="grid grid-cols-3 gap-2.5">
          {([
            { key: 'repaid', label: 'Paid', Icon: Check, cls: 'text-emerald-400' },
            { key: 'waived', label: 'Waive off', Icon: Ban, cls: 'text-zinc-400' },
            { key: 'again', label: isLent ? 'Lent again' : 'Borrowed again', Icon: HandCoins, cls: 'text-amber-400' },
          ] as const).map(({ key, label, Icon, cls }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setAction(key); setAmountInput(''); setNoteInput(''); setError(''); }}
              disabled={key !== 'again' && outstanding <= 0}
              className="mp-card flex flex-col items-center gap-2 px-2 py-4 text-center transition-transform active:scale-95 disabled:opacity-40"
            >
              <Icon className={`h-5 w-5 ${cls}`} />
              <span className="text-[11px] font-bold leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {action && (
          <form onSubmit={submitAction} className="mp-card flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {action === 'repaid'
                  ? 'Record a payment'
                  : action === 'waived'
                  ? 'Waive off an amount'
                  : 'Add a new amount'}
              </h3>
              <button type="button" onClick={closeAction} className="mp-tap flex items-center justify-center rounded-full mp-text-3" aria-label="Cancel">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold mp-text-2">Amount</label>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0"
                className={FIELD}
              />
              {(action === 'repaid' || action === 'waived') && (
                <button
                  type="button"
                  onClick={() => setAmountInput(String(outstanding))}
                  className="mt-1.5 text-[11px] font-semibold text-amber-400"
                >
                  Use full outstanding ({cur}{outstanding.toLocaleString()})
                </button>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold mp-text-2">Reason / note</label>
              <input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={
                  action === 'repaid'
                    ? 'e.g. paid by bank transfer'
                    : action === 'waived'
                    ? 'e.g. forgiven, family'
                    : 'e.g. emergency loan'
                }
                className={FIELD}
              />
            </div>

            {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}

            <button type="submit" className="mp-brand-bg rounded-xl py-3 text-sm font-bold" style={{ color: 'var(--brand-ink)' }}>
              Save
            </button>
          </form>
        )}

        <div className="mp-card p-5">
          <h3 className="mb-3 text-sm font-bold">History</h3>
          {entries.length === 0 ? (
            <p className="py-6 text-center text-xs mp-text-3">No activity recorded yet.</p>
          ) : (
            <ol className="flex flex-col">
              {entries.map((entry, i) => {
                const meta = ENTRY_META[entry.type];
                const Icon = meta.Icon;
                return (
                  <li key={entry.id} className="flex gap-3 py-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.ring}`}>
                        <Icon className={`h-4 w-4 ${meta.tone}`} />
                      </span>
                      {i < entries.length - 1 && <span className="mt-1 w-px flex-1 bg-zinc-800" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-bold">{meta.label}</span>
                        <span className={`mp-num shrink-0 text-sm font-bold ${meta.tone}`}>
                          {meta.sign}{cur}{entry.amount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] mp-text-3">
                        {fmtDate(entry.date)} at {fmtTime(entry.date)}
                      </p>
                      {/* FIXED: previously read `entry.note`, which does not exist */}
                      {entry.notes && <p className="mt-1 text-xs mp-text-2">{entry.notes}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <button
          type="button"
          onClick={() => { deleteBorrowLendItem(active.id); setOpenId(null); }}
          className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 py-3 text-xs font-bold uppercase tracking-wide text-rose-400"
        >
          <Trash2 className="h-4 w-4" /> Delete this record
        </button>
      </div>
    );
  }

  /* -------------------------------- list view ----------------------------- */

  return (
    <div className="flex flex-col gap-5 pb-28">
      <div className="mp-card p-6">
        <h2 className="text-lg font-bold tracking-tight">Borrow &amp; Lend</h2>
        <p className="mt-0.5 text-xs mp-text-3">
          Tap anyone to record a payment, waive off, or add more.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="mp-inset p-3">
            <span className="block text-[11px] font-semibold uppercase mp-text-3">To receive</span>
            <span className="mp-num text-sm font-bold text-emerald-400">{cur}{totals.receive.toLocaleString()}</span>
          </div>
          <div className="mp-inset p-3">
            <span className="block text-[11px] font-semibold uppercase mp-text-3">To pay</span>
            <span className="mp-num text-sm font-bold text-rose-400">{cur}{totals.pay.toLocaleString()}</span>
          </div>
          <div className="mp-inset p-3">
            <span className="block text-[11px] font-semibold uppercase mp-text-3">Net</span>
            <span className={`mp-num text-sm font-bold ${totals.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cur}{Math.abs(totals.net).toLocaleString()}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setIsAdding(true); setError(''); }}
          className="mp-brand-bg mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold"
          style={{ color: 'var(--brand-ink)' }}
        >
          <Plus className="h-4 w-4" /> New record
        </button>
      </div>

      {isAdding && (
        <form onSubmit={submitNewRecord} className="mp-card flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">New borrow / lend record</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="mp-tap flex items-center justify-center rounded-full mp-text-3" aria-label="Cancel">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('lent')}
              className={`rounded-xl py-3 text-xs font-bold ${
                type === 'lent' ? 'bg-emerald-500 text-black' : 'border border-zinc-800 bg-zinc-900 text-zinc-300'
              }`}
            >
              I lent money
            </button>
            <button
              type="button"
              onClick={() => setType('borrowed')}
              className={`rounded-xl py-3 text-xs font-bold ${
                type === 'borrowed' ? 'bg-rose-500 text-white' : 'border border-zinc-800 bg-zinc-900 text-zinc-300'
              }`}
            >
              I borrowed
            </button>
          </div>

          <input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Person's name" className={FIELD} />
          <input type="number" inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="Amount" className={FIELD} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={FIELD} />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className={FIELD} />
          </div>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason (optional)" className={FIELD} />

          {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}

          <button type="submit" className="mp-brand-bg rounded-xl py-3 text-sm font-bold" style={{ color: 'var(--brand-ink)' }}>
            Save record
          </button>
        </form>
      )}

      {borrowLend.length === 0 ? (
        <div className="mp-card px-6 py-12 text-center">
          <HandCoins className="mx-auto mb-3 h-9 w-9 text-amber-400" />
          <p className="text-sm font-bold">Nothing recorded yet</p>
          <p className="mt-1 text-xs mp-text-3">Add anyone who owes you, or anyone you owe.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {borrowLend.map((item) => {
            const out = outstandingOf(item);
            const isLent = item.type === 'lent';
            const settledPart = item.repaidAmount + (item.waivedAmount ?? 0);
            const pct = item.totalAmount > 0 ? Math.min(100, (settledPart / item.totalAmount) * 100) : 0;
            const count = (item.entries ?? []).length;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenId(item.id)}
                className="mp-card w-full p-4 text-left transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isLent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {item.personName.charAt(0).toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="mp-clamp-1 text-sm font-bold">{item.personName}</p>
                    <p className="text-[11px] mp-text-3">
                      {item.status === 'settled' ? 'Settled' : isLent ? 'Owes you' : 'You owe'}
                      {' · '}
                      {count} {count === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={`mp-num text-sm font-bold ${isLent ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {cur}{out.toLocaleString()}
                    </p>
                    <p className="text-[11px] mp-text-3">of {cur}{item.totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${isLent ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
