/**
 * My Paisa — Offline-First Storage Engine.
 *
 * ============================================================================
 *  WHY THIS FILE WAS REWRITTEN  (the "it starts from 0 every time" bug)
 * ============================================================================
 *  The previous version was named `indexed_db.ts` but never touched IndexedDB.
 *  It used localStorage only, and had three fatal flaws:
 *
 *  1. RE-SEED ON EMPTY.  `if (!txs || txs.length === 0) { ...seed... }`
 *     Any time the transaction list was empty, the engine overwrote EVERY
 *     store — budgets, goals, loans, memories, accounts AND the user profile —
 *     with hard-coded "Alex Rivers" demo data. Delete your last transaction,
 *     reopen the app, and your real data was gone.
 *
 *  2. SINGLE POINT OF FAILURE.  localStorage is evicted by Android WebView
 *     under storage pressure and is blocked entirely inside cross-origin
 *     iframes. It threw silently, the catch returned `null`, and that landed
 *     straight back on flaw #1.
 *
 *  3. NO FLUSH ON BACKGROUND.  Android kills backgrounded WebViews without
 *     warning. Writes issued in the final moments were lost.
 *
 *  This rewrite fixes all three:
 *    - IndexedDB is primary, localStorage is a mirror. A read falls through
 *      both, so losing one layer does not lose your data.
 *    - An explicit `seeded` flag in a meta record. Seeding happens exactly
 *      ONCE. An empty database is a legitimate state and is never refilled.
 *    - `flush()` is awaited on pagehide/visibilitychange (wired in context).
 *    - `navigator.storage.persist()` is requested so the OS will not evict us.
 * ============================================================================
 */

import {
  Transaction,
  Budget,
  SavingsGoal,
  BorrowLendItem,
  UserProfile,
  FixedObligation,
  FinancialMemory,
  UserAccount,
  TrackedItem,
  FinancialAccount,
} from '../types';

const DB_NAME = 'MyPaisaDB';
const DB_VERSION = 2;
const STORE = 'kv';
const LS_PREFIX = 'mypaisa_';

/**
 * The app was renamed from MoneyPilot to My Paisa, which changed both the
 * IndexedDB database name and the localStorage key prefix. Without a migration
 * that rename would orphan every existing record — the exact failure mode this
 * storage layer was rewritten to prevent. These are the old names.
 */
const LEGACY_LS_PREFIX = 'moneypilot_';
const LEGACY_DB_NAME = 'MoneyPilotDB';
const SCHEMA_VERSION = 2;

export interface MyPaisaStoreSchema {
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  borrowLend: BorrowLendItem[];
  fixedObligations: FixedObligation[];
  memories: FinancialMemory[];
  savedAccounts: UserAccount[];
  trackedItems: TrackedItem[];
  financialAccounts: FinancialAccount[];
  userProfile: UserProfile;
}

interface MetaRecord {
  seeded: boolean;
  schemaVersion: number;
  createdAt: string;
  lastWriteAt: string;
}

export type StorageBackend = 'indexeddb' | 'localstorage' | 'memory';

/* -------------------------------------------------------------------------- */
/*  Defaults                                                                   */
/* -------------------------------------------------------------------------- */

export const DEFAULT_PROFILE: UserProfile = {
  name: 'My Paisa User',
  username: 'pilot',
  email: '',
  avatarUrl: '',
  currencySymbol: 'Rs',
  currencyCode: 'PKR',
  isPinProtected: false,
  themeMode: 'dark',
  firebaseSyncEnabled: false,
  savedCustomCategories: [],
  isLoggedIn: true,
};

const EMPTY_DATA: MyPaisaStoreSchema = {
  transactions: [],
  budgets: [],
  goals: [],
  borrowLend: [],
  fixedObligations: [],
  memories: [],
  savedAccounts: [],
  trackedItems: [],
  financialAccounts: [],
  userProfile: DEFAULT_PROFILE,
};

/**
 * Demo data is now OPTIONAL, loaded on demand from Settings.
 * It is never force-written over real user records.
 */
