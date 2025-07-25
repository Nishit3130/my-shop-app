import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { Transaction } from '../models/transaction.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly TRANSACTIONS_KEY = 'transactions';
  private storageService = inject(StorageService);

  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public transactions$: Observable<Transaction[]> = this.transactionsSubject.asObservable();

  constructor() {
    this.transactionsSubject.next(this.storageService.getData(this.TRANSACTIONS_KEY) || []);
  }

  private saveDataAndNotify(transactions: Transaction[]): void {
    this.storageService.saveData(this.TRANSACTIONS_KEY, transactions);
    this.transactionsSubject.next([...transactions]);
  }

  getTransactions(): Transaction[] {
    return this.transactionsSubject.getValue();
  }

  addTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
    const transactions = this.getTransactions();
    const newTransaction: Transaction = {
      ...data,
      id: this.storageService.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.saveDataAndNotify([...transactions, newTransaction]);
    return newTransaction;
  }

  updateTransaction(id: string, updateData: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Transaction | null {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updateData, updatedAt: new Date() };
      this.saveDataAndNotify([...transactions]);
      return transactions[index];
    }
    return null;
  }

  deleteTransaction(id: string): boolean {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    if (transactions.length > filtered.length) {
      this.saveDataAndNotify(filtered);
      return true;
    }
    return false;
  }
}