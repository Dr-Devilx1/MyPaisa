import React, { useState, useMemo } from 'react';
import { useFinancials } from '../state/FinancialContext';
import { TransactionType, TransactionCategory } from '../types';
import {
  Search,
  Plus,
  Trash2,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Calendar,
  Tag,
  CreditCard,
  Receipt
} from 'lucide-react';
import { AddTransactionModal } from './AddTransactionModal';

export const TransactionsView: React.FC = () => {
  const { transactions, deleteTransaction, userProfile } = useFinancials();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.title.toLowerCase().includes(search.toLowerCase()) ||
        tx.category.toLowerCase().includes(search.toLowerCase()) ||
        tx.notes?.toLowerCase().includes(search.toLowerCase()) ||
        tx.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchesType = selectedType === 'all' || tx.type === selectedType;
      const matchesCategory = selectedCategory === 'all' || tx.category === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, search, selectedType, selectedCategory]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131316] p-7 rounded-[2rem] border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Transaction Records</h2>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            Total {transactions.length} records saved securely in local storage.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all uppercase tracking-wider"
        >
          <Plus className="h-4 w-4" />
          Add Record
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#131316] p-4 rounded-2xl border border-zinc-800">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions, notes, tags..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500 shrink-0" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Types (Income, Expense, Debt)</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
            <option value="lend">Lent Money</option>
            <option value="borrow">Borrowed Money</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Food & Dining">Food & Dining</option>
            <option value="Salary">Salary</option>
            <option value="Shopping">Shopping</option>
            <option value="Housing & Rent">Housing & Rent</option>
            <option value="Transportation">Transportation</option>
            <option value="Utilities">Utilities</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Freelance">Freelance</option>
            <option value="Investments">Investments</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-[2rem] bg-[#131316] border border-zinc-800 overflow-hidden shadow-xl p-2">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            No transactions found matching your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-900/60 rounded-2xl transition-all group"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                      tx.type === 'income'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : tx.type === 'expense'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : tx.type === 'expense' ? (
                      <ArrowDownRight className="h-5 w-5" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-white">{tx.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <span className="rounded-md bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
                        {tx.category}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                        <Calendar className="h-3 w-3 text-zinc-500" />
                        {new Date(tx.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                        <CreditCard className="h-3 w-3 text-zinc-500" />
                        {tx.paymentMethod}
                      </span>
                    </div>
                    {tx.notes && (
                      <p className="text-[11px] text-zinc-500 mt-1 italic">{tx.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <span
                      className={`mp-num block text-base font-semibold ${
                        tx.type === 'income'
                          ? 'text-emerald-400'
                          : tx.type === 'expense'
                          ? 'text-rose-400'
                          : 'text-indigo-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {userProfile.currencySymbol}
                      {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex gap-1 justify-end mt-1">
                        {tx.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${tx.title}"? This cannot be undone.`)) {
                        deleteTransaction(tx.id);
                      }
                    }}
                    title="Delete record"
                    aria-label={`Delete ${tx.title}`}
                    className="mp-tap flex shrink-0 items-center justify-center rounded-xl p-2 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 md:opacity-0 md:group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