export function buildDemoData(): MyPaisaStoreSchema {
  const day = 86400000;
  const iso = (offset: number) => new Date(Date.now() - offset * day).toISOString();

  const transactions: Transaction[] = [
    {
      id: 'demo-tx-1',
      title: 'Monthly Salary',
      amount: 120000,
      type: 'income',
      mainCategory: 'Income',
      subCategory: 'Salary',
      category: 'Income - Salary',
      date: iso(2),
      paymentMethod: 'Bank Transfer',
      notes: 'Direct deposit for the current month',
      tags: ['salary'],
      createdAt: iso(2),
      updatedAt: iso(2),
    },
    {
      id: 'demo-tx-2',
      title: 'Grocery Shopping',
      amount: 8450,
      type: 'expense',
      mainCategory: 'Food & Living',
      subCategory: 'Groceries',
      category: 'Food & Living - Groceries',
      date: iso(1),
      paymentMethod: 'Cash',
      notes: 'Weekly kitchen supplies',
      tags: ['groceries'],
      createdAt: iso(1),
      updatedAt: iso(1),
    },
    {
      id: 'demo-tx-3',
      title: 'Freelance Project',
      amount: 35000,
      type: 'income',
      mainCategory: 'Income',
      subCategory: 'Freelance',
      category: 'Income - Freelance',
      date: iso(0),
      paymentMethod: 'Digital Wallet',
      notes: 'Client milestone payment',
      tags: ['freelance'],
      createdAt: iso(0),
      updatedAt: iso(0),
    },
    {
      id: 'demo-tx-4',
      title: 'Electricity Bill',
      amount: 6200,
      type: 'expense',
      mainCategory: 'Housing & Utilities',
      subCategory: 'Electricity',
      category: 'Housing & Utilities - Electricity',
      date: iso(4),
      paymentMethod: 'Bank Transfer',
      notes: 'Monthly utility bill',
      tags: ['utilities'],
      createdAt: iso(4),
      updatedAt: iso(4),
    },
    {
      id: 'demo-tx-5',
      title: 'Charity Donation',
      amount: 5000,
      type: 'expense',
      mainCategory: 'Donations & Charity',
      subCategory: 'Sadaqah',
      category: 'Donations & Charity - Sadaqah',
      date: iso(3),
      paymentMethod: 'Cash',
      notes: 'Monthly donation',
      tags: ['charity'],
      createdAt: iso(3),
      updatedAt: iso(3),
    },
  ];

  const budgets: Budget[] = [
    { id: 'demo-b-1', category: 'Food & Living', limitAmount: 30000, spentAmount: 0, period: 'monthly', alertThresholdPercent: 80 },
    { id: 'demo-b-2', category: 'Housing & Utilities', limitAmount: 25000, spentAmount: 0, period: 'monthly', alertThresholdPercent: 90 },
    { id: 'demo-b-3', category: 'Transportation', limitAmount: 12000, spentAmount: 0, period: 'monthly', alertThresholdPercent: 80 },
    { id: 'demo-b-4', category: 'Donations & Charity', limitAmount: 10000, spentAmount: 0, period: 'monthly', alertThresholdPercent: 80 },
  ];

  const goals: SavingsGoal[] = [
    {
      id: 'demo-g-1',
      title: 'Emergency Fund',
      targetAmount: 300000,
      currentAmount: 85000,
      deadline: '2026-12-31',
      category: 'Safety',
      icon: 'Shield',
      color: '#10B981',
      notes: 'Six months of running costs kept liquid.',
    },
    {
      id: 'demo-g-2',
      title: 'New Laptop',
      targetAmount: 250000,
      currentAmount: 60000,
      deadline: '2026-11-15',
      category: 'Tech',
      icon: 'Laptop',
      color: '#3B82F6',
      notes: 'Development machine upgrade.',
    },
  ];

  const fixedObligations: FixedObligation[] = [
    { id: 'demo-obl-1', title: 'House Rent', amount: 45000, dueDateDay: 1, category: 'Housing & Utilities', isPaid: true, lastPaidDate: iso(20), notes: 'Fixed monthly rent' },
    { id: 'demo-obl-2', title: 'Internet Package', amount: 3500, dueDateDay: 10, category: 'Housing & Utilities', isPaid: true, lastPaidDate: iso(12), notes: 'Fiber connection' },
    { id: 'demo-obl-3', title: 'Mobile Package', amount: 1500, dueDateDay: 18, category: 'Housing & Utilities', isPaid: false, notes: 'Monthly bundle' },
  ];

  const borrowLend: BorrowLendItem[] = [
    {
      id: 'demo-bl-1',
      personName: 'Ali',
      type: 'lent',
      totalAmount: 15000,
      repaidAmount: 5000,
      waivedAmount: 0,
      dueDate: '2026-09-15',
      contactPhone: '',
      notes: 'Short-term help',
      status: 'active',
      createdAt: iso(10),
      entries: [
        { id: 'demo-e-1', date: iso(10), type: 'lent', amount: 15000, notes: 'Initial amount lent' },
        { id: 'demo-e-2', date: iso(3), type: 'repaid', amount: 5000, notes: 'First instalment received' },
      ],
    },
  ];

  const memories: FinancialMemory[] = [
    {
      id: 'demo-mem-1',
      title: 'First Emergency Fund Milestone',
      date: new Date(Date.now() - 180 * day).toISOString().split('T')[0],
      type: 'milestone',
      amount: 50000,
      category: 'Safety Net',
      effortDays: 180,
      effortNote: 'Set aside a fixed share of every payment for six months.',
      createdAt: iso(180),
    },
  ];

  const financialAccounts: FinancialAccount[] = [
    { id: 'demo-acc-1', name: 'Meezan Bank', type: 'bank', balance: 145000, createdAt: iso(300) },
    { id: 'demo-acc-2', name: 'NayaPay', type: 'wallet', balance: 12500, createdAt: iso(300) },
    { id: 'demo-acc-3', name: 'JazzCash', type: 'wallet', balance: 4300, createdAt: iso(300) },
    { id: 'demo-acc-4', name: 'Cash in Hand', type: 'cash', balance: 3000, createdAt: iso(300) },
  ];

  const trackedItems: TrackedItem[] = [
    {
      id: 'demo-item-1',
      name: 'Lays Chips',
      unit: 'packs',
      currentQuantity: 3,
      createdAt: iso(20),
      logs: [
        { id: 'demo-il-2', type: 'consume', quantity: 3, date: iso(5) },
        { id: 'demo-il-1', type: 'restock', quantity: 6, date: iso(20), cost: 600, notes: 'Bought a box' },
      ],
    },
    {
      id: 'demo-item-2',
      name: 'Digestive Biscuits',
      unit: 'packs',
      currentQuantity: 1,
      createdAt: iso(15),
      logs: [
        { id: 'demo-il-4', type: 'consume', quantity: 1, date: iso(2) },
        { id: 'demo-il-3', type: 'restock', quantity: 2, date: iso(15), cost: 280 },
      ],
    },
  ];

  return {
    ...EMPTY_DATA,
    transactions,
    budgets,
    goals,
    borrowLend,
    fixedObligations,
    memories,
    trackedItems,
    savedAccounts: [],
    financialAccounts,
    userProfile: { ...DEFAULT_PROFILE, hasCompletedAccountSetup: true },
  };
}

