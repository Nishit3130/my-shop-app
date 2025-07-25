// src/app/components/external-ledger/external-ledger.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExternalAccount } from '../../models/external-account.model';
import { ExternalLedgerEntry, EntryType } from '../../models/external-entry.model';
import { ExternalLedgerService } from '../../services/external-ledger.service';

@Component({
  selector: 'app-external-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './external-ledger.component.html',
  styleUrls: ['./external-ledger.component.css']
})
export class ExternalLedgerComponent implements OnInit {
  account: ExternalAccount | null = null;
  transactions: ExternalLedgerEntry[] = [];
  
  // Form for new entry
  entryDate: string = '';
  entryDescription = '';
  entryAmount = 0;
  entryType: 'DEBIT' | 'CREDIT' = 'DEBIT'; // DEBIT = You Gave, CREDIT = You Got
  public EntryType = EntryType;

  // Delete Confirmation State
  showDeleteConfirmation = false;
  entryToDelete: ExternalLedgerEntry | null = null;

  private route = inject(ActivatedRoute);
  private ledgerService = inject(ExternalLedgerService);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const accountId = params.get('id');
      if (accountId) {
        this.loadData(accountId);
      }
    });
  }

  loadData(accountId: string): void {
    this.account = this.ledgerService.getAccountById(accountId) ?? null;
    if (this.account) {
      this.transactions = this.ledgerService.getEntriesForAccount(accountId);
    }
    this.resetEntryForm();
  }

  resetEntryForm(): void {
    this.entryDate = new Date().toISOString().split('T')[0];
    this.entryDescription = '';
    this.entryAmount = 0;
    this.entryType = 'DEBIT';
  }

  addEntry(): void {
    if (!this.account) {
      alert('Cannot add entry, account not loaded.');
      return;
    }
    if (!this.entryDescription.trim() || this.entryAmount <= 0) {
      alert('Please enter a valid description and a positive amount.');
      return;
    }

    const newEntry: Omit<ExternalLedgerEntry, 'id' | 'createdAt'> = {
      accountId: this.account.id,
      date: new Date(this.entryDate),
      description: this.entryDescription.trim(),
      type: this.entryType as EntryType,
      amount: this.entryAmount,
    };

    const result = this.ledgerService.addEntry(newEntry);
    if (result) {
      this.loadData(this.account.id); // Reload all data
    } else {
      alert('Failed to add entry.');
    }
  }

  // --- Delete Entry Methods ---
  requestDeleteEntry(entry: ExternalLedgerEntry): void {
    this.entryToDelete = entry;
    this.showDeleteConfirmation = true;
  }

  cancelDeleteEntry(): void {
    this.entryToDelete = null;
    this.showDeleteConfirmation = false;
  }

  confirmDeleteEntry(): void {
    if (this.entryToDelete && this.account) {
      this.ledgerService.deleteEntry(this.entryToDelete.id);
      this.loadData(this.account.id); // Reload data to reflect deletion
      this.cancelDeleteEntry();
    }
  }
}