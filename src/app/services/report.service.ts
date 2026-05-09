import { Injectable, inject } from '@angular/core';
import { BillingService } from './billing.service';
import { ProductService } from './product.service';
import { Bill, PaymentType } from '../models/bill.model';

export interface DailySalesReport {
  date: string;
  totalSales: number;
  cashSales: number;
  creditSales: number;
  totalBills: number;
  averageBillValue: number;
}

export interface ProductPerformance {
    productId: string;
    productName: string;
    totalQuantitySold: number;
    totalSalesValue: number;
}

export interface CustomerSalesReport {
    customerId: string;
    customerName: string;
    totalAmountSpent: number;
    billCount: number;
}

export interface ProfitabilityReport {
    productId: string;
    productName: string;
    totalQuantitySold: number;
    totalSalesValue: number;
    totalCost: number;
    grossProfit: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private billingService = inject(BillingService);
  private productService = inject(ProductService);
  
  constructor() { }
  
 generateDailyReport(date: Date): DailySalesReport {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(0, 0, 0, 0);
    
    // FIX: Use startDate and endDate for the full day
    const bills = this.billingService.getBillsByDateRange(startDate, endDate); // Pass original date here
    
const totalSales = bills.reduce((sum: number, bill: Bill) => sum + bill.total, 0);    const cashSales = bills
      .filter(bill => bill.paymentType === PaymentType.CASH)
      .reduce((sum: number, bill: Bill) => sum + bill.total, 0);
    const creditSales = bills
      .filter(bill => bill.paymentType === PaymentType.CREDIT)
      .reduce((sum: number, bill: Bill) => sum + bill.total, 0);
    
    return {
      date: startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0') + '-' + String(startDate.getDate()).padStart(2, '0'),
      totalSales,
      cashSales,
      creditSales,
      totalBills: bills.length,
      averageBillValue: bills.length > 0 ? totalSales / bills.length : 0
    };
  }
  
  generateDateRangeReport(startDate: Date, endDate: Date): DailySalesReport[] {
    const reports: DailySalesReport[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // Ensure midnight
    const lastDate = new Date(endDate);
    lastDate.setHours(0, 0, 0, 0); // Ensure midnight

    while (currentDate <= lastDate) {
      reports.push(this.generateDailyReport(new Date(currentDate)));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return reports;
  }
  
  getPendingCreditAmount(): number {
    const pendingBills = this.billingService.getPendingBills();
    return pendingBills.reduce((sum: number, bill: Bill) => sum + (bill.total - bill.amountPaid), 0);
  }

  generateProductPerformanceReport(startDate: Date, endDate: Date): ProductPerformance[] {
    const bills = this.billingService.getBillsByDateRange(startDate, endDate);
    const performanceMap = new Map<string, ProductPerformance>();

    for (const bill of bills) {
      for (const item of bill.items) {
        if (item.productId) {
          const key = item.productId;
          const existing = performanceMap.get(key) || {
            productId: key,
            productName: item.productName,
            totalQuantitySold: 0,
            totalSalesValue: 0
          };
          
          existing.totalQuantitySold += item.quantity;
          existing.totalSalesValue += item.total;
          performanceMap.set(key, existing);
        }
      }
    }
    return Array.from(performanceMap.values()).sort((a,b) => b.totalSalesValue - a.totalSalesValue);
  }

  generateCustomerSalesReport(startDate: Date, endDate: Date): CustomerSalesReport[] {
    const bills = this.billingService.getBillsByDateRange(startDate, endDate);
    const customerMap = new Map<string, CustomerSalesReport>();

    for (const bill of bills) {
      if(bill.customerId) {
        const key = bill.customerId;
        const existing = customerMap.get(key) || {
          customerId: key,
          customerName: bill.customerName,
          totalAmountSpent: 0,
          billCount: 0
        };

        existing.totalAmountSpent += bill.total;
        existing.billCount += 1;
        customerMap.set(key, existing);
      }
    }
    return Array.from(customerMap.values()).sort((a,b) => b.totalAmountSpent - a.totalAmountSpent);
  }
  
  generateProfitabilityReport(startDate: Date, endDate: Date): ProfitabilityReport[] {
      const bills = this.billingService.getBillsByDateRange(startDate, endDate);
      const allProducts = this.productService.getProducts();
      const productCostMap = new Map(allProducts.map(p => [p.id, p.purchasePrice]));
      const profitMap = new Map<string, ProfitabilityReport>();

      for (const bill of bills) {
          for (const item of bill.items) {
              if (item.productId) {
                  const key = item.productId;
                  const purchasePrice = productCostMap.get(key) || 0;
                  const totalCostForItem = purchasePrice * item.quantity;
                  const grossProfitForItem = item.total - totalCostForItem;
                  
                  const existing = profitMap.get(key) || {
                      productId: key,
                      productName: item.productName,
                      totalQuantitySold: 0,
                      totalSalesValue: 0,
                      totalCost: 0,
                      grossProfit: 0
                  };

                  existing.totalQuantitySold += item.quantity;
                  existing.totalSalesValue += item.total;
                  existing.totalCost += totalCostForItem;
                  existing.grossProfit += grossProfitForItem;
                  profitMap.set(key, existing);
              }
          }
      }
      return Array.from(profitMap.values()).sort((a,b) => b.grossProfit - a.grossProfit);
  }
}