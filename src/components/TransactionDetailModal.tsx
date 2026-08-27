import React, { useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import { Transaction } from '../types';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Calendar,
  Tag,
  CreditCard,
  Trash2,
} from 'lucide-react';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ transaction, onClose }) => {
  const { deleteTransaction, userProfile } = useFinancials();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!transaction) return null;
  const tx = transaction;
  const isDark = userProfile.themeMode === 'dark';

  const tone =
    tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-rose-400' : 'text-indigo-400';

  const handleDelete = () => {
    if (window.confirm(`Delete "${tx.title}"? This cannot be undone.`)) {
      deleteTransaction(tx.id);
      onClose();
    }
  };

  return (
    <>
      <div className="mp-modal-wrap bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div
          className={`mp-modal ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mp-modal-head flex items-center justify-between p-5">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                  tx.type === 'income'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : tx.type === 'expense'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {tx.type === 'income' ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : tx.type === 'expense' ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </div>
              <h3 className="mp-clamp-1 text-base font-bold">{tx.title}</h3>
            </div>
            <button
              onClick={onClose}
              className={`shrink-0 rounded-lg p-1 transition-colors ${
                isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-black'
              }`}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mp-modal-body p-5 flex flex-col gap-4">
            <div className="text-center py-2">
              <span className={`mp-num text-3xl font-extrabold ${tone}`}>
                {tx.type === 'income' ? '+' : '-'}
                {userProfile.currencySymbol}
                {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              {(tx.baseAmount || tx.taxFeeAmount) && (
                <p className="text-xs mp-text-3 mt-1">
                  {tx.baseAmount ? `${userProfile.currencySymbol}${tx.baseAmount.toLocaleString()} price` : ''}
                  {tx.baseAmount && tx.taxFeeAmount ? ' + ' : ''}
                  {tx.taxFeeAmount ? `${userProfile.currencySymbol}${tx.taxFeeAmount.toLocaleString()} tax/fee` : ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="mp-inset p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase mp-text-3">
                  <Tag className="h-3 w-3" /> Category
                </p>
                <p className="mt-1 truncate text-sm font-semibold">{tx.category}</p>
              </div>
              <div className="mp-inset p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase mp-text-3">
                  <Calendar className="h-3 w-3" /> Date
                </p>
                <p className="mt-1 truncate text-sm font-semibold">{new Date(tx.date).toLocaleDateString()}</p>
              </div>
              <div className="mp-inset p-3 col-span-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase mp-text-3">
                  <CreditCard className="h-3 w-3" /> Payment method
                </p>
                <p className="mt-1 truncate text-sm font-semibold">{tx.paymentMethod}</p>
              </div>
            </div>

            {tx.notes && (
              <div>
                <p className="text-[11px] font-bold uppercase mp-text-3 mb-1">Notes</p>
                <p className="text-sm mp-text-2">{tx.notes}</p>
              </div>
            )}

            {tx.tags && tx.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tx.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {tx.receiptImage && (
              <button type="button" onClick={() => setLightboxOpen(true)} className="self-start">
                <img
                  src={tx.receiptImage}
                  alt="Receipt"
                  className="h-20 w-20 rounded-xl border border-zinc-800 object-cover"
                />
              </button>
            )}
          </div>

          <div className="mp-modal-foot flex justify-end p-5">
            <button
              onClick={handleDelete}
              className="mp-tap flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
            >
              <Trash2 className="h-4 w-4" /> Delete record
            </button>
          </div>
        </div>
      </div>

      {lightboxOpen && tx.receiptImage && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="mp-tap absolute right-4 top-4 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={tx.receiptImage}
            alt="Receipt"
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
