import { Injectable, inject, Injector } from '@angular/core';

import { PurchaseInvoice, PurchaseItem, PurchaseStatus } from '../models/purchase.model';
import { StorageService } from './storage.service';
import { ProductService } from './product.service';
import { SupplierService } from './supplier.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupplierPaymentService } from './supplier-payment.service';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private readonly PURCHASES_KEY = 'purchase_invoices';
  private storageService = inject(StorageService);
  private productService = inject(ProductService);
  private supplierService = inject(SupplierService);
private injector = inject(Injector);
  private purchasesSubject = new BehaviorSubject<PurchaseInvoice[]>([]);
  public purchases$: Observable<PurchaseInvoice[]> = this.purchasesSubject.asObservable();

  constructor() {
    this.purchasesSubject.next(this.storageService.getData(this.PURCHASES_KEY) || []);
  }

  private saveDataAndNotify(purchases: PurchaseInvoice[]): void {
    this.storageService.saveData(this.PURCHASES_KEY, purchases);
    this.purchasesSubject.next([...purchases]);
  }

  getAllPurchases(): PurchaseInvoice[] {
    return this.purchasesSubject.getValue();
  }

  getPurchaseById(id: string): PurchaseInvoice | undefined {
    return this.getAllPurchases().find(p => p.id === id);
  }

  createPurchaseInvoice(invoiceData: Omit<PurchaseInvoice, 'id' | 'createdAt' | 'updatedAt' | 'status'>): PurchaseInvoice {
    const purchases = this.getAllPurchases();

    invoiceData.items.forEach(item => {
      if (item.isNew && !item.productId) {
        const newProduct = this.productService.addProduct({
          name: item.productName, price: item.sellingPrice || 0,
          purchasePrice: item.purchasePrice, stock: 0, category: '', description: ''
        });
        item.productId = newProduct.id;
      }
    });

    invoiceData.items.forEach(item => {
      this.productService.updateProduct(item.productId!, { purchasePrice: item.purchasePrice });
      this.productService.updateStock(item.productId!, item.quantity);
    });

    this.supplierService.updateSupplierBalance(invoiceData.supplierId, invoiceData.totalAmount);
    
    let status: PurchaseStatus;
    if (invoiceData.amountPaid >= invoiceData.totalAmount) { status = PurchaseStatus.PAID; }
    else if (invoiceData.amountPaid > 0) { status = PurchaseStatus.PARTIALLY_PAID; }
    else { status = PurchaseStatus.UNPAID; }

    const newPurchase: PurchaseInvoice = {
      ...invoiceData,
      id: this.storageService.generateId(), status: status,
      createdAt: new Date(), updatedAt: new Date()
    };

    this.saveDataAndNotify([...purchases, newPurchase]);
    return newPurchase;
  }
  
  updatePurchaseInvoice(id: string, updateData: Partial<Omit<PurchaseInvoice, 'id' | 'createdAt'>>): PurchaseInvoice | null {
    const purchases = this.getAllPurchases();
    const index = purchases.findIndex(p => p.id === id);
    if (index === -1) { return null; }
    
    const originalInvoice = purchases[index];
    const updatedInvoice = { ...originalInvoice, ...updateData, updatedAt: new Date() };
    
    const stockAdjustments = this._calculateStockAdjustments(originalInvoice.items, updatedInvoice.items);
    stockAdjustments.forEach(adj => this.productService.updateStock(adj.productId, adj.quantityChange));
    
    const balanceChange = updatedInvoice.totalAmount - originalInvoice.totalAmount;
    const paymentChange = updatedInvoice.amountPaid - originalInvoice.amountPaid;
    const netBalanceChange = balanceChange - paymentChange;
    if (netBalanceChange !== 0) {
      this.supplierService.updateSupplierBalance(updatedInvoice.supplierId, netBalanceChange);
    }
    
    purchases[index] = updatedInvoice;
    this.saveDataAndNotify([...purchases]);
    return updatedInvoice;
  }

   deletePurchaseInvoice(id: string): boolean {
    const supplierPaymentService = this.injector.get(SupplierPaymentService);

    const allPurchases = this.getAllPurchases();
    const purchaseIndex = allPurchases.findIndex(p => p.id === id);
    if (purchaseIndex === -1) {
      console.error(`Purchase invoice with ID ${id} not found.`);
      return false;
    }
    
    const purchaseToDelete = allPurchases[purchaseIndex];
    

    purchaseToDelete.items.forEach(item => {
      this.productService.updateStock(item.productId!, -item.quantity);
    });

    const associatedPayments = supplierPaymentService.getPaymentsByInvoiceId(id);
    associatedPayments.forEach(payment => {
      supplierPaymentService.deletePayment(payment.id);
    });
    
    this.supplierService.updateSupplierBalance(purchaseToDelete.supplierId, -purchaseToDelete.totalAmount);
    
    const updatedPurchases = allPurchases.filter(p => p.id !== id);
    this.saveDataAndNotify(updatedPurchases);
    
    return true;
  }

  private _calculateStockAdjustments(originalItems: PurchaseItem[], newItems: PurchaseItem[]): { productId: string, quantityChange: number }[] {
    const adjustments: { productId: string, quantityChange: number }[] = [];
    const newItemsMap = new Map(newItems.map(item => [item.productId!, item.quantity]));
    const originalItemsMap = new Map(originalItems.map(item => [item.productId!, item.quantity]));
    const allProductIds = new Set([...originalItemsMap.keys(), ...newItemsMap.keys()]);
    
    allProductIds.forEach(productId => {
      const originalQty = originalItemsMap.get(productId) || 0;
      const newQty = newItemsMap.get(productId) || 0;
      const quantityChange = newQty - originalQty;
      if (quantityChange !== 0) {
        adjustments.push({ productId, quantityChange: newQty - originalQty }); 
      }
    });
    return adjustments;
  }
}