import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule,FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';
import { Transaction, TransactionType } from '../../models/transaction.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-income-expense',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,FormsModule],
  templateUrl: './income-expense.component.html',
  styleUrls: ['./income-expense.component.css']
})
export class IncomeExpenseComponent implements OnInit, OnDestroy {
  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  
  showForm = false;
  editMode = false;
  transactionForm: FormGroup;
  currentTransactionId: string | null = null;
  
  startDate: string = '';
  endDate: string = '';
  searchTerm: string = '';

  totalIncome = 0;
  totalExpense = 0;
  netFlow = 0;

  private subscriptions = new Subscription();
  private transactionService = inject(TransactionService);
  private fb = inject(FormBuilder);

  constructor() {
    this.transactionForm = this.fb.group({
      date: ['', Validators.required],
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      transactionType: [TransactionType.EXPENSE, Validators.required],
      category: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.initializeDates();
    
    const transSub = this.transactionService.transactions$.subscribe(transactions => {
      this.allTransactions = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.applyFilters();
    });
    this.subscriptions.add(transSub);
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  initializeDates(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  loadTransactions(): void {
  }
  
  applyFilters(): void {
    const start = new Date(this.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(this.endDate);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    
    let dateFiltered = this.allTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate < end;
    });

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredTransactions = dateFiltered.filter(t => 
        t.description.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term) ||
        (t.notes && t.notes.toLowerCase().includes(term))
      );
    } else {
      this.filteredTransactions = dateFiltered;
    }

    this.calculateSummaries();
  }

  calculateSummaries(): void {
    this.totalIncome = this.filteredTransactions
      .filter(t => t.transactionType === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
      
    this.totalExpense = this.filteredTransactions
      .filter(t => t.transactionType === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    this.netFlow = this.totalIncome - this.totalExpense;
  }

  openForm(transaction?: Transaction): void {
    if (transaction) {
      this.editMode = true;
      this.currentTransactionId = transaction.id;
      this.transactionForm.patchValue({
        ...transaction,
        date: new Date(transaction.date).toISOString().split('T')[0]
      });
    } else {
      this.editMode = false;
      this.currentTransactionId = null;
      this.transactionForm.reset({
        date: new Date().toISOString().split('T')[0],
        transactionType: TransactionType.EXPENSE,
        amount: null
      });
    }
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  async saveTransaction(): Promise<void> {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }
    const formData = this.transactionForm.value;
    
    try {
      if (this.editMode && this.currentTransactionId) {
        await this.transactionService.updateTransaction(this.currentTransactionId, formData);
      } else {
        await this.transactionService.addTransaction(formData);
      }
      this.closeForm();
    } catch (error: any) {
      alert(`Error saving transaction: ${error.message || 'Unknown error occurred.'}`);
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        const success = await this.transactionService.deleteTransaction(id);
        if (!success) {
          alert('Failed to delete the transaction from the database.');
        }
      } catch (error: any) {
        alert(`Error deleting transaction: ${error.message || 'Unknown error occurred.'}`);
      }
    }
  }
}