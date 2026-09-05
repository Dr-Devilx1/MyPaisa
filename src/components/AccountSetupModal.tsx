import React, { useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import { Landmark, Smartphone, Wallet, Plus, Trash2, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { useBackHandler } from '../lib/useBackButton';

type Row = { name: string; balance: string };

const emptyRow = (): Row => ({ name: '', balance: '' });

const FIELD =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 mp-text';

/**
 * Runs once for a new user (or after a full data reset): asks how many bank
 * accounts they have and their balances, then digital wallets, then cash in
 * hand. This is the "how much money do I actually have" setup the dashboard
 * total depends on.
 */
export const AccountSetupModal: React.FC = () => {
  const { needsAccountSetup, completeAccountSetup, skipAccountSetup, userProfile } = useFinancials();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [banks, setBanks] = useState<Row[]>([emptyRow()]);
  const [wallets, setWallets] = useState<Row[]>([emptyRow()]);
  const [cash, setCash] = useState('');

  // Back walks the wizard in reverse; from the first step it does what the
  // visible "Skip for now" button does, so the phone button is never a dead end.
  useBackHandler(needsAccountSetup, () => {
    if (step > 0) setStep((s) => (s - 1) as 0 | 1 | 2);
    else skipAccountSetup();
  });

  if (!needsAccountSetup) return null;

  const cur = userProfile.currencySymbol;

  const updateRow = (rows: Row[], set: (r: Row[]) => void, i: number, field: keyof Row, value: string) => {
    set(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const finish = () => {
    completeAccountSetup({
      banks: banks.map((b) => ({ name: b.name, balance: parseFloat(b.balance) || 0 })),
      wallets: wallets.map((w) => ({ name: w.name, balance: parseFloat(w.balance) || 0 })),
      cash: parseFloat(cash) || 0,
    });
  };

  const steps = [
    {
      key: 'banks',
      icon: Landmark,
      title: 'Aap ke bank accounts',
      subtitle: 'Kitne bank accounts hain? Har ek ka naam aur current balance daalein.',
      rows: banks,
      setRows: setBanks,
      placeholder: 'e.g. Meezan Bank',
    },
    {
      key: 'wallets',
      icon: Smartphone,
      title: 'Digital wallets',
      subtitle: 'NayaPay, JazzCash, EasyPaisa waghera — jitne hain sab add karein.',
      rows: wallets,
      setRows: setWallets,
      placeholder: 'e.g. NayaPay, JazzCash',
    },
  ] as const;

  return (
    <div className="mp-modal-wrap bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="mp-modal mp-text">
        <div className="mp-modal-head flex items-center justify-between p-5">
          <div>
            <h3 className="text-base font-bold">Let's set up your money</h3>
            <p className="text-[11px] mp-text-3 mt-0.5">Step {step + 1} of 3</p>
          </div>
          <button
            type="button"
            onClick={skipAccountSetup}
            className="mp-tap flex items-center justify-center rounded-full mp-text-3"
            aria-label="Skip setup"
            title="Skip for now"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mp-modal-body p-5 flex flex-col gap-4">
          {/* Step indicator dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{ background: i <= step ? 'var(--brand)' : 'var(--surface-3)' }}
              />
            ))}
          </div>

          {step < 2 ? (
            <>
              {(() => {
                const s = steps[step as 0 | 1];
                const Icon = s.icon;
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                        <Icon className="h-5 w-5 mp-brand-fg" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold">{s.title}</h4>
                        <p className="text-[11px] mp-text-3">{s.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {s.rows.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="grid min-w-0 flex-1 grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={row.name}
                              onChange={(e) => updateRow(s.rows, s.setRows, i, 'name', e.target.value)}
                              placeholder={s.placeholder}
                              className={FIELD}
                            />
                            <input
                              type="number"
                              inputMode="decimal"
                              value={row.balance}
                              onChange={(e) => updateRow(s.rows, s.setRows, i, 'balance', e.target.value)}
                              placeholder={`Balance (${cur})`}
                              className={FIELD}
                            />
                          </div>
                          {s.rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => s.setRows(s.rows.filter((_, idx) => idx !== i))}
                              className="mp-tap flex shrink-0 items-center justify-center rounded-xl text-rose-400 hover:bg-rose-500/10"
                              aria-label="Remove row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => s.setRows([...s.rows, emptyRow()])}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 py-2.5 text-xs font-bold mp-text-2 hover:border-zinc-500"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add another
                      </button>
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                  <Wallet className="h-5 w-5 mp-brand-fg" />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold">Cash in hand</h4>
                  <p className="text-[11px] mp-text-3">Abhi aap ke paas cash mein kitna hai?</p>
                </div>
              </div>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder={`Amount in ${cur}`}
                className={FIELD}
              />
            </>
          )}
        </div>

        <div className="mp-modal-foot flex items-center justify-between gap-3 p-5">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold mp-text-2 hover:bg-zinc-800/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={skipAccountSetup}
              className="rounded-xl px-4 py-2.5 text-xs font-bold mp-text-3 hover:bg-zinc-800/60"
            >
              Skip for now
            </button>
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 0 | 1 | 2)}
              className="mp-brand-bg flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold"
              style={{ color: 'var(--brand-ink)' }}
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="mp-brand-bg rounded-xl px-5 py-2.5 text-xs font-bold"
              style={{ color: 'var(--brand-ink)' }}
            >
              Finish setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
