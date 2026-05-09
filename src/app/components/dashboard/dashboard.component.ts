import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { BillingService } from '../../services/billing.service';
import { CustomerService } from '../../services/customer.service';
import { SupplierService } from '../../services/supplier.service';
import { ReportService } from '../../services/report.service'; // Added for pending credit
import { Bill, DocumentType as AppDocumentType } from '../../models/bill.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  totalProducts: number = 0;
  totalCustomers: number = 0;
  totalSuppliers: number = 0;
  todaySales: number = 0;
  totalBills: number = 0;      
  pendingCredit: number = 0;   
  
  recentBills: Bill[] = [];
  lowStockProducts: any[] = [];

  private subscriptions = new Subscription();
  private productService = inject(ProductService);
  private billingService = inject(BillingService);
  private customerService = inject(CustomerService);
  private supplierService = inject(SupplierService);
  private reportService = inject(ReportService); 

  ngOnInit(): void {
    this.subscriptions.add(
      this.productService.products$.subscribe(products => {
        this.totalProducts = products.length;
        this.lowStockProducts = products.filter(p => p.stock <= 5).slice(0, 5);
      })
    );

    this.subscriptions.add(
      this.customerService.customers$.subscribe(c => this.totalCustomers = c.length)
    );

    this.subscriptions.add(
      this.supplierService.suppliers$.subscribe(s => this.totalSuppliers = s.length)
    );

    this.subscriptions.add(
      this.billingService.documents$.subscribe((docs: Bill[]) => {
        const todayStr = new Date().toDateString();
        const allBills = docs.filter(d => d.documentType === AppDocumentType.BILL);
        this.totalBills = allBills.length;
        const billsToday = allBills.filter(d => 
          new Date(d.createdAt).toDateString() === todayStr
        );
        this.todaySales = billsToday.reduce((sum, b) => sum + b.total, 0);
        this.recentBills = allBills.slice(0, 5);
        this.pendingCredit = allBills.reduce((sum, b) => sum + (b.total - b.amountPaid), 0);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}