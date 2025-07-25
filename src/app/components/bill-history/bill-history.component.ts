import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BillingService } from '../../services/billing.service';
import { Bill, PaymentType, DocumentType } from '../../models/bill.model';
import { Subscription } from 'rxjs';
import { SettingsService } from '../../services/settings.service';
import { AppSettings } from '../../models/settings.model';

@Component({
  selector: 'app-bill-history',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './bill-history.component.html',
  styleUrls: ['./bill-history.component.css']
})
export class BillHistoryComponent implements OnInit, OnDestroy {
  allDocuments: Bill[] = [];
  filteredDocuments: Bill[] = [];
  selectedBill: Bill | null = null;
  
  documentTypeFilter: DocumentType | 'ALL' = 'ALL';
  public DocumentType = DocumentType;

  startDate: string = '';
  endDate: string = '';
  selectedPaymentType: 'ALL' | PaymentType = 'ALL';
  searchTerm: string = '';

  showDeleteConfirmation: boolean = false;
  billToDelete: Bill | null = null;

  settings: AppSettings | null = null;

  private subscriptions = new Subscription();
  private billingService = inject(BillingService);
  private router = inject(Router);
  private settingsService = inject(SettingsService);

  ngOnInit(): void {
    this.initializeDateFilters();
    
    // Subscribe to the live documents stream
    const docsSub = this.billingService.documents$.subscribe(docs => {
      this.allDocuments = docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.filterDocuments(); // Re-apply filters whenever data changes
    });

    this.subscriptions.add(docsSub);

    // Load settings
    this.settings = this.settingsService.getSettings();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadDocuments(): void {
    // This method is now obsolete, replaced by the reactive subscription in ngOnInit.
    // Kept here to fulfill the request not to remove methods.
    this.allDocuments = this.billingService.getAllDocuments().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    this.filterDocuments();
  }

  initializeDateFilters(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.startDate = this.formatDate(firstDay);
    this.endDate = this.formatDate(now);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  filterDocuments(): void {
    let filtered = [...this.allDocuments];

    if (this.documentTypeFilter !== 'ALL') {
      filtered = filtered.filter(doc => doc.documentType === this.documentTypeFilter);
    }

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(this.endDate);
      end.setDate(end.getDate() + 1); // Use the next day
      end.setHours(0, 0, 0, 0); // At midnight
      
      filtered = filtered.filter(doc => {
        const docTime = new Date(doc.createdAt);
        return docTime >= start && docTime < end; // Use '<' for the end date
      });
    }

    if (this.selectedPaymentType !== 'ALL') {
      filtered = filtered.filter(doc => doc.paymentType === this.selectedPaymentType);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(doc =>
        doc.customerName.toLowerCase().includes(term) ||
        (doc.customerPhone && doc.customerPhone.includes(term)) ||
        doc.billNo.toLowerCase().includes(term)
      );
    }
    
    this.filteredDocuments = filtered;
  }

  viewBill(doc: Bill): void {
    this.selectedBill = doc;
  }
  
  editBill(bill: Bill): void {
    this.router.navigate(['/billing/edit', bill.id]);
  }

  convertToBill(quoteId: string): void {
    if (confirm('This will create a new bill from the quotation. The original quotation will be removed. Are you sure?')) {
      this.router.navigate(['/billing/from-quote', quoteId]);
    }
  }

  requestDelete(doc: Bill): void {
    this.billToDelete = doc;
    this.showDeleteConfirmation = true;
  }

  confirmDelete(): void {
    if (this.billToDelete) {
      this.billingService.deleteBill(this.billToDelete.id);
      if (this.selectedBill && this.selectedBill.id === this.billToDelete.id) {
        this.closeModal();
      }
    }
    this.cancelDelete();
  }

  cancelDelete(): void {
    this.billToDelete = null;
    this.showDeleteConfirmation = false;
  }
  printBill(): void {
    window.print();
  }

  closeModal(): void {
    this.selectedBill = null;
  }
}