import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import {
  Transaction,
  Budget,
  SavingsGoal,
  BorrowLendItem,
  BorrowLendEntry,
  UserProfile,
  FixedObligation,
  FinancialMemory,
  UserAccount,
  HostelEntry,
  AiInsight,
  ChatMessage,
  TransactionType,
  TransactionCategory,
  MainCategory,
  FinancialAccount,
  FinancialAccountType,
} from '../types';
import { FinancialRepository } from '../repositories';
import { DEFAULT_PROFILE } from '../database/indexed_db';
import { uid } from '../lib/id';

/** Inclusive start of the current calendar month. */
function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
/** Inclusive start of the previous calendar month. */
function startOfPrevMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
/** fetch() with a hard timeout, so the UI never hangs on a dead endpoint. */
async function fetchWithTimeout(url: string, init: RequestInit, ms = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function inRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t >= from.getTime() && t < to.getTime();
}

interface FinancialContextType {
  // State
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  borrowLend: BorrowLendItem[];
  fixedObligations: FixedObligation[];
  memories: FinancialMemory[];
  savedAccounts: UserAccount[];
  accounts: FinancialAccount[];
  userProfile: UserProfile;
  activeTab: string;
  isMobileFrame: boolean;
  isLoading: boolean;

  // Storage diagnostics (surfaced as a warning banner when not durable)
  storageBackend: string;
  storageDurable: boolean;

  // App lock
  isUnlocked: boolean;
  unlockApp: (pin: string) => boolean;
  lockApp: () => void;

  // Modals & UI States
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isQuickAddModalOpen: boolean;
  setIsQuickAddModalOpen: (open: boolean) => void;
  isPendingReviewOpen: boolean;
  setIsPendingReviewOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;

  // Derived Financial Metrics
  totalIncome: number;
  totalExpense: number;
  netWorth: number;
  totalLent: number;
  totalBorrowed: number;
  borrowLendNet: number;
  financialHealthScore: number;
  lastMonthHealthScore: number;
  aiScoreDiff: number;
  totalFixedObligationsAmount: number;
  paidFixedObligationsAmount: number;
  totalAccountsBalance: number;
  needsAccountSetup: boolean;

  // Current-calendar-month figures (what the dashboard labels "monthly")
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;

  // Hostel Mode
  hostelEntries: HostelEntry[];
  addHostelEntry: (entry: Omit<HostelEntry, 'id' | 'createdAt'>) => void;
  deleteHostelEntry: (id: string) => void;

  // Actions
  resetToCleanData: () => Promise<void>;
  loadDemoData: () => void;
  flushNow: () => Promise<void>;

  // Actions - Tab Navigation
  setActiveTab: (tab: string) => void;
  setIsMobileFrame: (isMobile: boolean) => void;

  // Actions - Transactions & Pending Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addQuickPendingTransaction: (
    title: string,
    amount: number,
    type: 'income' | 'expense',
    category?: MainCategory | string,
    notes?: string
  ) => void;
  approvePendingTransaction: (id: string, updatedFields?: Partial<Transaction>) => void;
  rejectPendingTransaction: (id: string) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (tx: Transaction) => void;

  // Actions - Accounts & Sync
  signUpAccount: (account: { name: string; username: string; email: string; avatarUrl: string; pinCode?: string }) => void;
  signInAccount: (username: string) => boolean;
  signOutAccount: () => void;

  // Actions - Financial Accounts (banks, digital wallets, cash)
  addAccount: (data: { name: string; type: FinancialAccountType; balance: number }) => void;
  renameAccount: (id: string, name: string) => void;
  setAccountBalance: (id: string, balance: number) => void;
  deleteAccount: (id: string) => void;
  completeAccountSetup: (input: {
    banks: { name: string; balance: number }[];
    wallets: { name: string; balance: number }[];
    cash: number;
  }) => void;
  skipAccountSetup: () => void;

  // Actions - Financial Memories
  addMemory: (mem: Omit<FinancialMemory, 'id' | 'createdAt'>) => void;
  deleteMemory: (id: string) => void;

  // Actions - Categories & Custom Categories
  saveCustomCategory: (categoryName: string) => void;

  // Actions - Fixed Monthly Spending Obligations
  addFixedObligation: (obl: Omit<FixedObligation, 'id' | 'isPaid'>) => void;
  toggleFixedObligationPaid: (id: string) => void;
  deleteFixedObligation: (id: string) => void;

  // Actions - Budgets
  setBudget: (category: MainCategory | string, limitAmount: number, alertThresholdPercent?: number) => void;
  deleteBudget: (id: string) => void;

  // Actions - Savings Goals
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  contributeToGoal: (goalId: string, amount: number) => void;
  withdrawFromGoal: (goalId: string, amount: number) => void;
  deleteGoal: (id: string) => void;

  // Actions - Borrow & Lend
  addBorrowLendItem: (item: Omit<BorrowLendItem, 'id' | 'createdAt' | 'repaidAmount' | 'status'>) => void;
  recordRepayment: (id: string, amount: number) => void;
  addBorrowLendEntry: (personId: string, type: 'lent' | 'borrowed' | 'repaid' | 'waived', amount: number, notes?: string) => void;
  waiveOffAmount: (personId: string, amount: number, notes?: string) => void;
  deleteBorrowLendItem: (id: string) => void;

  // Actions - User Profile & Settings
  updateProfile: (updated: Partial<UserProfile>) => void;
  exportBackup: () => Promise<string>;
  importBackup: (jsonStr: string) => { ok: boolean; message: string; restored: number };

  // AI Assistant Integration
  aiInsight: AiInsight | null;
  aiChatMessages: ChatMessage[];
  isAiThinking: boolean;
  requestAiAnalysis: () => Promise<void>;
  sendAiChatMessage: (messageText: string) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

