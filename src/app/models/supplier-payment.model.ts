// src/app/models/supplier-payment.model.ts

export interface SupplierPayment {
  id: string;
  supplierId: string;
  purchaseInvoiceId?: string; // Optional: can be a payment against a specific invoice or an advance
  amount: number;
  paymentDate: Date;
  paymentMethod?: string; // e.g., 'Bank Transfer', 'UPI', 'Cash'
  notes?: string;
  createdAt: Date;
}