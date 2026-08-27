import React, { useMemo, useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import {
  Package,
  PackagePlus,
  PackageMinus,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';

const FIELD =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 mp-text';

function startOfThisMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export const ItemTrackerView: React.FC = () => {
  const { trackedItems, addTrackedItem, restockItem, consumeItem, deleteTrackedItem, userProfile } = useFinancials();
  const cur = userProfile.currencySymbol;

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('packs');
  const [newQty, setNewQty] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<'restock' | 'consume'>('restock');
  const [actionQty, setActionQty] = useState('');
  const [actionCost, setActionCost] = useState('');

  const monthStart = useMemo(startOfThisMonth, []);

  const monthlySummary = useMemo(() => {
    let consumedUnits = 0;
    let spentRestocking = 0;
    for (const item of trackedItems) {
      for (const log of item.logs) {
        const d = new Date(log.date);
        if (d < monthStart) continue;
        if (log.type === 'consume') consumedUnits += log.quantity;
        if (log.type === 'restock' && log.cost) spentRestocking += log.cost;
      }
    }
    return { consumedUnits, spentRestocking };
  }, [trackedItems, monthStart]);

  const monthlyConsumedFor = (itemId: string) => {
    const item = trackedItems.find((it) => it.id === itemId);
    if (!item) return 0;
    return item.logs
      .filter((l) => l.type === 'consume' && new Date(l.date) >= monthStart)
      .reduce((sum, l) => sum + l.quantity, 0);
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addTrackedItem({ name: newName, unit: newUnit || 'pcs', initialQuantity: parseFloat(newQty) || 0 });
    setNewName('');
    setNewUnit('packs');
    setNewQty('');
    setIsAdding(false);
  };

  const openAction = (itemId: string, mode: 'restock' | 'consume') => {
    setActionId(itemId);
    setActionMode(mode);
    setActionQty('');
    setActionCost('');
  };

  const submitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionId) return;
    const qty = parseFloat(actionQty);
    if (!Number.isFinite(qty) || qty <= 0) return;
    if (actionMode === 'restock') {
      restockItem(actionId, qty, parseFloat(actionCost) || undefined);
    } else {
      consumeItem(actionId, qty);
    }
    setActionId(null);
    setActionQty('');
    setActionCost('');
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300 pb-10">
      {/* Header */}
      <div className="mp-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <Package className="h-5 w-5 mp-brand-fg" />
          <h2 className="text-lg font-bold">Item Tracker</h2>
        </div>
        <p className="text-xs mp-text-3 mb-4">
          Track snacks, supplies & stock — know what you have and what you've used.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="mp-inset p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide mp-text-3">Used this month</p>
            <p className="mp-num mt-1 text-xl font-extrabold">{monthlySummary.consumedUnits}</p>
          </div>
          <div className="mp-inset p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide mp-text-3">Spent restocking</p>
            <p className="mp-num mt-1 truncate text-xl font-extrabold mp-brand-fg">
              {cur}{monthlySummary.spentRestocking.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="flex flex-col gap-2">
        {trackedItems.length === 0 ? (
          <div className="mp-card p-8 text-center text-xs mp-text-3">
            No items tracked yet. Add snacks or supplies you buy regularly below.
          </div>
        ) : (
          trackedItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const consumedThisMonth = monthlyConsumedFor(item.id);
            return (
              <div key={item.id} className="mp-card p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                      <Package className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mp-clamp-1 text-sm font-bold">{item.name}</p>
                      <p className="text-[11px] mp-text-3">
                        {consumedThisMonth > 0 ? `${consumedThisMonth} ${item.unit} used this month` : `0 ${item.unit} used this month`}
                      </p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="mp-num text-lg font-extrabold">{item.currentQuantity}</p>
                      <p className="text-[10px] mp-text-3">{item.unit}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="mp-tap flex items-center justify-center rounded-xl mp-text-3 hover:bg-zinc-800/60"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openAction(item.id, 'restock')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-500"
                  >
                    <PackagePlus className="h-3.5 w-3.5" /> Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => openAction(item.id, 'consume')}
                    disabled={item.currentQuantity <= 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-[11px] font-bold text-amber-500 disabled:opacity-40"
                  >
                    <PackageMinus className="h-3.5 w-3.5" /> Use
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete "${item.name}"? This removes its whole history.`)) {
                        deleteTrackedItem(item.id);
                      }
                    }}
                    className="mp-tap flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Inline restock/use form */}
                {actionId === item.id && (
                  <form onSubmit={submitAction} className="mt-3 flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[11px] font-bold mp-text-2">
                      {actionMode === 'restock' ? `Add stock (${item.unit})` : `Log usage (${item.unit})`}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        autoFocus
                        value={actionQty}
                        onChange={(e) => setActionQty(e.target.value)}
                        placeholder={`Quantity`}
                        className={FIELD}
                      />
                      {actionMode === 'restock' && (
                        <input
                          type="number"
                          inputMode="decimal"
                          value={actionCost}
                          onChange={(e) => setActionCost(e.target.value)}
                          placeholder={`Cost (${cur}, optional)`}
                          className={FIELD}
                        />
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActionId(null)}
                        className="rounded-xl px-4 py-2 text-xs font-semibold mp-text-3 hover:bg-zinc-800/60"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="mp-brand-bg rounded-xl px-5 py-2 text-xs font-bold" style={{ color: 'var(--brand-ink)' }}>
                        Save
                      </button>
                    </div>
                  </form>
                )}

                {/* Expanded log history */}
                {isExpanded && (
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-zinc-800/80 pt-3">
                    {item.logs.length === 0 ? (
                      <p className="text-[11px] mp-text-3">No activity logged yet.</p>
                    ) : (
                      item.logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="flex items-center gap-1.5 mp-text-2">
                            <Calendar className="h-3 w-3 shrink-0 mp-text-3" />
                            {new Date(log.date).toLocaleDateString()}
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                log.type === 'restock' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                              }`}
                            >
                              {log.type}
                            </span>
                          </span>
                          <span className="mp-num shrink-0 font-semibold">
                            {log.type === 'restock' ? '+' : '−'}{log.quantity} {item.unit}
                            {log.cost ? ` (${cur}${log.cost.toLocaleString()})` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add item */}
      {isAdding ? (
        <form onSubmit={submitAdd} className="mp-card flex flex-col gap-3 p-5">
          <h3 className="text-sm font-bold">Add an item</h3>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Lays Chips, Digestive Biscuits"
            className={FIELD}
            required
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="Unit (packs, pcs, bottles...)"
              className={FIELD}
            />
            <input
              type="number"
              inputMode="decimal"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Starting quantity"
              className={FIELD}
            />
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold mp-text-3 hover:bg-zinc-800/60"
            >
              Cancel
            </button>
            <button type="submit" className="mp-brand-bg rounded-xl px-5 py-2 text-xs font-bold" style={{ color: 'var(--brand-ink)' }}>
              Save item
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 py-3.5 text-xs font-bold mp-text-2 hover:border-zinc-500"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      )}
    </div>
  );
};
