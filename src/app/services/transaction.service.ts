// import { Injectable, inject } from '@angular/core';
// import { StorageService } from './storage.service';
// import { Transaction } from '../models/transaction.model';
// import { BehaviorSubject, Observable } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class TransactionService {
//   private readonly TRANSACTIONS_KEY = 'transactions';
//   private storageService = inject(StorageService);

//   private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
//   public transactions$: Observable<Transaction[]> = this.transactionsSubject.asObservable();

//   constructor() {
//     this.transactionsSubject.next(this.storageService.getData(this.TRANSACTIONS_KEY) || []);
//   }

//   private saveDataAndNotify(transactions: Transaction[]): void {
//     this.storageService.saveData(this.TRANSACTIONS_KEY, transactions);
//     this.transactionsSubject.next([...transactions]);
//   }

//   getTransactions(): Transaction[] {
//     return this.transactionsSubject.getValue();
//   }

//   addTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
//     const transactions = this.getTransactions();
//     const newTransaction: Transaction = {
//       ...data,
//       id: this.storageService.generateId(),
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };
//     this.saveDataAndNotify([...transactions, newTransaction]);
//     return newTransaction;
//   }

//   updateTransaction(id: string, updateData: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Transaction | null {
//     const transactions = this.getTransactions();
//     const index = transactions.findIndex(t => t.id === id);
//     if (index !== -1) {
//       transactions[index] = { ...transactions[index], ...updateData, updatedAt: new Date() };
//       this.saveDataAndNotify([...transactions]);
//       return transactions[index];
//     }
//     return null;
//   }

//   deleteTransaction(id: string): boolean {
//     const transactions = this.getTransactions();
//     const filtered = transactions.filter(t => t.id !== id);
//     if (transactions.length > filtered.length) {
//       this.saveDataAndNotify(filtered);
//       return true;
//     }
//     return false;
//   }
// }

// src/app/services/transaction.service.ts
import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public transactions$: Observable<Transaction[]> = this.transactionsSubject.asObservable();

  private isElectron = !!(window && window.electronAPI);
  private memoryFallback: Transaction[] = [];

  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    if (this.isElectron) {
      const result = await window.electronAPI.getTransactions();
      if (result?.success) {
        this.transactionsSubject.next(result.data);
      }
    } else {
      this.transactionsSubject.next([...this.memoryFallback]);
    }
  }

  getTransactions(): Transaction[] {
    return this.transactionsSubject.getValue();
  }

  // RESTORED: Exact parameter type and return type
  async addTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const transactions = this.getTransactions();
    const newTransaction: Transaction = {
      ...data,
      id: Math.random().toString(36).substring(2, 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.isElectron) {
      await window.electronAPI.addTransaction(newTransaction);
    } else {
      this.memoryFallback.push(newTransaction);
    }

    this.transactionsSubject.next([...transactions, newTransaction]);
    return newTransaction;
  }

  // RESTORED: Exact Omit signature and returning Promise<Transaction | null>
  async updateTransaction(id: string, updateData: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction | null> {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    
    if (index !== -1) {
      const updated = { ...transactions[index], ...updateData, updatedAt: new Date() };

      if (this.isElectron) {
        try {
          // Check if explicit updateTransaction exists, else use raw fallback
          if (window.electronAPI.updateTransaction) {
            await window.electronAPI.updateTransaction(id, updated);
          } else {
            await window.electronAPI.dbRun(
              'UPDATE transactions SET date=?, description=?, amount=?, transactionType=?, category=?, notes=? WHERE id=?', 
              [updated.date, updated.description, updated.amount, updated.transactionType, updated.category, updated.notes, id]
            );
          }
        } catch(e) {
          console.error("Error updating transaction in DB", e);
          return null;
        }
      } else {
        this.memoryFallback[index] = updated;
      }

      transactions[index] = updated;
      this.transactionsSubject.next([...transactions]);
      return updated;
    }
    return null;
  }

  // RESTORED: Original logic style for delete
  async deleteTransaction(id: string): Promise<boolean> {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    
    if (transactions.length > filtered.length) {
      if (this.isElectron) {
        const result = await window.electronAPI.deleteTransaction(id);
        if (!result.success) return false;
      } else {
        this.memoryFallback = filtered;
      }

      this.transactionsSubject.next(filtered);
      return true;
    }
    return false;
  }
}