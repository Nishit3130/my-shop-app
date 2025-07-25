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
    this.supplierPaymentsSubject.next(this.storageService.getData(this.PAYMENTS_KEY) || []);
  }

  private saveDataAndNotify(payments: SupplierPayment[]): void {
    this.storageService.saveData(this.PAYMENTS_KEY, payments);
    this.supplierPaymentsSubject.next([...payments]);
  }

  getAllPayments(): SupplierPayment[] {
    return this.supplierPaymentsSubject.getValue();
  }

  getPaymentsBySupplierId(supplierId: string): SupplierPayment[] {
    return this.getAllPayments().filter(p => p.supplierId === supplierId);
  }
  getPaymentsByInvoiceId(invoiceId: string): SupplierPayment[] {
    return this.getAllPayments().filter(p => p.purchaseInvoiceId === invoiceId);
  }

  recordPayment(paymentData: Omit<SupplierPayment, 'id' | 'createdAt'>): SupplierPayment {
    if (paymentData.amount <= 0) {
      throw new Error('Payment amount must be positive.');
    }
    const allPayments = this.getAllPayments();
    const newPayment: SupplierPayment = {
      ...paymentData,
      id: this.storageService.generateId(),
      createdAt: new Date()
    };
    this.saveDataAndNotify([...allPayments, newPayment]);

    this.supplierService.updateSupplierBalance(paymentData.supplierId, -paymentData.amount);

    if (paymentData.purchaseInvoiceId) {
      const invoice = this.purchaseService.getPurchaseById(paymentData.purchaseInvoiceId);
      if (invoice) {
        const newAmountPaid = invoice.amountPaid + paymentData.amount;
        let newStatus = invoice.status;
        if (newAmountPaid >= invoice.totalAmount) {
          newStatus = PurchaseStatus.PAID;
        } else {
          newStatus = PurchaseStatus.PARTIALLY_PAID;
        }
        this.purchaseService.updatePurchaseInvoice(invoice.id, {
          amountPaid: parseFloat(newAmountPaid.toFixed(2)),
          status: newStatus
        });
      }
    }
    return newPayment;
  }

  // deletePaymentsByInvoiceId(invoiceId: string): void {
  //   const allPayments = this.getAllPayments();
  //   const paymentsToKeep = allPayments.filter(p => p.purchaseInvoiceId !== invoiceId);
  //   this.saveDataAndNotify(paymentsToKeep);
  // }
   deletePaymentsByInvoiceId_RecordsOnly(invoiceId: string): void {
    const allPayments = this.getAllPayments();
    const paymentsToKeep = allPayments.filter(p => p.purchaseInvoiceId !== invoiceId);
    this.saveDataAndNotify(paymentsToKeep);
  }
deletePayment(paymentId: string): boolean {
    const allPayments = this.getAllPayments();
    const paymentIndex = allPayments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) {
      console.error(`Payment with ID ${paymentId} not found for deletion.`);
      return false;
    }

    const paymentToDelete = allPayments[paymentIndex];
    this.supplierService.updateSupplierBalance(paymentToDelete.supplierId, paymentToDelete.amount);
    if (paymentToDelete.purchaseInvoiceId) {
      const invoice = this.purchaseService.getPurchaseById(paymentToDelete.purchaseInvoiceId);
      if (invoice) {
        const newAmountPaid = invoice.amountPaid - paymentToDelete.amount;
        let newStatus = invoice.status;
        if (newAmountPaid <= 0) { newStatus = PurchaseStatus.UNPAID; }
        else if (newAmountPaid < invoice.totalAmount) { newStatus = PurchaseStatus.PARTIALLY_PAID; }

        this.purchaseService.updatePurchaseInvoice(invoice.id, {
          amountPaid: parseFloat(Math.max(0, newAmountPaid).toFixed(2)),
          status: newStatus
        });
      }
    }
    const updatedPayments = allPayments.filter(p => p.id !== paymentId);
    this.saveDataAndNotify(updatedPayments);

    return true;
  }
}