/* -------------------------------------------------------------------------- */
/*  Engine                                                                     */
/* -------------------------------------------------------------------------- */

export class StorageEngine {
  private static instance: StorageEngine;

  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase | null> | null = null;
  private memory = new Map<string, unknown>();
  private pending = new Set<Promise<unknown>>();

  /** Which backend accepted the last write. Surfaced in the UI. */
  public backend: StorageBackend = 'memory';
  /** True once a durable backend is confirmed working. */
  public durable = false;
  public lastError: string | null = null;

  private constructor() {}

  public static getInstance(): StorageEngine {
    if (!StorageEngine.instance) StorageEngine.instance = new StorageEngine();
    return StorageEngine.instance;
  }

  /* ---------------------------- IndexedDB core ---------------------------- */

  private openDb(): Promise<IDBDatabase | null> {
    if (this.dbReady) return this.dbReady;

    this.dbReady = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      let settled = false;
      // Some Android WebViews hang on open(); never block the UI on it.
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 4000);

      const finish = (value: IDBDatabase | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };

      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => {
          this.db = req.result;
          this.db.onversionchange = () => {
            this.db?.close();
            this.db = null;
            this.dbReady = null;
          };
          finish(this.db);
        };
        req.onerror = () => {
          this.lastError = req.error?.message ?? 'IndexedDB open failed';
          finish(null);
        };
        req.onblocked = () => finish(null);
      } catch (e) {
        this.lastError = String(e);
        finish(null);
      }
    });

    return this.dbReady;
  }

  private async idbGet<T>(key: string): Promise<T | null> {
    const db = await this.openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private async idbSet(key: string, value: unknown): Promise<boolean> {
    const db = await this.openDb();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /* --------------------------- localStorage mirror ------------------------ */

  private lsGet<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw) return JSON.parse(raw) as T;
      // Fall back to the pre-rename key so upgrading users keep their history.
      const legacy = localStorage.getItem(LEGACY_LS_PREFIX + key);
      return legacy ? (JSON.parse(legacy) as T) : null;
    } catch {
      return null;
    }
  }

  /** Reads a key out of the pre-rename IndexedDB database, if one exists. */
  private legacyIdbGet<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      let settled = false;
      const done = (v: T | null) => { if (!settled) { settled = true; resolve(v); } };
      const timer = setTimeout(() => done(null), 3000);

      try {
        const req = indexedDB.open(LEGACY_DB_NAME);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) { clearTimeout(timer); db.close(); return done(null); }
          try {
            const tx = db.transaction(STORE, 'readonly');
            const get = tx.objectStore(STORE).get(key);
            get.onsuccess = () => { clearTimeout(timer); db.close(); done((get.result as T) ?? null); };
            get.onerror = () => { clearTimeout(timer); db.close(); done(null); };
          } catch { clearTimeout(timer); db.close(); done(null); }
        };
        req.onerror = () => { clearTimeout(timer); done(null); };
        req.onblocked = () => { clearTimeout(timer); done(null); };
      } catch { clearTimeout(timer); done(null); }
    });
  }

  private lsSet(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      // QuotaExceededError, or storage blocked in a partitioned iframe.
      this.lastError = String(e);
      return false;
    }
  }

  /* ------------------------------ read / write ---------------------------- */

  /** Read a key: IndexedDB -> localStorage -> in-memory. */
  private async read<T>(key: string): Promise<T | null> {
    const fromIdb = await this.idbGet<T>(key);
    if (fromIdb !== null && fromIdb !== undefined) {
      this.memory.set(key, fromIdb);
      return fromIdb;
    }
    const fromLs = this.lsGet<T>(key);
    if (fromLs !== null && fromLs !== undefined) {
      this.memory.set(key, fromLs);
      void this.idbSet(key, fromLs); // heal IndexedDB from the mirror
      return fromLs;
    }

    // Last resort: the pre-rename IndexedDB database. Anything found is copied
    // forward into the new store so this path is only ever taken once.
    const fromLegacy = await this.legacyIdbGet<T>(key);
    if (fromLegacy !== null && fromLegacy !== undefined) {
      this.memory.set(key, fromLegacy);
      this.write(key, fromLegacy);
      return fromLegacy;
    }

    return (this.memory.get(key) as T) ?? null;
  }

  /** Write to BOTH durable layers; tracked so `flush()` can await it. */
  private write(key: string, value: unknown): void {
    this.memory.set(key, value);

    const lsOk = this.lsSet(key, value);
    if (lsOk) {
      this.durable = true;
      if (this.backend === 'memory') this.backend = 'localstorage';
    }

    const job = this.idbSet(key, value).then((ok) => {
      if (ok) {
        this.durable = true;
        this.backend = 'indexeddb';
      } else if (!lsOk) {
        this.backend = 'memory';
        this.durable = false;
      }
      return ok;
    });

    this.pending.add(job);
    void job.finally(() => this.pending.delete(job));
  }

  /** Await every in-flight write. Call before the app is backgrounded. */
  public async flush(): Promise<void> {
    await Promise.all([...this.pending]);
  }

  /** Ask the OS not to evict our data under storage pressure. */
  public async requestPersistence(): Promise<boolean> {
    try {
      if (navigator.storage?.persist) {
        if (await navigator.storage.persisted()) return true;
        return await navigator.storage.persist();
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  private async readMeta(): Promise<MetaRecord | null> {
    return this.read<MetaRecord>('__meta');
  }

  private writeMeta(seeded: boolean): void {
    const meta: MetaRecord = {
      seeded,
      schemaVersion: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      lastWriteAt: new Date().toISOString(),
    };
    this.write('__meta', meta);
  }

  /**
   * Load everything.
   *
   * KEY BEHAVIOUR CHANGE: seeding is driven by the `seeded` meta flag, never by
   * "is the transactions array empty". An empty app is a valid app.
   */
  public async loadAllData(): Promise<MyPaisaStoreSchema> {
    try {
      await this.openDb();
      void this.requestPersistence();

      const meta = await this.readMeta();

      const [
        transactions,
        budgets,
        goals,
        borrowLend,
        fixedObligations,
        memories,
        savedAccounts,
        trackedItems,
        financialAccounts,
        userProfile,
      ] = await Promise.all([
        this.read<Transaction[]>('transactions'),
        this.read<Budget[]>('budgets'),
        this.read<SavingsGoal[]>('goals'),
        this.read<BorrowLendItem[]>('borrowLend'),
        this.read<FixedObligation[]>('fixedObligations'),
        this.read<FinancialMemory[]>('memories'),
        this.read<UserAccount[]>('savedAccounts'),
        this.read<TrackedItem[]>('trackedItems'),
        this.read<FinancialAccount[]>('financialAccounts'),
        this.read<UserProfile>('profile'),
      ]);

      const hasAnything =
        (transactions && transactions.length > 0) ||
        (budgets && budgets.length > 0) ||
        (goals && goals.length > 0) ||
        (borrowLend && borrowLend.length > 0) ||
        (fixedObligations && fixedObligations.length > 0) ||
        (memories && memories.length > 0) ||
        (trackedItems && trackedItems.length > 0) ||
        (financialAccounts && financialAccounts.length > 0) ||
        !!userProfile;

      // Genuine first launch: nothing on disk, no meta record.
      if (!meta && !hasAnything) {
        this.writeMeta(true);
        const blank: MyPaisaStoreSchema = { ...EMPTY_DATA, userProfile: { ...DEFAULT_PROFILE } };
        this.saveAll(blank);
        return blank;
      }

      // Returning user (or a v1 install being upgraded).
      if (!meta) this.writeMeta(true);

      return {
        transactions: this.asArray(transactions),
        budgets: this.asArray(budgets),
        goals: this.asArray(goals),
        borrowLend: this.asArray(borrowLend),
        fixedObligations: this.asArray(fixedObligations),
        memories: this.asArray(memories),
        savedAccounts: this.asArray(savedAccounts),
        trackedItems: this.asArray(trackedItems),
        financialAccounts: this.asArray(financialAccounts),
        userProfile: { ...DEFAULT_PROFILE, ...(userProfile ?? {}) },
      };
    } catch (e) {
      // Never seed on error — that is exactly what destroyed data before.
      this.lastError = String(e);
      console.error('[My Paisa] Storage load error:', e);
      return { ...EMPTY_DATA, userProfile: { ...DEFAULT_PROFILE } };
    }
  }

  /** Defensive: a corrupted record must not crash the app. */
  private asArray<T>(value: T[] | null): T[] {
    return Array.isArray(value) ? value : [];
  }

  public saveAll(data: MyPaisaStoreSchema): void {
    this.saveTransactions(data.transactions);
    this.saveBudgets(data.budgets);
    this.saveGoals(data.goals);
    this.saveBorrowLend(data.borrowLend);
    this.saveFixedObligations(data.fixedObligations);
    this.saveMemories(data.memories);
    this.saveAccounts(data.savedAccounts);
    this.saveTrackedItems(data.trackedItems);
    this.saveFinancialAccounts(data.financialAccounts);
    this.saveUserProfile(data.userProfile);
  }

  public saveTransactions(v: Transaction[]) { this.write('transactions', v); }
  public saveBudgets(v: Budget[]) { this.write('budgets', v); }
  public saveGoals(v: SavingsGoal[]) { this.write('goals', v); }
  public saveBorrowLend(v: BorrowLendItem[]) { this.write('borrowLend', v); }
  public saveFixedObligations(v: FixedObligation[]) { this.write('fixedObligations', v); }
  public saveMemories(v: FinancialMemory[]) { this.write('memories', v); }
  public saveAccounts(v: UserAccount[]) { this.write('savedAccounts', v); }
  public saveTrackedItems(v: TrackedItem[]) { this.write('trackedItems', v); }
  public saveFinancialAccounts(v: FinancialAccount[]) { this.write('financialAccounts', v); }
  public saveUserProfile(v: UserProfile) { this.write('profile', v); }

  /* ------------------------------- backup -------------------------------- */

  public async exportBackupJSON(): Promise<string> {
    const data = await this.loadAllData();
    return JSON.stringify(
      {
        appName: 'My Paisa',
        brand: 'SIHFZ',
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        ...data,
      },
      null,
      2
    );
  }

  /**
   * Restore a backup. Returns a result object rather than a bare boolean so
   * the UI can explain WHY an import failed.
   */
  public importBackupJSON(jsonStr: string): { ok: boolean; message: string; restored: number } {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return { ok: false, message: 'That file is not valid JSON.', restored: 0 };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, message: 'Backup file is empty or malformed.', restored: 0 };
    }

    const arrays: Array<[string, (v: never[]) => void]> = [
      ['transactions', (v) => this.saveTransactions(v)],
      ['budgets', (v) => this.saveBudgets(v)],
      ['goals', (v) => this.saveGoals(v)],
      ['borrowLend', (v) => this.saveBorrowLend(v)],
      ['fixedObligations', (v) => this.saveFixedObligations(v)],
      ['memories', (v) => this.saveMemories(v)],
      ['savedAccounts', (v) => this.saveAccounts(v)],
      ['trackedItems', (v) => this.saveTrackedItems(v)],
      ['financialAccounts', (v) => this.saveFinancialAccounts(v)],
    ];

    let restored = 0;
    for (const [key, setter] of arrays) {
      const value = parsed[key];
      if (Array.isArray(value)) {
        setter(value as never[]);
        restored += value.length;
      }
    }

    // Accept both the new (`userProfile`) and legacy (`profile`) key names.
    const profile = (parsed.userProfile ?? parsed.profile) as UserProfile | undefined;
    if (profile && typeof profile === 'object') {
      this.saveUserProfile({ ...DEFAULT_PROFILE, ...profile });
    }

    if (restored === 0 && !profile) {
      return { ok: false, message: 'No My Paisa records were found in that file.', restored: 0 };
    }

    this.writeMeta(true);
    return { ok: true, message: `Restored ${restored} record(s) successfully.`, restored };
  }

  /** Load the optional demo dataset on request (Settings screen). */
  public loadDemoData(): MyPaisaStoreSchema {
    const demo = buildDemoData();
    this.saveAll(demo);
    this.writeMeta(true);
    return demo;
  }

  /** Wipe everything, keeping the profile. */
  public async wipeAll(keepProfile: UserProfile): Promise<void> {
    const blank: MyPaisaStoreSchema = { ...EMPTY_DATA, userProfile: keepProfile };
    this.saveAll(blank);
    this.writeMeta(true);
    await this.flush();
  }
}
