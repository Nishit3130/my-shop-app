import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, DailySalesReport, ProductPerformance, CustomerSalesReport, ProfitabilityReport } from '../../services/report.service';
import { TransactionService } from '../../services/transaction.service';
import { BillingService } from '../../services/billing.service';
import { ExternalLedgerService } from '../../services/external-ledger.service';
import { PaymentService } from '../../services/payment.service';
import { CustomerService } from '../../services/customer.service';
import { Transaction, TransactionType } from '../../models/transaction.model';
import { Bill } from '../../models/bill.model';
import { ExternalLedgerEntry, EntryType } from '../../models/external-entry.model';
import { Payment } from '../../models/payment.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  reportType: 'daily' | 'range' | 'product_performance' | 'customer_sales' | 'profitability' = 'daily';
  
  reportDate: string = '';
  startDate: string = '';
  endDate: string = '';
  
  dailyReport: DailySalesReport | null = null;
  dateRangeReport: DailySalesReport[] = [];
  productPerformanceReport: ProductPerformance[] = [];
  customerSalesReport: CustomerSalesReport[] = [];
  profitabilityReport: ProfitabilityReport[] = [];
  
  // For income/expense summary
  incomeToday: number = 0;
  expenseToday: number = 0;
  incomeRange: number = 0;
  expenseRange: number = 0;
  transactionsToday: Transaction[] = [];
  transactionsRange: Transaction[] = [];
  billsToday: Bill[] = [];
  externalLedgerEntriesToday: ExternalLedgerEntry[] = [];
  paymentsToday: Payment[] = [];

  private reportService = inject(ReportService);
  private transactionService = inject(TransactionService);
  private billingService = inject(BillingService);
  private externalLedgerService = inject(ExternalLedgerService);
  private paymentService = inject(PaymentService);
  private customerService = inject(CustomerService);

  ngOnInit(): void {
    this.initializeDates();
    this.generateReport();
  }
  
  initializeDates(): void {
    const today = new Date();
    this.reportDate = this.formatDate(today);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    this.startDate = this.formatDate(sevenDaysAgo);
    this.endDate = this.formatDate(today);
  }
  
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  generateReport(): void {
    this.resetReports();

    const start = new Date(this.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999); 

    const daily = new Date(this.reportDate);
    daily.setHours(0, 0, 0, 0);

    if (start > end) { alert('Start date must be before end date'); return; }

    switch(this.reportType) {
      case 'daily':
        this.dailyReport = this.reportService.generateDailyReport(daily);
        break;
      case 'range':
        this.dateRangeReport = this.reportService.generateDateRangeReport(start, end);
        break;
      case 'product_performance':
        this.productPerformanceReport = this.reportService.generateProductPerformanceReport(start, end);
        break;
      case 'customer_sales':
        this.customerSalesReport = this.reportService.generateCustomerSalesReport(start, end);
        break;
      case 'profitability':
        this.profitabilityReport = this.reportService.generateProfitabilityReport(start, end);
        break;
    }

    // Income/Expense summary
    this.calculateIncomeExpense();
  }
  
  resetReports(): void {
      this.dailyReport = null;
      this.dateRangeReport = [];
      this.productPerformanceReport = [];
      this.customerSalesReport = [];
      this.profitabilityReport = [];
  }

  calculateIncomeExpense(): void {
    const allTransactions = this.transactionService.getTransactions();
    const todayStr = this.reportDate;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999);

    // Daily
    this.transactionsToday = allTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') === todayStr;
    });
    // Add external ledger entries for today
    const allExternalEntries = this.externalLedgerService.getAllEntries();
    this.externalLedgerEntriesToday = allExternalEntries.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') === todayStr;
    });
    // Add payments for today
    const allPayments = this.paymentService.getAllPayments();
    this.paymentsToday = allPayments.filter(p => {
      const d = new Date(p.paymentDate);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') === todayStr;
    });
    this.incomeToday = this.transactionsToday.filter(t => t.transactionType === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    this.expenseToday = this.transactionsToday.filter(t => t.transactionType === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

    // Range
    this.transactionsRange = allTransactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
    this.incomeRange = this.transactionsRange.filter(t => t.transactionType === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    this.expenseRange = this.transactionsRange.filter(t => t.transactionType === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

    // Bills for today
    const today = new Date(this.reportDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    this.billsToday = this.billingService.getBillsByDateRange(today, tomorrow);
  }

  getAverageBillValue(report: DailySalesReport): number {
    return report.totalBills > 0 ? report.totalSales / report.totalBills : 0;
  }
  
  getTotalBills(): number {
    return this.dateRangeReport.reduce((sum, day) => sum + day.totalBills, 0);
  }
  
  getTotalSales(): number {
    return this.dateRangeReport.reduce((sum, day) => sum + day.totalSales, 0);
  }
  
  getTotalCashSales(): number {
    return this.dateRangeReport.reduce((sum, day) => sum + day.cashSales, 0);
  }
  
  getTotalCreditSales(): number {
    return this.dateRangeReport.reduce((sum, day) => sum + day.creditSales, 0);
  }

  printReport(): void {
    window.print();
  }

  // In your ReportsComponent, add a method to get today's date as yyyy-MM-dd
  get todayString(): string {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  }

  getExternalAccountName(accountId: string): string {
    const account = this.externalLedgerService.getAccountById(accountId);
    return account ? account.name : accountId;
  }

  getPaymentCustomerName(customerId: string | undefined): string {
    if (!customerId) return '-';
    const customer = this.customerService.getCustomerById(customerId);
    return customer ? customer.name : customerId;
  }

  getTotalSalesToday(): string {
    return this.billsToday.reduce((sum, b) => sum + b.total, 0).toFixed(2);
  }
  getTotalPaymentsToday(): string {
    return this.paymentsToday.reduce((sum, p) => sum + p.amount, 0).toFixed(2);
  }
  getTotalCreditDebitToday(): string {
    return this.externalLedgerEntriesToday.reduce((sum, e) => sum + e.amount, 0).toFixed(2);
  }
  getNetIncomeExpenseToday(): string {
    return (this.incomeToday - this.expenseToday).toFixed(2);
  }
}