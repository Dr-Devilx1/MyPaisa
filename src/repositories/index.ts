import { StorageEngine, MyPaisaStoreSchema } from '../database/indexed_db';
import {
  Transaction,
  Budget,
  SavingsGoal,
  BorrowLendItem,
  FixedObligation,
  UserProfile,
  FinancialMemory,
  UserAccount,
  TrackedItem,
  FinancialAccount,
} from '../types';

export class FinancialRepository {
  private storage = StorageEngine.getInstance();

  public async getInitialData(): Promise<MyPaisaStoreSchema> {
    return this.storage.loadAllData();
  }

  public saveTransactions(v: Transaction[]) { this.storage.saveTransactions(v); }
  public saveBudgets(v: Budget[]) { this.storage.saveBudgets(v); }
  public saveGoals(v: SavingsGoal[]) { this.storage.saveGoals(v); }
  public saveBorrowLend(v: BorrowLendItem[]) { this.storage.saveBorrowLend(v); }
  public saveFixedObligations(v: FixedObligation[]) { this.storage.saveFixedObligations(v); }
  public saveMemories(v: FinancialMemory[]) { this.storage.saveMemories(v); }
  public saveTrackedItems(v: TrackedItem[]) { this.storage.saveTrackedItems(v); }
  public saveAccounts(v: UserAccount[]) { this.storage.saveAccounts(v); }
  public saveFinancialAccounts(v: FinancialAccount[]) { this.storage.saveFinancialAccounts(v); }
  public saveProfile(v: UserProfile) { this.storage.saveUserProfile(v); }

  /** Await all queued writes — used before the app is backgrounded/closed. */
  public flush(): Promise<void> { return this.storage.flush(); }

  public exportBackup(): Promise<string> { return this.storage.exportBackupJSON(); }

  public importBackup(jsonStr: string) { return this.storage.importBackupJSON(jsonStr); }

  public loadDemoData(): MyPaisaStoreSchema { return this.storage.loadDemoData(); }

  public wipeAll(keepProfile: UserProfile): Promise<void> { return this.storage.wipeAll(keepProfile); }

  /** Diagnostics for the storage-health banner. */
  public get health() {
    return {
      backend: this.storage.backend,
      durable: this.storage.durable,
      lastError: this.storage.lastError,
    };
  }
}
