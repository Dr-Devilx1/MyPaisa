export type TransactionType = 'income' | 'expense' | 'borrow' | 'lend';

export type MainCategory =
  | 'Income'
  | 'Housing & Utilities'
  | 'Food & Living'
  | 'Transportation'
  | 'Health & Medical'
  | 'Shopping & Personal'
  | 'Entertainment & Travel'
  | 'Education & Work'
  | 'Donations & Charity'
  | 'Loans & Debts'
  | 'OTHERS';

export type TransactionCategory =
  | MainCategory
  | 'Salary'
  | 'Business'
  | 'Investments'
  | 'Freelance'
  | 'Food & Dining'
  | 'Shopping'
  | 'Housing & Rent'
  | 'Utilities'
  | 'Healthcare'
  | 'Entertainment'
  | 'Education'
  | 'Travel'
  | 'Subscriptions'
  | 'Donations'
  | 'Zakat'
  | 'Sadaqah'
  | 'Charity Drive'
  | 'Religious Offering'
  | 'Community Relief'
  | 'Other';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  mainCategory: MainCategory;
  subCategory?: string;
  customCategoryTitle?: string;
  category: string; // Display fallback string
  date: string; // ISO String
  notes?: string;
  paymentMethod: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Digital Wallet' | 'Other';
  /** Which bank/wallet/cash account this moved money into or out of, if any. */
  accountId?: string;
  tags?: string[];
  isPending?: boolean;
  pendingNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialMemory {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'goal_completed' | 'major_purchase' | 'milestone' | 'effort';
  amount: number;
  category: string;
  effortDays?: number;
  effortNote?: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
  pinCode?: string;
  createdAt: string;
}

/** A place money physically lives — a bank account, a digital wallet, or cash. */
export type FinancialAccountType = 'bank' | 'wallet' | 'cash';

export interface FinancialAccount {
  id: string;
  name: string; // e.g. "Meezan Bank", "NayaPay", "JazzCash", "Cash in Hand"
  type: FinancialAccountType;
  balance: number;
  createdAt: string;
}

export interface FixedObligation {

  id: string;
  title: string; // e.g. "Monthly Rent", "Wifi Bill", "Electricity"
  amount: number;
  dueDateDay: number; // Day of month 1..31
  category: MainCategory;
  isPaid: boolean;
  lastPaidDate?: string;
  notes?: string;
}

export interface Budget {
  id: string;
  category: MainCategory | string;
  limitAmount: number;
  spentAmount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  alertThresholdPercent: number; // e.g. 80 for 80%
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
  category: string;
  icon: string;
  color: string;
  notes?: string;
}

export interface BorrowLendEntry {
  id: string;
  date: string;
  type: 'lent' | 'borrowed' | 'repaid' | 'waived';
  amount: number;
  notes?: string;
}

export interface BorrowLendItem {
  id: string;
  personName: string;
  type: 'borrowed' | 'lent'; // borrowed = money you owe someone else; lent = someone owes you
  totalAmount: number;
  repaidAmount: number;
  waivedAmount?: number;
  dueDate: string;
  contactPhone?: string;
  notes?: string;
  status: 'active' | 'settled';
  createdAt: string;
  entries?: BorrowLendEntry[];
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  avatarUrl: string;
  currencySymbol: string;
  currencyCode: string;
  isPinProtected: boolean;
  pinCode?: string;
  themeMode: 'light' | 'dark' | 'system';
  firebaseSyncEnabled: boolean;
  lastSyncTimestamp?: string;
  savedCustomCategories?: string[];
  isLoggedIn?: boolean;

  /** Address used by Settings -> Email a Backup. */
  syncEmail?: string;
  /** ISO timestamp of the last successful backup export/share. */
  lastBackupAt?: string;
  /** Warn in Settings when a backup is older than this many days. 0 = off. */
  backupReminderDays?: number;
  /** Masks every money figure on screen. Toggled from the dashboard. */
  hideBalance?: boolean;
  /** True once the new-user "add your banks/wallets/cash" wizard has run (or been skipped). */
  hasCompletedAccountSetup?: boolean;
  /** Google account email once Drive backup is connected. */
  googleEmail?: string;
  /** ISO timestamp of the last successful Google Drive sync. */
  lastCloudSyncAt?: string;
}

export interface AiInsight {
  healthScore: number;
  summary: string;
  highlights: string[];
  suggestions: string[];
  spendingHabitRisk: 'low' | 'medium' | 'high';
  predictedNextMonthExpense: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isOfflineResponse?: boolean;
}

export interface HostelEntry {
  id: string;
  date: string; // YYYY-MM-DD
  breakfastAmount: number;
  breakfastNotes?: string;
  lunchAmount: number;
  lunchNotes?: string;
  dinnerAmount: number;
  dinnerNotes?: string;
  teaAmount: number;
  teaNotes?: string;
  laundryAmount: number;
  laundryNotes?: string;
  transportAmount: number;
  transportNotes?: string;
  messFeeAmount: number;
  messFeeNotes?: string;
  createdAt: string;
}

