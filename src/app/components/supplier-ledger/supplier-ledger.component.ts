// src/app/components/supplier-ledger/supplier-ledger.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Supplier } from '../../models/supplier.model';
import { PurchaseInvoice } from '../../models/purchase.model';
import { SupplierPayment } from '../../models/supplier-payment.model';
import { SettingsService } from '../../services/settings.service';
import { AppSettings } from '../../models/settings.model';
import { SupplierService } from '../../services/supplier.service';
import { PurchaseService } from '../../services/purchase.service';
import { SupplierPaymentService } from '../../services/supplier-payment.service';

// Interface for a unified ledger view, counterpart to the customer ledger
export interface SupplierLedgerTransaction {
  date: Date;
  type: 'Purchase' | 'Payment';
  description: string;
  referenceId?: string; // Purchase Invoice # or Payment ID
  debit: number | null;  // Amount decreasing amount owed (Payment made by you)
  credit: number | null; // Amount increasing amount owed (New purchase invoice)
  balance: number;       // Running balance of amount owed
}

@Component({
  selector: 'app-supplier-ledger',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './supplier-ledger.component.html',
  styleUrls: ['./supplier-ledger.component.css']
})
export class SupplierLedgerComponent implements OnInit {
  supplierId: string = '';
  supplier: Supplier | null = null;
  transactions: SupplierLedgerTransaction[] = [];
  isLoading = false;
  ledgerEndingBalance = 0;
  today: Date = new Date();
  appSettings!: AppSettings;
  private route = inject(ActivatedRoute);
  private supplierService = inject(SupplierService);
  private purchaseService = inject(PurchaseService);
  private supplierPaymentService = inject(SupplierPaymentService);
  private settingsService = inject(SettingsService);
  ngOnInit(): void {
    this.appSettings = this.settingsService.getSettings();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.supplierId = id;
        this.loadLedgerData();
      }
    });
  }

  loadLedgerData(): void {
    this.isLoading = true;

    // FIXED: Handle the 'undefined' case by converting it to 'null'
    this.supplier = this.supplierService.getSupplierById(this.supplierId) ?? null;

    if (!this.supplier) {
      console.error(`Supplier with ID ${this.supplierId} not found.`);
      this.isLoading = false;
      return;
    }

    const purchases = this.purchaseService.getAllPurchases().filter(p => p.supplierId === this.supplierId);
    const payments = this.supplierPaymentService.getPaymentsBySupplierId(this.supplierId);

    // Combine purchases and payments into a single list
    const rawTransactions = [
      ...purchases.map(p => ({ date: p.purchaseDate, type: 'Purchase' as const, data: p })),
      ...payments.map(p => ({ date: p.paymentDate, type: 'Payment' as const, data: p }))
    ];

    // Sort chronologically
    rawTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    this.transactions = rawTransactions.map(tx => {
      let debit: number | null = null;
      let credit: number | null = null;
      let description = '';
      let referenceId = '';

      if (tx.type === 'Purchase') {
        const purchase = tx.data as PurchaseInvoice;
        credit = purchase.totalAmount; // A purchase increases the credit (amount we owe)
        runningBalance += credit;
        description = `Purchase Invoice #${purchase.supplierInvoiceNo}`;
        referenceId = purchase.id.substring(0, 8);
      } else { // Payment
        const payment = tx.data as SupplierPayment;
        debit = payment.amount; // A payment we make is a debit to the account payable
        runningBalance -= debit;
        description = `Payment made via ${payment.paymentMethod || 'Unknown'}`;
        if (payment.notes) description += ` (${payment.notes})`;
        referenceId = payment.id.substring(0, 8);
      }

      return {
        date: new Date(tx.date),
        type: tx.type,
        description: description,
        referenceId: referenceId,
        debit: debit,
        credit: credit,
        balance: parseFloat(runningBalance.toFixed(2))
      };
    });

    this.ledgerEndingBalance = runningBalance;
    // Verification check
    if (this.supplier && Math.abs(this.ledgerEndingBalance - this.supplier.balanceDue) > 0.01) {
      console.warn(`Ledger discrepancy for supplier ${this.supplier.name}. Ledger Balance: ${this.ledgerEndingBalance}, Stored Balance: ${this.supplier.balanceDue}`);
    }

    this.isLoading = false;
  }

  printLedger(): void {
    window.print();
  }
}