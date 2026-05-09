import { Injectable, inject } from '@angular/core';
import { Payment } from '../models/payment.model';
import { StorageService } from './storage.service';
import { BillingService } from './billing.service';
import { CustomerService } from './customer.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly PAYMENTS_KEY = 'payments';
  private storageService = inject(StorageService);
  private billingService = inject(BillingService);
  private customerService = inject(CustomerService);

  private paymentsSubject = new BehaviorSubject<Payment[]>([]);
  public payments$: Observable<Payment[]> = this.paymentsSubject.asObservable();

  constructor() {
    this.paymentsSubject.next(this.storageService.getData(this.PAYMENTS_KEY) || []);
  }

  private saveDataAndNotify(payments: Payment[]): void {
    this.storageService.saveData(this.PAYMENTS_KEY, payments);
    this.paymentsSubject.next([...payments]);
  }

  getAllPayments(): Payment[] {
    return this.paymentsSubject.getValue();
  }

  getPaymentsByBillId(billId: string): Payment[] {
    return this.getAllPayments().filter(p => p.billId === billId).sort((a,b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }

  getPaymentsByCustomerId(customerId: string): Payment[] {
    if (!customerId) { return []; }
    return this.getAllPayments().filter(p => p.customerId === customerId).sort((a,b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }

  async recordPayment(paymentData: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment | null> {
    if (!paymentData.billId) { throw new Error('Bill ID is missing for the payment.'); }
    if (paymentData.amount <= 0.005) { throw new Error('Payment amount must be positive.'); }

    const bill = await this.billingService.getBillById(paymentData.billId);
    if (!bill) { throw new Error(`Bill not found for ID: ${paymentData.billId}`); }

    const transactionAmount = paymentData.amount;
    const currentOutstandingOnBill = parseFloat((bill.total - bill.amountPaid).toFixed(2));
    let amountToApplyToBill = 0;
    let excessAmount = 0;

    if (currentOutstandingOnBill <= 0.005) {
      amountToApplyToBill = 0;
      excessAmount = transactionAmount;
    } else if (transactionAmount > currentOutstandingOnBill) {
      amountToApplyToBill = currentOutstandingOnBill;
      excessAmount = parseFloat((transactionAmount - currentOutstandingOnBill).toFixed(2));
      console.log(`Overpayment: Applying ₹${amountToApplyToBill.toFixed(2)} to bill, and ₹${excessAmount.toFixed(2)} as new customer credit.`);
    } else {
      amountToApplyToBill = transactionAmount;
      excessAmount = 0;
    }

    const allPayments = this.getAllPayments();
    const newPayment: Payment = { ...paymentData, id: this.storageService.generateId(), createdAt: new Date() };
    this.saveDataAndNotify([...allPayments, newPayment]);

    if (amountToApplyToBill > 0) {
      const newAmountPaidForBill = bill.amountPaid + amountToApplyToBill;
      this.billingService.updateBill(bill.id, { amountPaid: parseFloat(newAmountPaidForBill.toFixed(2)) });
    }

    if (excessAmount > 0 && bill.customerId) {
      this.customerService.updateCustomerCreditBalance(bill.customerId, excessAmount);
    }
    
    return newPayment;
  }
  
  async applyCreditToBill(billId: string, amountToApply: number): Promise<Payment | null> {
    const bill = await this.billingService.getBillById(billId);
    if (!bill || !bill.customerId) {
      throw new Error("Credit can only be applied to a bill linked to a customer.");
    }

    const customer = await this.customerService.getCustomerById(bill.customerId);
    if (!customer) {
      throw new Error("Associated customer not found.");
    }

    const availableCredit = customer.creditBalance;
    if (availableCredit < amountToApply) {
      throw new Error(`Insufficient credit balance. Available: ${availableCredit}, Tried to apply: ${amountToApply}`);
    }

    if (amountToApply <= 0) {
      throw new Error("Amount to apply must be positive.");
    }

    const outstanding = bill.total - bill.amountPaid;
    if (amountToApply > outstanding) {
        throw new Error(`Amount to apply (₹${amountToApply}) cannot be greater than the outstanding amount (₹${outstanding.toFixed(2)}).`);
    }

    this.customerService.updateCustomerCreditBalance(customer.id, -amountToApply);

    const paymentData: Omit<Payment, 'id' | 'createdAt'> = {
        billId: bill.id,
        customerId: bill.customerId,
        amount: amountToApply,
        paymentDate: new Date(),
        paymentMethod: 'CREDIT_BALANCE',
        notes: `Applied from customer's available credit.`
    };
    
    return this.recordPayment(paymentData);
  }
  
  async settleBill(billId: string, settlementPaymentMethod: string = 'SETTLEMENT', notes?: string): Promise<Payment | null> {
    const bill = await this.billingService.getBillById(billId);
    if (!bill) { throw new Error(`Bill not found: ${billId}`); }
    if (!bill.customerId) { throw new Error('Cannot settle a bill that is not linked to a customer profile.');}

    const outstandingAmount = parseFloat((bill.total - bill.amountPaid).toFixed(2));
    if (outstandingAmount <= 0.005) { return null; }

    const paymentData: Omit<Payment, 'id' | 'createdAt'> = {
      billId: bill.id,
      customerId: bill.customerId,
      amount: outstandingAmount,
      paymentDate: new Date(),
      paymentMethod: settlementPaymentMethod,
      notes: notes || `Full settlement for bill #${bill.billNo || bill.id}.`,
    };
    
    return this.recordPayment(paymentData);
  }
}