const repo = new FinancialRepository();

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [borrowLend, setBorrowLend] = useState<BorrowLendItem[]>([]);
  const [fixedObligations, setFixedObligations] = useState<FixedObligation[]>([]);
  const [memories, setMemories] = useState<FinancialMemory[]>([]);
  const [savedAccounts, setSavedAccounts] = useState<UserAccount[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [hostelEntries, setHostelEntries] = useState<HostelEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storageBackend, setStorageBackend] = useState<string>('memory');
  const [storageDurable, setStorageDurable] = useState<boolean>(true);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  /**
   * BUGFIX (data loss): the save effects used to be gated on `isLoading`.
   * Because every effect also runs on the very first render, a slow or failed
   * load could let an EMPTY state array be written over real stored data.
   * `hydratedRef` is set exactly once, after the initial load resolves, and no
   * write is allowed before that. This is the guard that stops the app
   * "starting from 0".
   */
  const hydratedRef = useRef(false);

  // Modals & UI States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState<boolean>(false);
  const [isPendingReviewOpen, setIsPendingReviewOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // AI State
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([
    {
      id: uid('msg'),
      sender: 'assistant',
      text: 'Hello! I am My Paisa AI. I operate both offline and online to track your balance, monthly bills, borrow/lend records, and savings goals. How can I assist you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Initialize data from Repository
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      try {
        const data = await repo.getInitialData();
        if (cancelled) return;

        setTransactions(data.transactions);
        setBudgets(data.budgets);
        setGoals(data.goals);
        setBorrowLend(data.borrowLend);
        setFixedObligations(data.fixedObligations ?? []);
        setMemories(data.memories ?? []);
        setSavedAccounts(data.savedAccounts ?? []);
        setAccounts(data.financialAccounts ?? []);
        setHostelEntries(data.hostelEntries ?? []);
        setUserProfile(data.userProfile);

        // Only unlock straight away when no PIN is configured.
        setIsUnlocked(!data.userProfile.isPinProtected);

        const health = repo.health;
        setStorageBackend(health.backend);
        setStorageDurable(health.durable || health.backend !== 'memory');
      } catch (e) {
        console.error('[My Paisa] init failed:', e);
        setStorageDurable(false);
      } finally {
        if (!cancelled) {
          // Order matters: mark hydrated BEFORE clearing the loading flag so
          // no save effect can fire against pre-load state.
          hydratedRef.current = true;
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Android kills backgrounded WebViews without warning. Flush every queued
   * write when the app loses focus, is hidden, or is being torn down.
   */
  useEffect(() => {
    const flush = () => {
      if (hydratedRef.current) void repo.flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    window.addEventListener('blur', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('blur', flush);
    };
  }, []);

  // Persist state changes. Every effect is gated on `hydratedRef` so that the
  // initial (empty) render can never overwrite what is on disk.
  useEffect(() => {
    if (hydratedRef.current) repo.saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    if (hydratedRef.current) repo.saveHostelEntries(hostelEntries);
  }, [hostelEntries]);

  useEffect(() => {
    if (hydratedRef.current) repo.saveBudgets(budgets);
  }, [budgets]);

  useEffect(() => {
    if (hydratedRef.current) repo.saveGoals(goals);
  }, [goals]);

  useEffect(() => {
    if (hydratedRef.current) repo.saveBorrowLend(borrowLend);
  }, [borrowLend]);

  useEffect(() => {
    if (hydratedRef.current) repo.saveFixedObligations(fixedObligations);
  }, [fixedObligations]);

  useEffect(() => {
    if (hydratedRef.current) repo.saveMemories(memories);
  }, [memories]);

  useEffect(() => {
    if (hydratedRef.current) repo.saveAccounts(savedAccounts);
  }, [savedAccounts]);

  useEffect(() => {
    if (hydratedRef.current) repo.saveFinancialAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    if (hydratedRef.current) repo.saveProfile(userProfile);
  }, [userProfile]);

  // Derived Pending Transactions
  const pendingTransactions = useMemo(() => {
    return transactions.filter((t) => t.isPending);
  }, [transactions]);

  // Derived Financial Metrics (Only calculate from non-pending approved transactions)
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => !t.isPending && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => !t.isPending && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalLent = useMemo(() => {
    return borrowLend
      .filter((b) => b.type === 'lent' && b.status === 'active')
      .reduce((sum, b) => {
        const remaining = b.totalAmount - b.repaidAmount - (b.waivedAmount || 0);
        return sum + Math.max(0, remaining);
      }, 0);
  }, [borrowLend]);

  const totalBorrowed = useMemo(() => {
    return borrowLend
      .filter((b) => b.type === 'borrowed' && b.status === 'active')
      .reduce((sum, b) => {
        const remaining = b.totalAmount - b.repaidAmount - (b.waivedAmount || 0);
        return sum + Math.max(0, remaining);
      }, 0);
  }, [borrowLend]);

  // Current-calendar-month figures. The dashboard labels several tiles
  // "Monthly", but the old code summed EVERY transaction ever recorded, so the
  // number only grew and never reset. These are the correct month-scoped ones.
  const monthBounds = useMemo(() => {
    const from = startOfMonth();
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    return { from, to };
  }, []);

  const monthlyIncome = useMemo(
    () =>
      transactions
        .filter((t) => !t.isPending && t.type === 'income' && inRange(t.date, monthBounds.from, monthBounds.to))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions, monthBounds]
  );

  const monthlyExpense = useMemo(
    () =>
      transactions
        .filter((t) => !t.isPending && t.type === 'expense' && inRange(t.date, monthBounds.from, monthBounds.to))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions, monthBounds]
  );

  const monthlyNet = monthlyIncome - monthlyExpense;

  const borrowLendNet = totalLent - totalBorrowed;

  const netWorth = totalIncome - totalExpense + totalLent - totalBorrowed;

  const totalAccountsBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  const needsAccountSetup = !userProfile.hasCompletedAccountSetup;

  const totalFixedObligationsAmount = useMemo(() => {
    return fixedObligations.reduce((sum, o) => sum + o.amount, 0);
  }, [fixedObligations]);

  const paidFixedObligationsAmount = useMemo(() => {
    return fixedObligations
      .filter((o) => o.isPaid)
      .reduce((sum, o) => sum + o.amount, 0);
  }, [fixedObligations]);

  /**
   * Recalculate `spentAmount` per budget.
   *
   * BUGFIX: the old version summed every matching expense ever recorded, so a
   * budget labelled "monthly" was permanently over its limit after a few
   * months. Spend is now scoped to the budget's own period, pending entries are
   * excluded (they are not confirmed yet), and the state is only replaced when
   * a figure actually changed — the old unconditional `setBudgets` created a
   * new array on every render, which triggered a disk write each time.
   */
  useEffect(() => {
    const now = new Date();
    const periodStart = (period: Budget['period']): Date => {
      if (period === 'weekly') {
        const d = new Date(now);
        const dayOfWeek = d.getDay();
        d.setDate(d.getDate() - dayOfWeek);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (period === 'yearly') return new Date(now.getFullYear(), 0, 1);
      return startOfMonth(now);
    };

    setBudgets((prevBudgets) => {
      let changed = false;
      const next = prevBudgets.map((b) => {
        const from = periodStart(b.period);
        const to = new Date(now.getTime() + 86400000);
        const catSpent = transactions
          .filter(
            (t) =>
              !t.isPending &&
              t.type === 'expense' &&
              (t.mainCategory === b.category || t.category === b.category) &&
              inRange(t.date, from, to)
          )
          .reduce((sum, t) => sum + t.amount, 0);

        if (Math.abs(catSpent - b.spentAmount) < 0.005) return b;
        changed = true;
        return { ...b, spentAmount: catSpent };
      });
      return changed ? next : prevBudgets;
    });
  }, [transactions]);

  // Financial Health Score calculation (0 - 100)
  const financialHealthScore = useMemo(() => {
    let score = 50; // base score
    if (totalIncome > 0) {
      const savingsRatio = (totalIncome - totalExpense) / totalIncome;
      if (savingsRatio >= 0.3) score += 30;
      else if (savingsRatio >= 0.15) score += 20;
      else if (savingsRatio > 0) score += 10;
      else score -= 15;
    }
    // Budget discipline
    const overBudgets = budgets.filter((b) => b.spentAmount > b.limitAmount).length;
    score -= overBudgets * 8;

    // Debt safety
    if (totalBorrowed > totalIncome * 0.5) score -= 15;

    return Math.max(10, Math.min(100, Math.round(score)));
  }, [totalIncome, totalExpense, budgets, totalBorrowed]);

  /**
   * Last month's health score.
   *
   * BUGFIX: this used to `return 74;` — a hard-coded constant. The dashboard
   * then showed a completely fictional "vs last month" delta. It is now
   * computed from the previous calendar month's actual income and spending,
   * using the same scoring rules. With no history the delta is 0 rather than
   * an invented improvement.
   */
  const lastMonthHealthScore = useMemo(() => {
    const from = startOfPrevMonth();
    const to = startOfMonth();

    const prev = transactions.filter((t) => !t.isPending && inRange(t.date, from, to));
    if (prev.length === 0) return financialHealthScore;

    const income = prev.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = prev.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    let score = 50;
    if (income > 0) {
      const savingsRatio = (income - expense) / income;
      if (savingsRatio >= 0.3) score += 30;
      else if (savingsRatio >= 0.15) score += 20;
      else if (savingsRatio > 0) score += 10;
      else score -= 15;
    }
    if (totalBorrowed > income * 0.5 && income > 0) score -= 15;

    return Math.max(10, Math.min(100, Math.round(score)));
  }, [transactions, financialHealthScore, totalBorrowed]);

  const aiScoreDiff = financialHealthScore - lastMonthHealthScore;

  /**
   * Wipe every record but keep the user's profile and settings.
   * Awaits the flush so the wipe is on disk before the UI reports success.
   */
  const resetToCleanData = async () => {
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setBorrowLend([]);
    setFixedObligations([]);
    setMemories([]);
    setHostelEntries([]);
    setAccounts([]);
    const keptProfile = { ...userProfile, hasCompletedAccountSetup: false };
    setUserProfile(keptProfile);
    await repo.wipeAll(keptProfile);
  };

  /** Load the optional sample dataset (Settings -> Load Sample Data). */
  const loadDemoData = () => {
    const demo = repo.loadDemoData();
    setTransactions(demo.transactions);
    setBudgets(demo.budgets);
    setGoals(demo.goals);
    setBorrowLend(demo.borrowLend);
    setFixedObligations(demo.fixedObligations);
    setMemories(demo.memories);
    setHostelEntries(demo.hostelEntries);
    setAccounts(demo.financialAccounts);
    setUserProfile((prev) => ({ ...prev, hasCompletedAccountSetup: true }));
  };

  const flushNow = useCallback(() => repo.flush(), []);

  /* ------------------------------- App lock ------------------------------- */

  const unlockApp = (pin: string): boolean => {
    if (!userProfile.isPinProtected) {
      setIsUnlocked(true);
      return true;
    }
    if (userProfile.pinCode && pin === userProfile.pinCode) {
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    if (userProfile.isPinProtected) setIsUnlocked(false);
  };

  const addHostelEntry = (entryData: Omit<HostelEntry, 'id' | 'createdAt'>) => {
    const newEntry: HostelEntry = {
      ...entryData,
      id: uid('hostel'),
      createdAt: new Date().toISOString(),
    };
    setHostelEntries((prev) => [newEntry, ...prev]);

    // Automatically record daily sum as an Expense transaction under "Food & Living" if sum > 0
    const totalDailySum =
      entryData.breakfastAmount +
      entryData.lunchAmount +
      entryData.dinnerAmount +
      entryData.teaAmount +
      entryData.laundryAmount +
      entryData.transportAmount +
      entryData.messFeeAmount;

    if (totalDailySum > 0) {
      addTransaction({
        title: `Hostel Daily Expense (${entryData.date})`,
        amount: totalDailySum,
        type: 'expense',
        mainCategory: 'Food & Living',
        subCategory: 'Hostel Expense',
        category: 'Food & Dining',
        date: new Date(entryData.date).toISOString(),
        notes: `Hostel tracking log: Breakfast ${entryData.breakfastAmount}, Lunch ${entryData.lunchAmount}, Dinner ${entryData.dinnerAmount}, Tea ${entryData.teaAmount}, Laundry ${entryData.laundryAmount}, Transport ${entryData.transportAmount}, Mess Fee ${entryData.messFeeAmount}`,
        paymentMethod: 'Cash',
      });
    }
  };

  const deleteHostelEntry = (id: string) => {
    setHostelEntries((prev) => prev.filter((e) => e.id !== id));
  };

  /**
   * Confirmed income/expense transactions move real money in or out of a
   * linked bank/wallet/cash account, so the account's balance is adjusted
   * alongside every add/edit/delete/approve — the same way a bank statement
   * would reconcile. Pending (unreviewed) transactions and borrow/lend
   * entries never touch account balances.
   */
  const applyAccountDelta = (
    accountId: string | undefined,
    type: TransactionType,
    amount: number,
    direction: 1 | -1
  ) => {
    if (!accountId) return;
    if (type !== 'income' && type !== 'expense') return;
    const signedAmount = (type === 'income' ? amount : -amount) * direction;
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, balance: a.balance + signedAmount } : a))
    );
  };

  // Action Implementations
  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: uid('tx'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!newTx.isPending) applyAccountDelta(newTx.accountId, newTx.type, newTx.amount, 1);
    setTransactions((prev) => [newTx, ...prev]);
  };

  const addQuickPendingTransaction = (
    title: string,
    amount: number,
    type: 'income' | 'expense',
    category?: MainCategory | string,
    notes?: string
  ) => {
    const mainCat: MainCategory = (category as MainCategory) || (type === 'income' ? 'Income' : 'Food & Living');
    const newTx: Transaction = {
      id: uid('txp'),
      title: title.trim() || (type === 'income' ? 'Quick Income Entry' : 'Quick Expense Entry'),
      amount: Math.max(0.01, amount),
      type,
      mainCategory: mainCat,
      category: `${mainCat} • Quick Capture`,
      date: new Date().toISOString(),
      paymentMethod: 'Cash',
      isPending: true,
      pendingNote: notes || 'Quick capture entry pending review & verification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const approvePendingTransaction = (id: string, updatedFields?: Partial<Transaction>) => {
    const base = transactions.find((t) => t.id === id);
    if (base) {
      const merged = { ...base, ...updatedFields };
      applyAccountDelta(merged.accountId, merged.type, merged.amount, 1);
    }
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            ...updatedFields,
            isPending: false,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const rejectPendingTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const signUpAccount = (accountData: { name: string; username: string; email: string; avatarUrl: string; pinCode?: string }) => {
    const cleanUsername = accountData.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const newAcc: UserAccount = {
      id: uid('acc'),
      username: cleanUsername || `user_${Date.now().toString().slice(-4)}`,
      name: accountData.name.trim() || 'Valued Pilot',
      email: accountData.email.trim() || 'user@mypaisa.app',
      avatarUrl: accountData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      pinCode: accountData.pinCode,
      createdAt: new Date().toISOString(),
    };
    setSavedAccounts((prev) => [...prev.filter((a) => a.username !== newAcc.username), newAcc]);
    setUserProfile((prev) => ({
      ...prev,
      name: newAcc.name,
      username: newAcc.username,
      email: newAcc.email,
      avatarUrl: newAcc.avatarUrl,
      isPinProtected: !!newAcc.pinCode,
      pinCode: newAcc.pinCode,
      isLoggedIn: true,
      lastSyncTimestamp: new Date().toISOString(),
    }));
  };

  const signInAccount = (username: string): boolean => {
    const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const target = savedAccounts.find((a) => a.username.toLowerCase() === clean);
    if (target) {
      setUserProfile((prev) => ({
        ...prev,
        name: target.name,
        username: target.username,
        email: target.email,
        avatarUrl: target.avatarUrl,
        isPinProtected: !!target.pinCode,
        pinCode: target.pinCode,
        isLoggedIn: true,
        lastSyncTimestamp: new Date().toISOString(),
      }));
      return true;
    }
    return false;
  };

  // Financial Accounts (banks, digital wallets, cash on hand)
  const addAccount = (data: { name: string; type: FinancialAccountType; balance: number }) => {
    const newAccount: FinancialAccount = {
      id: uid('fa'),
      name: data.name.trim() || 'Account',
      type: data.type,
      balance: Number.isFinite(data.balance) ? data.balance : 0,
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAccount]);
  };

  const renameAccount = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, name: trimmed } : a)));
  };

  const setAccountBalance = (id: string, balance: number) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, balance } : a)));
  };

  const deleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  /** New-user wizard: bulk-create every bank/wallet/cash entry in one go. */
  const completeAccountSetup = (input: {
    banks: { name: string; balance: number }[];
    wallets: { name: string; balance: number }[];
    cash: number;
  }) => {
    const now = new Date().toISOString();
    const newAccounts: FinancialAccount[] = [
      ...input.banks
        .filter((b) => b.name.trim())
        .map((b) => ({ id: uid('fa'), name: b.name.trim(), type: 'bank' as const, balance: b.balance || 0, createdAt: now })),
      ...input.wallets
        .filter((w) => w.name.trim())
        .map((w) => ({ id: uid('fa'), name: w.name.trim(), type: 'wallet' as const, balance: w.balance || 0, createdAt: now })),
    ];
    if (input.cash > 0 || newAccounts.length === 0) {
      newAccounts.push({ id: uid('fa'), name: 'Cash', type: 'cash', balance: input.cash || 0, createdAt: now });
    }
    setAccounts((prev) => [...prev, ...newAccounts]);
    setUserProfile((prev) => ({ ...prev, hasCompletedAccountSetup: true }));
  };

  const skipAccountSetup = () => {
    setUserProfile((prev) => ({ ...prev, hasCompletedAccountSetup: true }));
  };

  const signOutAccount = () => {
    setUserProfile((prev) => ({
      ...prev,
      isLoggedIn: false,
    }));
  };

  const addMemory = (memData: Omit<FinancialMemory, 'id' | 'createdAt'>) => {
    const newMem: FinancialMemory = {
      ...memData,
      id: uid('mem'),
      createdAt: new Date().toISOString(),
    };
    setMemories((prev) => [newMem, ...prev]);
  };

  const deleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };


  const deleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (tx && !tx.isPending) applyAccountDelta(tx.accountId, tx.type, tx.amount, -1);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTransaction = (updatedTx: Transaction) => {
    const oldTx = transactions.find((t) => t.id === updatedTx.id);
    if (oldTx && !oldTx.isPending) applyAccountDelta(oldTx.accountId, oldTx.type, oldTx.amount, -1);
    if (!updatedTx.isPending) applyAccountDelta(updatedTx.accountId, updatedTx.type, updatedTx.amount, 1);
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? { ...updatedTx, updatedAt: new Date().toISOString() } : t))
    );
  };

  const saveCustomCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setUserProfile((prev) => {
      const existing = prev.savedCustomCategories || [];
      if (existing.includes(trimmed)) return prev;
      return { ...prev, savedCustomCategories: [...existing, trimmed] };
    });
  };

  // Fixed Obligations Actions
  const addFixedObligation = (oblData: Omit<FixedObligation, 'id' | 'isPaid'>) => {
    const newObl: FixedObligation = {
      ...oblData,
      id: uid('obl'),
      isPaid: false,
    };
    setFixedObligations((prev) => [...prev, newObl]);
  };

  const toggleFixedObligationPaid = (id: string) => {
    setFixedObligations((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          const nextState = !o.isPaid;
          return {
            ...o,
            isPaid: nextState,
            lastPaidDate: nextState ? new Date().toISOString() : o.lastPaidDate,
          };
        }
        return o;
      })
    );
  };

  const deleteFixedObligation = (id: string) => {
    setFixedObligations((prev) => prev.filter((o) => o.id !== id));
  };

  const setBudget = (category: MainCategory | string, limitAmount: number, alertThresholdPercent = 80) => {
    setBudgets((prev) => {
      const existing = prev.find((b) => b.category === category);
      if (existing) {
        return prev.map((b) =>
          b.category === category ? { ...b, limitAmount, alertThresholdPercent } : b
        );
      }
      const catSpent = transactions
        .filter((t) => t.type === 'expense' && (t.mainCategory === category || t.category === category))
        .reduce((sum, t) => sum + t.amount, 0);

      const newB: Budget = {
        id: uid('b'),
        category,
        limitAmount,
        spentAmount: catSpent,
        period: 'monthly',
        alertThresholdPercent,
      };
      return [...prev, newB];
    });
  };

  const deleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const addGoal = (goalData: Omit<SavingsGoal, 'id'>) => {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: uid('g'),
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  const contributeToGoal = (goalId: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const newCurrent = Math.min(g.targetAmount, g.currentAmount + amount);
          return { ...g, currentAmount: newCurrent };
        }
        return g;
      })
    );
  };

  const withdrawFromGoal = (goalId: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const newCurrent = Math.max(0, g.currentAmount - amount);
          return { ...g, currentAmount: newCurrent };
        }
        return g;
      })
    );
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const addBorrowLendItem = (
    itemData: Omit<BorrowLendItem, 'id' | 'createdAt' | 'repaidAmount' | 'status'>
  ) => {
    const newEntry: BorrowLendEntry = {
      id: uid('e'),
      date: new Date().toISOString(),
      type: itemData.type === 'borrowed' ? 'borrowed' : 'lent',
      amount: itemData.totalAmount,
      notes: itemData.notes || 'Initial record',
    };

    const newItem: BorrowLendItem = {
      ...itemData,
      id: uid('bl'),
      repaidAmount: 0,
      waivedAmount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      entries: [newEntry],
    };
    setBorrowLend((prev) => [newItem, ...prev]);
  };

  const recordRepayment = (id: string, amount: number) => {
    addBorrowLendEntry(id, 'repaid', amount, 'Repayment received/paid');
  };

  const addBorrowLendEntry = (
    personId: string,
    entryType: 'lent' | 'borrowed' | 'repaid' | 'waived',
    amount: number,
    notes?: string
  ) => {
    setBorrowLend((prev) =>
      prev.map((item) => {
        if (item.id === personId) {
          const newEntry: BorrowLendEntry = {
            id: uid('e'),
            date: new Date().toISOString(),
            type: entryType,
            amount,
            notes,
          };

          let newTotal = item.totalAmount;
          let newRepaid = item.repaidAmount;
          let newWaived = item.waivedAmount || 0;

          if (entryType === 'lent' || entryType === 'borrowed') {
            newTotal += amount;
          } else if (entryType === 'repaid') {
            newRepaid += amount;
          } else if (entryType === 'waived') {
            newWaived += amount;
          }

          const outstanding = newTotal - newRepaid - newWaived;
          const status = outstanding <= 0 ? 'settled' : 'active';

          return {
            ...item,
            totalAmount: newTotal,
            repaidAmount: newRepaid,
            waivedAmount: newWaived,
            status,
            entries: [newEntry, ...(item.entries || [])],
          };
        }
        return item;
      })
    );
  };

  const waiveOffAmount = (personId: string, amount: number, notes = 'Amount waived off') => {
    addBorrowLendEntry(personId, 'waived', amount, notes);
  };

  const deleteBorrowLendItem = (id: string) => {
    setBorrowLend((prev) => prev.filter((b) => b.id !== id));
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updated }));
  };

  const exportBackup = () => repo.exportBackup();

  /**
   * BUGFIX: the old import restored only 5 of the 9 stores — hostel entries,
   * memories and saved accounts were silently dropped — and returned a bare
   * boolean, so the UI could not say why a restore failed.
   */
  const importBackup = (jsonStr: string) => {
    const result = repo.importBackup(jsonStr);
    if (result.ok) {
      repo.getInitialData().then((data) => {
        setTransactions(data.transactions);
        setBudgets(data.budgets);
        setGoals(data.goals);
        setBorrowLend(data.borrowLend);
        setFixedObligations(data.fixedObligations ?? []);
        setMemories(data.memories ?? []);
        setSavedAccounts(data.savedAccounts ?? []);
        setAccounts(data.financialAccounts ?? []);
        setHostelEntries(data.hostelEntries ?? []);
        setUserProfile(data.userProfile);
      });
    }
    return result;
  };

  // Gemini AI Service Integrations & Local Offline Rule-Engine
  const requestAiAnalysis = async () => {
    setIsAiThinking(true);
    try {
      // BUGFIX: no timeout meant that in the installed APK (where there is no
      // server at all) this request could hang for the platform default of
      // ~2 minutes with the spinner stuck on screen. It now gives up after 12s
      // and falls through to the offline analysis below.
      const res = await fetchWithTimeout('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, budgets, fixedObligations, borrowLend }),
      });
      if (!res.ok) throw new Error(`Analyze endpoint returned ${res.status}`);
      const data = await res.json();
      if (data.analysis) {
        setAiInsight(data.analysis);
      }
    } catch (e) {
      // Local fallback analysis if offline
      setAiInsight({
        healthScore: financialHealthScore,
        summary: `Offline Analysis: Your current net worth is ${userProfile.currencySymbol}${netWorth.toLocaleString()}. Fixed monthly bills take up ${userProfile.currencySymbol}${totalFixedObligationsAmount.toLocaleString()}.`,
        highlights: [
          `Monthly Income: ${userProfile.currencySymbol}${totalIncome.toLocaleString()}`,
          `Monthly Expenses: ${userProfile.currencySymbol}${totalExpense.toLocaleString()}`,
          `Fixed Obligations: ${userProfile.currencySymbol}${paidFixedObligationsAmount.toLocaleString()} paid of ${userProfile.currencySymbol}${totalFixedObligationsAmount.toLocaleString()}`,
        ],
        suggestions: [
          'Ensure your high-priority fixed bills like rent and utilities are settled first.',
          'Consider contributing any surplus directly into your active savings goals.',
        ],
        spendingHabitRisk: financialHealthScore > 70 ? 'low' : financialHealthScore > 50 ? 'medium' : 'high',
        predictedNextMonthExpense: Math.round(totalExpense * 1.05 + totalFixedObligationsAmount),
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  // Local Offline Financial Bot Helper function
  const processOfflineQuery = (text: string): string | null => {
    const lower = text.toLowerCase();

    if (lower.includes('balance') || lower.includes('net worth') || lower.includes('money i have')) {
      return `📊 **Offline Quick Stat**: Your current net balance is **${userProfile.currencySymbol}${netWorth.toLocaleString(
        undefined,
        { minimumFractionDigits: 2 }
      )}**.\n\n- Monthly Income: ${userProfile.currencySymbol}${totalIncome.toLocaleString()}\n- Monthly Spending: ${
        userProfile.currencySymbol
      }${totalExpense.toLocaleString()}\n- Outstanding Debt Net: ${userProfile.currencySymbol}${borrowLendNet.toLocaleString()}`;
    }

    if (lower.includes('income') || lower.includes('earned') || lower.includes('salary')) {
      return `💰 **Offline Income Stat**: You have recorded **${userProfile.currencySymbol}${totalIncome.toLocaleString(
        undefined,
        { minimumFractionDigits: 2 }
      )}** in total income this period across ${transactions.filter((t) => t.type === 'income').length} entries.`;
    }

    if (lower.includes('expense') || lower.includes('spending') || lower.includes('spent')) {
      return `💸 **Offline Expense Stat**: You have spent **${userProfile.currencySymbol}${totalExpense.toLocaleString(
        undefined,
        { minimumFractionDigits: 2 }
      )}** this period.\n\nYour highest spending category is **${
        budgets.length > 0 ? budgets[0].category : 'Food & Living'
      }**.`;
    }

    if (lower.includes('rent') || lower.includes('bill') || lower.includes('obligation') || lower.includes('fixed')) {
      const unpaid = fixedObligations.filter((o) => !o.isPaid);
      return `📑 **Fixed Bills Overview**:\n- Total Monthly Bills: **${
        userProfile.currencySymbol
      }${totalFixedObligationsAmount.toLocaleString()}**\n- Paid So Far: **${
        userProfile.currencySymbol
      }${paidFixedObligationsAmount.toLocaleString()}**\n- Pending Unpaid Bills: **${
        unpaid.length
      }** (${unpaid.map((u) => u.title).join(', ') || 'None'})`;
    }

    if (lower.includes('borrow') || lower.includes('lend') || lower.includes('debt') || lower.includes('owe')) {
      return `🤝 **Borrow & Lend Overview**:\n- Total Lent (Money owed to you): **${
        userProfile.currencySymbol
      }${totalLent.toLocaleString()}**\n- Total Borrowed (Money you owe): **${
        userProfile.currencySymbol
      }${totalBorrowed.toLocaleString()}**\n- Net Debt Balance: **${
        userProfile.currencySymbol
      }${borrowLendNet.toLocaleString()}**`;
    }

    if (lower.includes('score') || lower.includes('health') || lower.includes('audit')) {
      return `🛡️ **Financial Health Score**: **${financialHealthScore}/100**\n\nYour financial status is stable. Keep spending below your income threshold and ensure monthly bills are completed on time.`;
    }

    if (lower.includes('goal') || lower.includes('saving')) {
      return `🎯 **Savings Goals Summary**:\nYou have **${goals.length} active savings goals**.\n${goals
        .map(
          (g) =>
            `• ${g.title}: ${userProfile.currencySymbol}${g.currentAmount.toLocaleString()} / ${
              userProfile.currencySymbol
            }${g.targetAmount.toLocaleString()} (${Math.round((g.currentAmount / g.targetAmount) * 100)}%)`
        )
        .join('\n')}`;
    }

    return null;
  };

  const sendAiChatMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMsg: ChatMessage = {
      id: uid('user'),
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiChatMessages((prev) => [...prev, userMsg]);
    setIsAiThinking(true);

    // First check if user query can be fulfilled offline instantly
    const offlineReply = processOfflineQuery(messageText);

    if (offlineReply && !navigator.onLine) {
      setTimeout(() => {
        setAiChatMessages((prev) => [
          ...prev,
          {
            id: uid('ai-off'),
            sender: 'assistant',
            text: offlineReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOfflineResponse: true,
          },
        ]);
        setIsAiThinking(false);
      }, 300);
      return;
    }

    try {
      const userContext = {
        balance: netWorth,
        monthlyIncome: totalIncome,
        monthlyExpenses: totalExpense,
        fixedBillsTotal: totalFixedObligationsAmount,
        fixedBillsPaid: paidFixedObligationsAmount,
        budgetCount: budgets.length,
        goalCount: goals.length,
        borrowLendNet,
        totalLent,
        totalBorrowed,
        healthScore: financialHealthScore,
      };

      const res = await fetchWithTimeout('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...aiChatMessages, userMsg].map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            content: m.text,
          })),
          userContext,
        }),
      });

      if (!res.ok) throw new Error(`Chat endpoint returned ${res.status}`);
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: uid('ai'),
        sender: 'assistant',
        text: data.reply || offlineReply || 'I analyzed your financial prompt. Keep tracking your daily transactions!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setAiChatMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      // NOTE: reaching this branch means the AI SERVER did not answer. It does
      // NOT mean the device is offline — in the installed APK there is no server
      // bundled at all, so this path is the normal case. The old copy told users
      // to "connect to internet" here, which is why a phone on working Wi-Fi was
      // constantly being told it had no connection.
      console.info('[My Paisa] AI server unavailable; using on-device engine.', e);
      const fallbackText =
        offlineReply ||
        `**On-device mode** — answering from the records stored on your phone.\n\n- Current Balance: **${userProfile.currencySymbol}${netWorth.toLocaleString()}**\n- Monthly Income: **${userProfile.currencySymbol}${totalIncome.toLocaleString()}**\n- Monthly Expenses: **${userProfile.currencySymbol}${totalExpense.toLocaleString()}**\n- Financial Score: **${financialHealthScore}/100**\n\nThese figures come straight from your device, so they are accurate offline.`;

      const errorMsg: ChatMessage = {
        id: uid('err'),
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOfflineResponse: true,
      };
      setAiChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <FinancialContext.Provider
      value={{
        transactions,
        pendingTransactions,
        budgets,
        goals,
        borrowLend,
        fixedObligations,
        memories,
        savedAccounts,
        accounts,
        hostelEntries,
        userProfile,
        activeTab,
        isMobileFrame,
        isLoading,
        storageBackend,
        storageDurable,
        isUnlocked,
        unlockApp,
        lockApp,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isQuickAddModalOpen,
        setIsQuickAddModalOpen,
        isPendingReviewOpen,
        setIsPendingReviewOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        totalIncome,
        totalExpense,
        netWorth,
        totalLent,
        totalBorrowed,
        borrowLendNet,
        financialHealthScore,
        lastMonthHealthScore,
        aiScoreDiff,
        totalFixedObligationsAmount,
        paidFixedObligationsAmount,
        totalAccountsBalance,
        needsAccountSetup,
        monthlyIncome,
        monthlyExpense,
        monthlyNet,
        resetToCleanData,
        loadDemoData,
        flushNow,
        setActiveTab,
        setIsMobileFrame,
        addTransaction,
        addQuickPendingTransaction,
        approvePendingTransaction,
        rejectPendingTransaction,
        deleteTransaction,
        updateTransaction,
        signUpAccount,
        signInAccount,
        signOutAccount,
        addAccount,
        renameAccount,
        setAccountBalance,
        deleteAccount,
        completeAccountSetup,
        skipAccountSetup,
        addMemory,
        deleteMemory,
        addHostelEntry,
        deleteHostelEntry,
        saveCustomCategory,
        addFixedObligation,
        toggleFixedObligationPaid,
        deleteFixedObligation,
        setBudget,
        deleteBudget,
        addGoal,
        contributeToGoal,
        withdrawFromGoal,
        deleteGoal,
        addBorrowLendItem,
        recordRepayment,
        addBorrowLendEntry,
        waiveOffAmount,
        deleteBorrowLendItem,
        updateProfile,
        exportBackup,
        importBackup,
        aiInsight,
        aiChatMessages,
        isAiThinking,
        requestAiAnalysis,
        sendAiChatMessage,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancials = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancials must be used within a FinancialProvider');
  }
  return context;
};

