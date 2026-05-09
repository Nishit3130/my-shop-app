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
    this.refreshPurchases();
  }

  /**
   * Syncs the internal BehaviorSubject with the SQLite database
   */
  async refreshPurchases(): Promise<void> {
    const data = await window.electronAPI.getPurchases();
    // Parse JSON items stored in SQLite back into an array
    const formattedData = data.map((p: any) => ({
      ...p,
      items: typeof p.items === 'string' ? JSON.parse(p.items) : p.items,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
      purchaseDate: new Date(p.purchaseDate)
    }));
    this.purchasesSubject.next(formattedData);
  }

  getAllPurchases(): PurchaseInvoice[] {
    return this.purchasesSubject.getValue();
  }

  async getPurchaseById(id: string): Promise<PurchaseInvoice | undefined> {
    const purchase = await window.electronAPI.getPurchase(id);
    if (purchase) {
      return {
        ...purchase,
        items: typeof purchase.items === 'string' ? JSON.parse(purchase.items) : purchase.items,
        createdAt: new Date(purchase.createdAt),
        updatedAt: new Date(purchase.updatedAt),
        purchaseDate: new Date(purchase.purchaseDate)
      };
    }
    return undefined;
  }

  async createPurchaseInvoice(invoiceData: Omit<PurchaseInvoice, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<PurchaseInvoice> {
    // 1. Create any new products first
    for (const item of invoiceData.items) {
      if (item.isNew && !item.productId) {
        const newProduct = await this.productService.addProduct({
          name: item.productName, 
          price: item.sellingPrice || 0,
          purchasePrice: item.purchasePrice, 
          stock: 0, 
          category: '', 
          description: ''
        });
        item.productId = newProduct.id;
      }
    }

    // 2. Update stock and prices for all items
    for (const item of invoiceData.items) {
      await this.productService.updateProduct(item.productId!, { purchasePrice: item.purchasePrice });
      await this.productService.updateStock(item.productId!, item.quantity);
    }

    // 3. Update supplier balance
    await this.supplierService.updateSupplierBalance(invoiceData.supplierId, invoiceData.totalAmount);
    
    let status: PurchaseStatus;
    if (invoiceData.amountPaid >= invoiceData.totalAmount) { status = PurchaseStatus.PAID; }
    else if (invoiceData.amountPaid > 0) { status = PurchaseStatus.PARTIALLY_PAID; }
    else { status = PurchaseStatus.UNPAID; }

    const newPurchase: PurchaseInvoice = {
      ...invoiceData,
      id: this.storageService.generateId(), 
      status: status,
      createdAt: new Date(), 
      updatedAt: new Date()
    };

    // Prepare for SQLite (stringify items and format dates)
    const dbPayload = {
      ...newPurchase,
      items: JSON.stringify(newPurchase.items),
      createdAt: newPurchase.createdAt.toISOString(),
      updatedAt: newPurchase.updatedAt.toISOString(),
      purchaseDate: newPurchase.purchaseDate instanceof Date ? 
                    newPurchase.purchaseDate.toISOString() : 
                    new Date(newPurchase.purchaseDate).toISOString()
    };

    await window.electronAPI.addPurchase(dbPayload);
    await this.refreshPurchases();
    return newPurchase;
  }
  
  async updatePurchaseInvoice(id: string, updateData: Partial<Omit<PurchaseInvoice, 'id' | 'createdAt'>>): Promise<PurchaseInvoice | null> {
    const originalInvoice = await this.getPurchaseById(id);
    if (!originalInvoice) return null;

    const updatedInvoice = { ...originalInvoice, ...updateData, updatedAt: new Date() };
    
    // 1. Handle stock adjustments
    const stockAdjustments = this._calculateStockAdjustments(originalInvoice.items, updatedInvoice.items);
    for (const adj of stockAdjustments) {
      await this.productService.updateStock(adj.productId, adj.quantityChange);
    }
    
    // 2. Handle balance changes
    const balanceChange = (updatedInvoice.totalAmount || 0) - (originalInvoice.totalAmount || 0);
    const paymentChange = (updatedInvoice.amountPaid || 0) - (originalInvoice.amountPaid || 0);
    const netBalanceChange = balanceChange - paymentChange;
    
    if (netBalanceChange !== 0) {
      await this.supplierService.updateSupplierBalance(updatedInvoice.supplierId, netBalanceChange);
    }
    
    const dbPayload = {
      ...updatedInvoice,
      items: JSON.stringify(updatedInvoice.items),
      updatedAt: updatedInvoice.updatedAt.toISOString(),
      purchaseDate: updatedInvoice.purchaseDate instanceof Date ? 
                    updatedInvoice.purchaseDate.toISOString() : 
                    new Date(updatedInvoice.purchaseDate).toISOString()
    };

    await window.electronAPI.updatePurchase(id, dbPayload);
    await this.refreshPurchases();
    return updatedInvoice;
  }

  async deletePurchaseInvoice(id: string): Promise<boolean> {
    const supplierPaymentService = this.injector.get(SupplierPaymentService);
    const purchaseToDelete = await this.getPurchaseById(id);
    
    if (!purchaseToDelete) {
      console.error(`Purchase invoice with ID ${id} not found.`);
      return false;
    }
    
    // 1. Reverse stock changes
    for (const item of purchaseToDelete.items) {
      await this.productService.updateStock(item.productId!, -item.quantity);
    }

    // 2. Delete associated payments
    const associatedPayments = await supplierPaymentService.getPaymentsByInvoiceId(id);
    for (const payment of associatedPayments) {
      await supplierPaymentService.deletePayment(payment.id);
    }
    
    // 3. Reverse supplier balance
    await this.supplierService.updateSupplierBalance(purchaseToDelete.supplierId, -purchaseToDelete.totalAmount);
    
    await window.electronAPI.deletePurchase(id);
    await this.refreshPurchases();
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
        adjustments.push({ productId, quantityChange: quantityChange }); 
      }
    });
    return adjustments;
  }
}