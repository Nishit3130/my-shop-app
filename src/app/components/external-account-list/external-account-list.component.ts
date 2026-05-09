import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExternalAccount } from '../../models/external-account.model';
import { ExternalLedgerService } from '../../services/external-ledger.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-external-account-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './external-account-list.component.html',
  styleUrls: ['./external-account-list.component.css']
})
export class ExternalAccountListComponent implements OnInit, OnDestroy {
  accounts: ExternalAccount[] = [];
  
  showAccountModal = false;
  editMode = false;
  currentAccountId: string | null = null;
  accountName = '';
  accountPhone = '';
  accountNotes = '';

  showDeleteConfirmation = false;
  accountToDelete: ExternalAccount | null = null;

  private subscriptions = new Subscription();
  private ledgerService = inject(ExternalLedgerService);
  private router = inject(Router);

  ngOnInit(): void {
    const accountsSub = this.ledgerService.accounts$.subscribe(accounts => {
      this.accounts = accounts.sort((a,b) => a.name.localeCompare(b.name));
    });
    this.subscriptions.add(accountsSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadAccounts(): void {
  }

  openNewAccountModal(): void {
    this.editMode = false;
    this.currentAccountId = null;
    this.accountName = '';
    this.accountPhone = '';
    this.accountNotes = '';
    this.showAccountModal = true;
  }

  openEditAccountModal(account: ExternalAccount): void {
    this.editMode = true;
    this.currentAccountId = account.id;
    this.accountName = account.name;
    this.accountPhone = account.phone || '';
    this.accountNotes = account.notes || '';
    this.showAccountModal = true;
  }

  closeAccountModal(): void {
    this.showAccountModal = false;
  }

   async saveAccount(): Promise<void> {
    if (!this.accountName.trim()) {
      alert('Account name is required.');
      return;
    }
    const accountData = {
      name: this.accountName.trim(),
      phone: this.accountPhone.trim() || undefined,
      notes: this.accountNotes.trim() || undefined,
    };

    try {
      if (this.editMode && this.currentAccountId) {
        this.ledgerService.updateAccount(this.currentAccountId, accountData);
      } else {
        this.ledgerService.addAccount(accountData);
      }
      this.closeAccountModal();
    } catch (error: any) {
      alert(`Error saving account: ${error.message}`);
    }
  }

  viewLedger(accountId: string): void {
    this.router.navigate(['/manual-ledger/account', accountId]);
  }

  requestDelete(account: ExternalAccount): void {
    this.accountToDelete = account;
    this.showDeleteConfirmation = true;
  }

  cancelDelete(): void {
    this.accountToDelete = null;
    this.showDeleteConfirmation = false;
  }

  async confirmDelete(): Promise<void> {
    if (this.accountToDelete) {
      this.ledgerService.deleteAccount(this.accountToDelete.id);
      this.cancelDelete();
    }
  }
}