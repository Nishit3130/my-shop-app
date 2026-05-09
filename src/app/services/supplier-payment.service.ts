import { Injectable, inject } from '@angular/core';
import { SupplierPayment } from '../models/supplier-payment.model';
import { PurchaseStatus } from '../models/purchase.model';
import { StorageService } from './storage.service';
import { PurchaseService } from './purchase.service';
import { SupplierService } from './supplier.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupplierPaymentService {
  private readonly PAYMENTS_KEY = 'supplier_payments';
  private storageService = inject(StorageService);
  private purchaseService = inject(PurchaseService);
  private supplierService = inject(SupplierService);

  private supplierPaymentsSubject = new BehaviorSubject<SupplierPayment[]>([]);
  public supplierPayments$: Observable<SupplierPayment[]> = this.supplierPaymentsSubject.asObservable();

  constructor() {
    this.refreshPayments();
  }

  /**
   * Syncs the internal BehaviorSubject with the SQLite database
   */
  async refreshPayments(): Promise<void> {
    const data = await window.electronAPI.getPayments();
    const formattedData = (data || []).map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      paymentDate: new Date(p.paymentDate)
    }));
    this.supplierPaymentsSubject.next(formattedData);
  }

  private async saveDataAndNotify(payments: SupplierPayment[]): Promise<void> {
    // Note: In a full SQLite migration, individual saves happen in record/delete methods.
    // This helper remains for BehaviorSubject notification.
    this.supplierPaymentsSubject.next([...payments]);
  }

  getAllPayments(): SupplierPayment[] {
    return this.supplierPaymentsSubject.getValue();
  }

  getPaymentsBySupplierId(supplierId: string): SupplierPayment[] {
    return this.getAllPayments().filter(p => p.supplierId === supplierId);
  }

  /**
   * UPDATED: Now asynchronous to handle SQLite calls correctly
   */
  async getPaymentsByInvoiceId(invoiceId: string): Promise<SupplierPayment[]> {
    const allPayments = await window.electronAPI.getPayments();
    return (allPayments || []).filter((p: any) => p.purchaseInvoiceId === invoiceId);
  }

  /**
   * UPDATED: Asynchronous method to fix build errors in PurchaseService and UI
   */
  async recordPayment(paymentData: Omit<SupplierPayment, 'id' | 'createdAt'>): Promise<SupplierPayment> {
    if (paymentData.amount <= 0) {
      throw new Error('Payment amount must be positive.');
    }

    const newPayment: SupplierPayment = {
      ...paymentData,
      id: this.storageService.generateId(),
      createdAt: new Date()
    };

    // 1. Save the payment to SQLite
    await window.electronAPI.addPayment({
      ...newPayment,
      createdAt: newPayment.createdAt.toISOString(),
      paymentDate: newPayment.paymentDate instanceof Date ? 
                   newPayment.paymentDate.toISOString() : 
                   new Date(newPayment.paymentDate).toISOString()
    });

    // 2. Update Supplier Balance
    await this.supplierService.updateSupplierBalance(paymentData.supplierId, -paymentData.amount);

    // 3. Update Purchase Invoice Status
    if (paymentData.purchaseInvoiceId) {
      // AWAIT the promise to get the actual invoice object
      const invoice = await this.purchaseService.getPurchaseById(paymentData.purchaseInvoiceId);
      if (invoice) {
        const newAmountPaid = invoice.amountPaid + paymentData.amount;
        let newStatus = invoice.status;
        
        if (newAmountPaid >= invoice.totalAmount) {
          newStatus = PurchaseStatus.PAID;
        } else {
          newStatus = PurchaseStatus.PARTIALLY_PAID;
        }

        await this.purchaseService.updatePurchaseInvoice(invoice.id, {
          amountPaid: parseFloat(newAmountPaid.toFixed(2)),
          status: newStatus
        });
      }
    }

    await this.refreshPayments();
    return newPayment;
  }

  /**
   * RESTORED AND UPDATED: Matches original naming while supporting SQLite
   */
  async deletePaymentsByInvoiceId_RecordsOnly(invoiceId: string): Promise<void> {
    const allPayments = await window.electronAPI.getPayments();
    const paymentsToDelete = allPayments.filter((p: any) => p.purchaseInvoiceId === invoiceId);
    
    for (const payment of paymentsToDelete) {
      await window.electronAPI.deletePayment(payment.id);
    }
    await this.refreshPayments();
  }

  /**
   * UPDATED: Asynchronous method to resolve build errors and handle stock/balance reversal
   */
  async deletePayment(paymentId: string): Promise<boolean> {
    const allPayments = this.getAllPayments();
    const paymentToDelete = allPayments.find(p => p.id === paymentId);
    
    if (!paymentToDelete) {
      console.error(`Payment with ID ${paymentId} not found for deletion.`);
      return false;
    }

    // 1. Reverse Supplier Balance
    await this.supplierService.updateSupplierBalance(paymentToDelete.supplierId, paymentToDelete.amount);

    // 2. Reverse Purchase Invoice Balance
    if (paymentToDelete.purchaseInvoiceId) {
      const invoice = await this.purchaseService.getPurchaseById(paymentToDelete.purchaseInvoiceId);
      if (invoice) {
        const newAmountPaid = invoice.amountPaid - paymentToDelete.amount;
        let newStatus = invoice.status;
        
        if (newAmountPaid <= 0) { 
          newStatus = PurchaseStatus.UNPAID; 
        } else if (newAmountPaid < invoice.totalAmount) { 
          newStatus = PurchaseStatus.PARTIALLY_PAID; 
        }

        await this.purchaseService.updatePurchaseInvoice(invoice.id, {
          amountPaid: parseFloat(Math.max(0, newAmountPaid).toFixed(2)),
          status: newStatus
        });
      }
    }

    // 3. Delete from SQLite
    await window.electronAPI.deletePayment(paymentId);
    await this.refreshPayments();
    return true;
  }
}