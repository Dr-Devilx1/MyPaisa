import React, { useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import { TransactionType, MainCategory } from '../types';
import { compressImageFile } from '../lib/image';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  Landmark,
  Tag,
  Plus,
  BookmarkCheck,
  HeartHandshake,
  Camera,
  Receipt,
  ImageOff
} from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
}

const MAIN_CATEGORIES: MainCategory[] = [
  'Income',
  'Housing & Utilities',
  'Food & Living',
  'Transportation',
  'Health & Medical',
  'Shopping & Personal',
  'Entertainment & Travel',
  'Education & Work',
  'Donations & Charity',
  'Loans & Debts',
  'OTHERS',
];

const SUB_CATEGORY_MAP: Record<MainCategory, string[]> = {
  'Income': ['Salary', 'Freelance', 'Business', 'Investments', 'Bonus', 'Gift'],
  'Housing & Utilities': ['Rent', 'Mortgage', 'Electricity', 'Water', 'Fiber Internet', 'Maintenance'],
  'Food & Living': ['Groceries', 'Dining Out', 'Coffee', 'Supermarket', 'Household Items'],
  'Transportation': ['Fuel & Gas', 'Public Transit', 'Ride Sharing', 'Car Insurance', 'Vehicle Service'],
  'Health & Medical': ['Doctor Visit', 'Medicines', 'Fitness & Gym', 'Health Insurance'],
  'Shopping & Personal': ['Clothing', 'Electronics', 'Personal Care', 'Gifts'],
  'Entertainment & Travel': ['Movies', 'Streaming Subscriptions', 'Vacation Hotel', 'Flight'],
  'Education & Work': ['Tuition & Course', 'Books & Stationaries', 'Software Tools'],
  'Donations & Charity': ['Zakat & Charity', 'Community Fund', 'Religious Donation', 'Disaster Relief'],
  'Loans & Debts': ['Credit Card Bill', 'Personal Loan Payback', 'Mortgage Payment'],
  'OTHERS': ['Custom Entry'],
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'expense',
}) => {
  const { addTransaction, addBorrowLendItem, userProfile, saveCustomCategory, accounts } = useFinancials();
  const isDark = userProfile.themeMode === 'dark';

  const [type, setType] = useState<TransactionType>(defaultType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [mainCat, setMainCat] = useState<MainCategory>(
    defaultType === 'income' ? 'Income' : 'Food & Living'
  );
  const [subCat, setSubCat] = useState<string>('Groceries');
  const [customCatTitle, setCustomCatTitle] = useState('');
  const [saveCategoryForLater, setSaveCategoryForLater] = useState(true);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit Card' | 'Bank Transfer' | 'Digital Wallet' | 'Other'>('Credit Card');
  const [accountId, setAccountId] = useState<string>('');
  const [personName, setPersonName] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [baseAmount, setBaseAmount] = useState('');
  const [taxFeeAmount, setTaxFeeAmount] = useState('');

  const [receiptImage, setReceiptImage] = useState('');
  const [imageError, setImageError] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageError('');
    setIsCompressing(true);
    try {
      const dataUrl = await compressImageFile(file);
      setReceiptImage(dataUrl);
    } catch {
      setImageError('Could not attach that photo — try a different one.');
    } finally {
      setIsCompressing(false);
    }
  };

  if (!isOpen) return null;

  const handleMainCatChange = (cat: MainCategory) => {
    setMainCat(cat);
    const subs = SUB_CATEGORY_MAP[cat] || [];
    setSubCat(subs[0] || 'General');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (!title.trim()) {
      setError('Please provide a title or description');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    if (mainCat === 'OTHERS' && !customCatTitle.trim()) {
      setError('Please give a title for your custom OTHERS category');
      return;
    }

    let finalCategoryDisplay = `${mainCat} • ${subCat}`;
    if (mainCat === 'OTHERS') {
      finalCategoryDisplay = `OTHERS • ${customCatTitle.trim()}`;
      if (saveCategoryForLater) {
        saveCustomCategory(customCatTitle.trim());
      }
    }

    if (type === 'borrow' || type === 'lend') {
      const pName = personName.trim() || title;
      addBorrowLendItem({
        personName: pName,
        type: type === 'borrow' ? 'borrowed' : 'lent',
        totalAmount: numAmount,
        dueDate: date,
        notes: notes || `${type === 'borrow' ? 'Borrowed from' : 'Lent to'} ${pName}`,
      });
    }

    const parsedBase = parseFloat(baseAmount);
    const parsedTax = parseFloat(taxFeeAmount);

    addTransaction({
      title,
      amount: numAmount,
      type,
      mainCategory: mainCat,
      subCategory: mainCat === 'OTHERS' ? customCatTitle.trim() : subCat,
      customCategoryTitle: mainCat === 'OTHERS' ? customCatTitle.trim() : undefined,
      category: finalCategoryDisplay,
      date: new Date(date).toISOString(),
      paymentMethod,
      accountId: accountId || undefined,
      baseAmount: Number.isFinite(parsedBase) && parsedBase > 0 ? parsedBase : undefined,
      taxFeeAmount: Number.isFinite(parsedTax) && parsedTax > 0 ? parsedTax : undefined,
      receiptImage: receiptImage || undefined,
      notes,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });

    // Reset & close
    setTitle('');
    setAmount('');
    setNotes('');
    setTags('');
    setPersonName('');
    setCustomCatTitle('');
    setAccountId('');
    setShowTaxBreakdown(false);
    setBaseAmount('');
    setTaxFeeAmount('');
    setReceiptImage('');
    setImageError('');
    onClose();
  };

  return (
    <div className="mp-modal-wrap bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`mp-modal ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        <div className="mp-modal-head flex items-center justify-between p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold">
              <Plus className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold">Add Transaction / Record</h3>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-1 transition-colors ${
              isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-black'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-500 border border-rose-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mp-modal-body p-5 mt-4 flex flex-col gap-4">
          {/* Record Type Switcher - Clear Expense vs Income Distinction */}
          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Action & Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setMainCat('Food & Living');
                }}
                className={`flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-xs font-bold transition-all border ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                    : isDark
                    ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 mb-1 text-rose-300" />
                Expense
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setMainCat('Income');
                }}
                className={`flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-xs font-bold transition-all border ${
                  type === 'income'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                    : isDark
                    ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900'
                }`}
              >
                <ArrowDownLeft className="h-4 w-4 mb-1 text-emerald-300" />
                Income
              </button>

              <button
                type="button"
                onClick={() => setType('lend')}
                className={`flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-xs font-bold transition-all border ${
                  type === 'lend'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
                    : isDark
                    ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900'
                }`}
              >
                <HandCoins className="h-4 w-4 mb-1 text-indigo-300" />
                Lend
              </button>

              <button
                type="button"
                onClick={() => setType('borrow')}
                className={`flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-xs font-bold transition-all border ${
                  type === 'borrow'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md shadow-amber-500/20'
                    : isDark
                    ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900'
                }`}
              >
                <Landmark className="h-4 w-4 mb-1" />
                Borrow
              </button>
            </div>
          </div>

          {/* Title & Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">
                Title / Description *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'expense'
                    ? 'e.g. Weekly Groceries'
                    : type === 'income'
                    ? 'e.g. Monthly Salary'
                    : 'e.g. Loan for Laptop'
                }
                className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-600' : 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400'
                }`}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">
                Amount ({userProfile.currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-zinc-500 text-sm font-semibold">
                  {userProfile.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full rounded-xl border pl-8 pr-3.5 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none ${
                    isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-600' : 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400'
                  }`}
                  required
                />
              </div>
            </div>
          </div>

          {/* Optional breakdown: what the item actually cost vs. tax/fee on top */}
          {(type === 'income' || type === 'expense') && (
            <div>
              {!showTaxBreakdown ? (
                <button
                  type="button"
                  onClick={() => setShowTaxBreakdown(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-300"
                >
                  <Receipt className="h-3.5 w-3.5" /> + Add tax / fee breakdown (optional)
                </button>
              ) : (
                <div className={`rounded-xl border p-3 flex flex-col gap-2 ${isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500">Actual price vs. tax/fee charged</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTaxBreakdown(false);
                        setBaseAmount('');
                        setTaxFeeAmount('');
                      }}
                      className="text-zinc-500 hover:text-zinc-300"
                      aria-label="Remove breakdown"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={baseAmount}
                      onChange={(e) => setBaseAmount(e.target.value)}
                      placeholder={`Actual price (${userProfile.currencySymbol})`}
                      className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                        isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-600' : 'border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400'
                      }`}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={taxFeeAmount}
                      onChange={(e) => setTaxFeeAmount(e.target.value)}
                      placeholder={`Tax / fee (${userProfile.currencySymbol})`}
                      className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                        isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-600' : 'border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Just for your records — the Amount above is still what actually left your account.
                  </p>
                </div>
              )}
            </div>
          )}

          {(type === 'borrow' || type === 'lend') && (
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">
                Person Name ({type === 'borrow' ? 'Lender' : 'Borrower'})
              </label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g. Alex Rivers"
                className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-600' : 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          )}

          {/* Main Category & Sub Category Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Main Category</label>
              <select
                value={mainCat}
                onChange={(e) => handleMainCatChange(e.target.value as MainCategory)}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                }`}
              >
                {MAIN_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {mainCat !== 'OTHERS' ? (
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">Sub Category</label>
                <select
                  value={subCat}
                  onChange={(e) => setSubCat(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                    isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                  }`}
                >
                  {(SUB_CATEGORY_MAP[mainCat] || ['General']).map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">Custom Category Title *</label>
                <input
                  type="text"
                  value={customCatTitle}
                  onChange={(e) => setCustomCatTitle(e.target.value)}
                  placeholder="e.g. Pet Care, Art Supplies"
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                    isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-600' : 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400'
                  }`}
                  required
                />
              </div>
            )}
          </div>

          {/* OTHERS Save for Later Checkbox */}
          {mainCat === 'OTHERS' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="saveCategoryLater"
                checked={saveCategoryForLater}
                onChange={(e) => setSaveCategoryForLater(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="saveCategoryLater" className="flex items-center gap-1.5 text-zinc-400">
                <BookmarkCheck className="h-3.5 w-3.5 text-emerald-500" />
                Save this custom category for future use
              </label>
            </div>
          )}

          {/* Saved Custom Categories Quick Pills if available */}
          {userProfile.savedCustomCategories && userProfile.savedCustomCategories.length > 0 && mainCat === 'OTHERS' && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-[10px] text-zinc-500 w-full">Previously saved:</span>
              {userProfile.savedCustomCategories.map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setCustomCatTitle(sc)}
                  className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                >
                  {sc}
                </button>
              ))}
            </div>
          )}

          {/* Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Digital Wallet' | 'Other'
                  )
                }
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                }`}
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Digital Wallet">Digital Wallet</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Which account this affects — only income/expense move a real balance */}
          {(type === 'income' || type === 'expense') && accounts.length > 0 && (
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">
                Account (optional — updates its balance)
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none ${
                  isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                }`}
              >
                <option value="">Not linked to an account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({userProfile.currencySymbol}{a.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bill / receipt photo */}
          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">
              Bill / receipt photo (Optional)
            </label>
            {receiptImage ? (
              <div className="relative inline-block">
                <img
                  src={receiptImage}
                  alt="Attached receipt"
                  className="h-28 w-28 rounded-xl border object-cover"
                  style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}
                />
                <button
                  type="button"
                  onClick={() => setReceiptImage('')}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed py-4 text-xs font-bold ${
                  isDark ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500' : 'border-zinc-300 text-zinc-500 hover:border-zinc-400'
                }`}
              >
                {isCompressing ? (
                  <>Attaching…</>
                ) : (
                  <>
                    <Camera className="h-4 w-4" /> Attach a photo of the bill
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" onChange={handlePickImage} className="hidden" disabled={isCompressing} />
              </label>
            )}
            {imageError && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-400">
                <ImageOff className="h-3.5 w-3.5" /> {imageError}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add detail, store location, or receipt notes..."
              className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none resize-none ${
                isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-600' : 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400'
              }`}
            />
          </div>

          {/* Form Actions */}
          <div className={`mt-2 flex items-center justify-end gap-3 pt-3 border-t ${
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-black'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
