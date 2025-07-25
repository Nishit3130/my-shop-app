import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { ExternalAccount } from '../models/external-account.model';
import { ExternalLedgerEntry, EntryType } from '../models/external-entry.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExternalLedgerService {
  private readonly ACCOUNTS_KEY = 'external_accounts';
  private readonly ENTRIES_KEY = 'external_entries';
  private storageService = inject(StorageService);

  private accountsSubject = new BehaviorSubject<ExternalAccount[]>([]);
  public accounts$: Observable<ExternalAccount[]> = this.accountsSubject.asObservable();
  
  private entriesSubject = new BehaviorSubject<ExternalLedgerEntry[]>([]);
  public entries$: Observable<ExternalLedgerEntry[]> = this.entriesSubject.asObservable();

  constructor() {
    this.accountsSubject.next(this.storageService.getData(this.ACCOUNTS_KEY) || []);
    // Ensure all loaded entries have date as Date object
    const rawEntries = this.storageService.getData(this.ENTRIES_KEY) || [];
    const entries = rawEntries.map((e: any) => ({ ...e, date: new Date(e.date), createdAt: new Date(e.createdAt) }));
    this.entriesSubject.next(entries);
  }

  private saveAccountsAndNotify(accounts: ExternalAccount[]): void {
    this.storageService.saveData(this.ACCOUNTS_KEY, accounts);
    this.accountsSubject.next([...accounts]);
  }

  private saveEntriesAndNotify(entries: ExternalLedgerEntry[]): void {
    this.storageService.saveData(this.ENTRIES_KEY, entries);
    this.entriesSubject.next([...entries]);
  }

  getAccounts(): ExternalAccount[] {
    return this.accountsSubject.getValue();
  }

  getAccountById(id: string): ExternalAccount | undefined {
    return this.getAccounts().find(acc => acc.id === id);
  }

  addAccount(accountData: Omit<ExternalAccount, 'id' | 'balance' | 'createdAt' | 'updatedAt'>): ExternalAccount {
    const accounts = this.getAccounts();
    const newAccount: ExternalAccount = {
      ...accountData,
      id: this.storageService.generateId(),
      balance: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.saveAccountsAndNotify([...accounts, newAccount]);
    return newAccount;
  }
  
  updateAccount(id: string, updateData: Partial<Omit<ExternalAccount, 'id' | 'createdAt'>>): ExternalAccount | null {
    const accounts = this.getAccounts();
    const index = accounts.findIndex(acc => acc.id === id);
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updateData, updatedAt: new Date() };
      this.saveAccountsAndNotify([...accounts]);
      return accounts[index];
    }
    return null;
  }

  deleteAccount(id: string): boolean {
    const accounts = this.getAccounts();
    const filteredAccounts = accounts.filter(acc => acc.id !== id);
    if (accounts.length === filteredAccounts.length) {
      return false;
    }
    this.saveAccountsAndNotify(filteredAccounts);

    const allEntries = this.entriesSubject.getValue();
    const filteredEntries = allEntries.filter((entry) => entry.accountId !== id);
    this.saveEntriesAndNotify(filteredEntries);
    return true;
  }
  
  private updateAccountBalance(accountId: string, amount: number): ExternalAccount | null {
    const account = this.getAccountById(accountId);
    if(account) {
      const newBalance = account.balance + amount;
      return this.updateAccount(accountId, { balance: newBalance });
    }
    return null;
  }

  getEntriesForAccount(accountId: string): ExternalLedgerEntry[] {
    return this.entriesSubject.getValue()
      .filter((entry) => entry.accountId === accountId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  addEntry(entryData: Omit<ExternalLedgerEntry, 'id' | 'createdAt'>): ExternalLedgerEntry | null {
    const amountChange = entryData.type === EntryType.DEBIT ? entryData.amount : -entryData.amount;
    const account = this.updateAccountBalance(entryData.accountId, amountChange);
    
    if (!account) {
      throw new Error("Account not found for this entry.");
    }

    const allEntries = this.entriesSubject.getValue();
    const newEntry: ExternalLedgerEntry = {
      ...entryData,
      id: this.storageService.generateId(),
      createdAt: new Date(),
    };
    this.saveEntriesAndNotify([...allEntries, newEntry]);
    return newEntry;
  }

  deleteEntry(entryId: string): boolean {
    const allEntries = this.entriesSubject.getValue();
    const entryIndex = allEntries.findIndex((e) => e.id === entryId);

    if (entryIndex === -1) {
      return false;
    }
    
    const entryToDelete = allEntries[entryIndex];
    const amountToRevert = entryToDelete.type === EntryType.DEBIT ? -entryToDelete.amount : entryToDelete.amount;
    
    this.updateAccountBalance(entryToDelete.accountId, amountToRevert);

    const updatedEntries = allEntries.filter(e => e.id !== entryId);
    this.saveEntriesAndNotify(updatedEntries);
    
    return true;
  }

  public getAllEntries(): ExternalLedgerEntry[] {
    return this.entriesSubject.getValue();
  }
}