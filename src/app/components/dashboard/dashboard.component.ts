import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { BillingService } from '../../services/billing.service';
import { ReportService } from '../../services/report.service';
import { Product } from '../../models/product.model';
import { Bill } from '../../models/bill.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  totalProducts: number = 0;
  todaySales: number = 0;
  pendingCredit: number = 0;
  totalBills: number = 0;
  recentBills: Bill[] = [];
  lowStockProducts: Product[] = [];

  private subscriptions = new Subscription();

  private productService = inject(ProductService);
  private billingService = inject(BillingService);
  private reportService = inject(ReportService);

  ngOnInit(): void {
    const productsSub = this.productService.products$.subscribe(products => {
      this.totalProducts = products.length;
      this.lowStockProducts = products
        .filter(product => product.stock < 10)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5);
    });

    const billsSub = this.billingService.bills$.subscribe(bills => {
       this.totalBills = bills.length;
       this.recentBills = [...bills]
         .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
         .slice(0, 5);
       
       this.recalculateReports();
    });

    this.subscriptions.add(productsSub);
    this.subscriptions.add(billsSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadDashboardData(): void {
    const products = this.productService.getProducts();
    this.totalProducts = products.length;
    this.lowStockProducts = products.filter(p => p.stock < 10).sort((a,b) => a.stock - b.stock).slice(0, 5);
    const bills = this.billingService.getAllBills();
    this.totalBills = bills.length;
    this.recentBills = [...bills].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0,5);
    this.recalculateReports();
  }

  recalculateReports(): void {
    this.todaySales = this.reportService.generateDailyReport(new Date()).totalSales;
    this.pendingCredit = this.reportService.getPendingCreditAmount();
  }
}