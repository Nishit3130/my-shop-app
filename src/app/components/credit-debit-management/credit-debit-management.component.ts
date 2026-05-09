import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BillingService } from '../../services/billing.service';
import { ReportService } from '../../services/report.service';
import { PaymentService } from '../../services/payment.service';
import { Bill, PaymentType } from '../../models/bill.model';
import { Payment } from '../../models/payment.model';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer.model';
import { SettingsService } from '../../services/settings.service';
import { AppSettings } from '../../models/settings.model';

@Component({
  selector: 'app-credit-debit-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './credit-debit-management.component.html',
  styleUrls: ['./credit-debit-management.component.css']
})
export class CreditDebitManagementComponent implements OnInit, OnDestroy {
  allCreditBills: Bill[] = [];
  filteredBills: Bill[] = [];
  selectedBill: Bill | null = null;
  selectedCustomer: Customer | null = null;
  pendingCredit: number = 0;
  searchTerm: string = '';
  filterStatus: 'all' | 'pending' | 'paid' = 'all';
  showPaymentModal: boolean = false;
  billForPayment: Bill | null = null;
  paymentAmount: number = 0;
  paymentDate: string = '';
  paymentMethod: string = 'CASH';
  paymentNotes: string = '';
  creditToApply: number = 0;
  settings: AppSettings | null = null;
  showPrintModal: boolean = false;

  private subscriptions = new Subscription();
  private billingService = inject(BillingService);
  private reportService = inject(ReportService);
  private paymentService = inject(PaymentService);
  private customerService = inject(CustomerService);
  private settingsService = inject(SettingsService);

  ngOnInit(): void {
    const creditBillsSub = this.billingService.documents$.pipe(
      map((bills: Bill[]) => bills
        .filter((bill: Bill) => bill.paymentType === PaymentType.CREDIT)
        .sort((a: Bill, b: Bill) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    ).subscribe((creditBills: Bill[]) => {
      this.allCreditBills = creditBills;
      this.calculatePendingCredit(); 
      this.applyFilters(); 
    });

    this.subscriptions.add(creditBillsSub);
    this.settings = this.settingsService.getSettings();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  calculatePendingCredit(): void {
    this.pendingCredit = this.reportService.getPendingCreditAmount();
  }

  applyFilters(): void {
    let filtered = [...this.allCreditBills];
    if (this.filterStatus === 'pending') {
      filtered = filtered.filter(bill => (bill.total - bill.amountPaid > 0.005));
    } else if (this.filterStatus === 'paid') {
      filtered = filtered.filter(bill => (bill.total - bill.amountPaid <= 0.005));
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(bill =>
        bill.customerName.toLowerCase().includes(term) ||
        (bill.customerPhone && bill.customerPhone.includes(term)) ||
        (bill.billNo && bill.billNo.toLowerCase().includes(term))
      );
    }
    this.filteredBills = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  setFilter(status: 'all' | 'pending' | 'paid'): void {
    this.filterStatus = status;
    this.applyFilters();
  }

  viewBill(bill: Bill): void {
    this.selectedBill = bill;
    if (bill.customerId) {
        this.selectedCustomer = this.customerService.getCustomerById(bill.customerId) ?? null;
    } else {
        this.selectedCustomer = null;
    }
  }

  closeModal(): void {
    this.selectedBill = null;
    this.selectedCustomer = null;
    this.creditToApply = 0;
  }

  printBill(): void {
    window.print();
  }

  openPaymentModal(bill: Bill): void {
    this.billForPayment = bill;
    this.paymentAmount = parseFloat((bill.total - bill.amountPaid).toFixed(2));
    if (this.paymentAmount < 0) this.paymentAmount = 0;
    this.paymentDate = this.formatDateTimeLocal(new Date());
    this.paymentMethod = 'CASH';
    this.paymentNotes = '';
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.billForPayment = null;
    this.paymentAmount = 0;
    this.paymentDate = '';
    this.paymentMethod = 'CASH';
    this.paymentNotes = '';
  }

  async markAsPaid(id: string): Promise<void> {
    // FIXED: Added await here so billToSettle is a Bill, not a Promise
    const billToSettle = await this.billingService.getBillById(id);
    if (!billToSettle) {
      alert("Error: Could not find the bill to settle.");
      return;
    }
    
    try {
      // AWAIT the asynchronous settlement
      const paymentRecorded = await this.paymentService.settleBill(billToSettle.id, 'FULL_SETTLEMENT_CDM');
      if (paymentRecorded) {
        alert(`Bill settlement processed for ₹${paymentRecorded.amount.toFixed(2)}.`);
      } else {
        alert("Bill is already fully paid.");
      }
      if (this.selectedBill?.id === id) this.closeModal();
      if (this.billForPayment?.id === id) this.closePaymentModal();
    } catch (error: any) {
      alert(`Failed to settle bill: ${error.message}`);
    }
  }

  async submitPayment(): Promise<void> {
    if (!this.billForPayment) { alert('Error: No bill selected.'); return; }
    
    try {
      const paymentData: Omit<Payment, 'id' | 'createdAt'> = {
        billId: this.billForPayment.id,
        customerId: this.billForPayment.customerId,
        amount: this.paymentAmount,
        paymentDate: new Date(this.paymentDate),
        paymentMethod: this.paymentMethod.trim() || 'UNKNOWN',
        notes: this.paymentNotes.trim() || undefined,
      };
      
      // AWAIT the database save
      await this.paymentService.recordPayment(paymentData);
      alert('Payment recorded successfully!');
      this.closePaymentModal();
    } catch (error: any) {
      alert(`Failed to record payment: ${error.message}`);
    }
  }
    
  async applyCredit(): Promise<void> {
    if (!this.selectedBill) { alert("No bill selected."); return; }
    if (this.creditToApply <= 0) { alert("Please enter a positive credit amount to apply."); return; }

    try {
      // AWAIT the credit application
      await this.paymentService.applyCreditToBill(this.selectedBill.id, this.creditToApply);
      alert(`Successfully applied ₹${this.creditToApply.toFixed(2)} credit to the bill.`);
      this.closeModal();
    } catch(error: any) {
      alert(`Error: ${error.message}`);
    }
  }
}