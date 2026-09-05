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
  /** Base price before tax/fee — `amount` stays the actual total charged. */
  baseAmount?: number;
  /** Tax, delivery fee, service charge etc. included in `amount`. */
  taxFeeAmount?: number;
  /** Photos of the bill/receipt, stored as compressed data URLs. */
  receiptImages?: string[];
  /** Legacy single-photo field. Still read so older records and backups keep
   *  showing their receipt; new records only ever write `receiptImages`. */
  receiptImage?: string;
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
  /** User's own free Gemini API key — enables real-time AI chat directly
   *  from the device, with no server required (works inside the APK). */
  geminiApiKey?: string;
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

/** A single restock or consumption event against a tracked item. */
export type ItemLogType = 'restock' | 'consume';

export interface ItemLogEntry {
  id: string;
  type: ItemLogType;
  quantity: number;
  date: string; // ISO string
  /** Money spent on this restock. Not meaningful for a 'consume' entry. */
  cost?: number;
  notes?: string;
}

/** A simple consumable stock item — snacks, toiletries, anything bought in
 *  bulk and used up over time (e.g. "Lays Chips", "Digestive Biscuits"). */
export interface TrackedItem {
  id: string;
  name: string;
  unit: string; // e.g. "packs", "pcs", "bottles"
  currentQuantity: number;
  createdAt: string;
  logs: ItemLogEntry[];
}
