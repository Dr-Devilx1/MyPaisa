import React, { useMemo, useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import { FinancialAccountType } from '../types';
import { Landmark, Smartphone, Wallet, Plus, Trash2, Pencil, Check, X, WalletCards } from 'lucide-react';

const TYPE_META: Record<FinancialAccountType, { label: string; icon: React.ElementType; tone: string }> = {
  bank: { label: 'Bank accounts', icon: Landmark, tone: '#3B82F6' },
  wallet: { label: 'Digital wallets', icon: Smartphone, tone: '#8B5CF6' },
  cash: { label: 'Cash', icon: Wallet, tone: '#22C55E' },
};

const FIELD =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 mp-text';

export const AccountsView: React.FC = () => {
  const { accounts, userProfile, addAccount, renameAccount, setAccountBalance, deleteAccount } = useFinancials();
  const cur = userProfile.currencySymbol;

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<FinancialAccountType>('bank');
  const [newBalance, setNewBalance] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');

  const total = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);

  const grouped = useMemo(() => {
    const byType: Record<FinancialAccountType, typeof accounts> = { bank: [], wallet: [], cash: [] };
    for (const a of accounts) byType[a.type].push(a);
    return byType;
  }, [accounts]);

  const money = (n: number) => `${cur}${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const startEdit = (id: string, name: string, balance: number) => {
    setEditingId(id);
    setEditName(name);
    setEditBalance(String(balance));
  };

  const saveEdit = (id: string) => {
    renameAccount(id, editName);
    const parsed = parseFloat(editBalance);
    if (!Number.isNaN(parsed)) setAccountBalance(id, parsed);
    setEditingId(null);
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addAccount({ name: newName, type: newType, balance: parseFloat(newBalance) || 0 });
    setNewName('');
    setNewBalance('');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300 pb-10">
      {/* Header + grand total */}
      <div className="mp-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <WalletCards className="h-5 w-5 mp-brand-fg" />
          <h2 className="text-lg font-bold">Accounts</h2>
        </div>
        <p className="text-xs mp-text-3 mb-4">
          Every bank, wallet and cash balance in one place.
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide mp-text-3">Total across all accounts</p>
        <p className="mp-num mt-1 truncate text-3xl font-extrabold mp-brand-fg">{money(total)}</p>
      </div>

      {/* Grouped breakdown chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.keys(TYPE_META) as FinancialAccountType[]).map((t) => {
          const meta = TYPE_META[t];
          const Icon = meta.icon;
          const subtotal = grouped[t].reduce((s, a) => s + a.balance, 0);
          return (
            <div key={t} className="mp-card p-4">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${meta.tone}1A` }}
                >
                  <Icon className="h-4 w-4" style={{ color: meta.tone }} />
                </span>
                <span className="mp-clamp-1 text-xs font-semibold mp-text-2">{meta.label}</span>
              </div>
              <p className="mp-num mt-2 truncate text-lg font-extrabold">{money(subtotal)}</p>
              <p className="text-[11px] mp-text-3">{grouped[t].length} account{grouped[t].length === 1 ? '' : 's'}</p>
            </div>
          );
        })}
      </div>

      {/* Account list */}
      <div className="flex flex-col gap-2">
        {accounts.length === 0 ? (
          <div className="mp-card p-8 text-center text-xs mp-text-3">
            No accounts yet. Add your first bank, wallet, or cash balance below.
          </div>
        ) : (
          accounts.map((a) => {
            const meta = TYPE_META[a.type];
            const Icon = meta.icon;
            const isEditing = editingId === a.id;
            return (
              <div key={a.id} className="mp-card flex items-center gap-3 p-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: `${meta.tone}1A` }}
                >
                  <Icon className="h-5 w-5" style={{ color: meta.tone }} />
                </span>

                {isEditing ? (
                  <div className="grid min-w-0 flex-1 grid-cols-1 sm:grid-cols-2 gap-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={FIELD} />
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editBalance}
                      onChange={(e) => setEditBalance(e.target.value)}
                      className={FIELD}
                    />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="mp-clamp-1 text-sm font-bold">{a.name}</p>
                    <p className="text-[11px] mp-text-3">{meta.label}</p>
                  </div>
                )}

                {isEditing ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => saveEdit(a.id)}
                      className="mp-tap flex items-center justify-center rounded-xl text-emerald-500 hover:bg-emerald-500/10"
                      aria-label="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="mp-tap flex items-center justify-center rounded-xl mp-text-3 hover:bg-zinc-800/60"
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="mp-num mr-1 text-sm font-bold">{money(a.balance)}</span>
                    <button
                      type="button"
                      onClick={() => startEdit(a.id, a.name, a.balance)}
                      className="mp-tap flex items-center justify-center rounded-xl mp-text-3 hover:bg-zinc-800/60"
                      aria-label={`Edit ${a.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAccount(a.id)}
                      className="mp-tap flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                      aria-label={`Delete ${a.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add account */}
      {isAdding ? (
        <form onSubmit={submitAdd} className="mp-card flex flex-col gap-3 p-5">
          <h3 className="text-sm font-bold">Add an account</h3>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TYPE_META) as FinancialAccountType[]).map((t) => {
              const meta = TYPE_META[t];
              const Icon = meta.icon;
              const active = newType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewType(t)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-[11px] font-bold transition-all ${
                    active ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-zinc-800 mp-text-3'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {meta.label}
                </button>
              );
            })}
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={newType === 'bank' ? 'e.g. Meezan Bank' : newType === 'wallet' ? 'e.g. NayaPay' : 'e.g. Cash in hand'}
            className={FIELD}
            required
          />
          <input
            type="number"
            inputMode="decimal"
            value={newBalance}
            onChange={(e) => setNewBalance(e.target.value)}
            placeholder={`Current balance (${cur})`}
            className={FIELD}
          />
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold mp-text-3 hover:bg-zinc-800/60"
            >
              Cancel
            </button>
            <button type="submit" className="mp-brand-bg rounded-xl px-5 py-2 text-xs font-bold" style={{ color: 'var(--brand-ink)' }}>
              Save account
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 py-3.5 text-xs font-bold mp-text-2 hover:border-zinc-500"
        >
          <Plus className="h-4 w-4" /> Add account
        </button>
      )}
    </div>
  );
};
