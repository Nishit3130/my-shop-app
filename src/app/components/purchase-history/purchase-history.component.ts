import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { PurchaseService } from '../../services/purchase.service';
import { SupplierService } from '../../services/supplier.service';
import { SupplierPaymentService } from '../../services/supplier-payment.service';
import { PurchaseInvoice, PurchaseStatus } from '../../models/purchase.model';
import { SupplierPayment } from '../../models/supplier-payment.model';

type PurchaseInvoiceWithSupplier = PurchaseInvoice & { supplierName: string };

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  templateUrl: './purchase-history.component.html',
  styleUrls: ['./purchase-history.component.css']
})
export class PurchaseHistoryComponent implements OnInit, OnDestroy {
  allPurchases: PurchaseInvoiceWithSupplier[] = [];
  filteredPurchases: PurchaseInvoiceWithSupplier[] = [];
  selectedPurchase: PurchaseInvoiceWithSupplier | null = null;

  startDate: string = '';
  endDate: string = '';
  filterStatus: 'ALL' | PurchaseStatus = 'ALL';
  searchTerm: string = '';

  showPaymentModal = false;
  purchaseForPayment: PurchaseInvoiceWithSupplier | null = null;
  paymentAmount = 0;
  paymentDate = '';
  paymentMethod = 'BANK_TRANSFER';
  paymentNotes = '';

  private subscriptions = new Subscription();
  private purchaseService = inject(PurchaseService);
  private supplierService = inject(SupplierService);
  private supplierPaymentService = inject(SupplierPaymentService);
  private router = inject(Router);

  ngOnInit(): void {
    this.initializeDates();
    
    // Combine purchase and supplier streams to enrich data reactively
    const dataSub = combineLatest([
      this.purchaseService.purchases$,
      this.supplierService.suppliers$
    ]).pipe(
      map(([purchases, suppliers]) => {
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        return purchases.map(purchase => ({
          ...purchase,
          supplierName: supplierMap.get(purchase.supplierId) || 'Unknown Supplier'
        })).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      })
    ).subscribe(purchasesWithSupplier => {
      this.allPurchases = purchasesWithSupplier;
      this.applyFilters();
    });

    this.subscriptions.add(dataSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadPurchases(): void {
    // Obsolete method.
  }

  initializeDates(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = this.formatDate(firstDayOfMonth);
    this.endDate = this.formatDate(today);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  applyFilters(): void {
    let filtered = [...this.allPurchases];
    
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate); start.setHours(0, 0, 0, 0);
      const end = new Date(this.endDate); end.setDate(end.getDate() + 1); end.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => { const d = new Date(p.purchaseDate); return d >= start && d < end; });
    }
    if (this.filterStatus !== 'ALL') {
      filtered = filtered.filter(p => p.status === this.filterStatus);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.supplierName.toLowerCase().includes(term) || p.supplierInvoiceNo.toLowerCase().includes(term));
    }
    this.filteredPurchases = filtered;
  }

  viewDetails(purchase: PurchaseInvoiceWithSupplier): void { this.selectedPurchase = purchase; }
  closeModal(): void { this.selectedPurchase = null; }
  printPurchase(): void { if (this.selectedPurchase) window.print(); }
  editPurchase(purchaseId: string): void { this.router.navigate(['/purchases/edit', purchaseId]); }

  openPaymentModal(purchase: PurchaseInvoiceWithSupplier): void {
    this.purchaseForPayment = purchase;
    const outstandingAmount = purchase.totalAmount - purchase.amountPaid;
    this.paymentAmount = parseFloat(outstandingAmount.toFixed(2));
    this.paymentDate = this.formatDate(new Date());
    this.paymentMethod = 'BANK_TRANSFER';
    this.paymentNotes = `Payment for invoice #${purchase.supplierInvoiceNo}`;
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false; this.purchaseForPayment = null; this.paymentAmount = 0;
    this.paymentDate = ''; this.paymentMethod = 'BANK_TRANSFER'; this.paymentNotes = '';
  }

  submitPayment(): void {
    if (!this.purchaseForPayment) { alert('Error: No purchase selected.'); return; }
    if (this.paymentAmount <= 0) { alert('Payment amount must be positive.'); return; }

    try {
      const paymentData: Omit<SupplierPayment, 'id' | 'createdAt'> = {
        supplierId: this.purchaseForPayment.supplierId, purchaseInvoiceId: this.purchaseForPayment.id,
        amount: this.paymentAmount, paymentDate: new Date(this.paymentDate),
        paymentMethod: this.paymentMethod, notes: this.paymentNotes
      };
      this.supplierPaymentService.recordPayment(paymentData);
      alert('Payment recorded successfully!');
      this.closePaymentModal();
    } catch (error: any) {
      alert(`Failed to record payment: ${error.message}`);
    }
  }
}