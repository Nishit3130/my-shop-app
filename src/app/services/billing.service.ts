
import { Injectable, inject } from '@angular/core';
import { Bill, BillItem, DocumentType, PaymentType } from '../models/bill.model';
import { ProductService } from './product.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private productService = inject(ProductService);
  private documentsSubject = new BehaviorSubject<Bill[]>([]);
  public documents$: Observable<Bill[]> = this.documentsSubject.asObservable();

  public bills$: Observable<Bill[]> = this.documents$.pipe(
    map(docs => docs.filter(doc => doc.documentType === DocumentType.BILL))
  );

  constructor() {
    this.refreshDocuments();
  }

  async refreshDocuments(): Promise<void> {
    const rawDocs = await window.electronAPI.getBills();
    const formattedDocs = rawDocs.map((doc: any) => ({
      ...doc,
      // Convert SQLite string dates back to JS Date objects
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
      items: typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items
    }));
    this.documentsSubject.next(formattedDocs);
  }

  // --- RESTORED MISSING METHODS ---

  getAllDocuments(): Bill[] {
    return this.documentsSubject.getValue();
  }

  async getBillById(id: string): Promise<Bill | undefined> {
    const doc = await window.electronAPI.getBill(id);
    if (doc) {
      return {
        ...doc,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
        items: typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items
      };
    }
    return undefined;
  }

  getBillsByCustomerId(customerId: string): Bill[] {
    return this.getAllDocuments().filter(b => b.customerId === customerId);
  }

  getPendingBills(): Bill[] {
    return this.getAllDocuments().filter(bill =>
      bill.paymentType === PaymentType.CREDIT && (bill.total - bill.amountPaid > 0)
    );
  }

  getBillsByDateRange(start: Date, end: Date): Bill[] {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return this.getAllDocuments().filter(bill => {
      const billTime = bill.createdAt.getTime();
      return billTime >= startTime && billTime < endTime;
    });
  }

  // --- CORE DATABASE OPERATIONS ---

  async createDocument(docData: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'billNo'>): Promise<Bill> {
    const isBill = docData.documentType === DocumentType.BILL;
    const billNo = await window.electronAPI.getNextBillNumber();

    const newDocument: Bill = {
      ...docData,
      id: Date.now().toString(36),
      billNo: billNo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isBill) {
      for (const item of newDocument.items) {
        if (item.productId) {
          await this.productService.updateStock(item.productId, -item.quantity);
        }
      }
    }

    const dbPayload = { 
      ...newDocument, 
      createdAt: newDocument.createdAt.toISOString(), 
      updatedAt: newDocument.updatedAt.toISOString() 
    };

    await window.electronAPI.addBill(dbPayload);
    await this.refreshDocuments();
    return newDocument;
  }

  async updateBill(id: string, updateData: Partial<Bill>): Promise<void> {
    const current = await this.getBillById(id);
    if (current) {
      const updated = { 
        ...current, 
        ...updateData, 
        updatedAt: new Date() 
      };
      
      const dbPayload = { 
        ...updated, 
        createdAt: updated.createdAt.toISOString(), 
        updatedAt: updated.updatedAt.toISOString() 
      };
      
      await window.electronAPI.updateBill(id, dbPayload);
      await this.refreshDocuments();
    }
  }
// Add this to src/app/services/billing.service.ts
async deleteBill(id: string): Promise<void> {
  const docToDelete = await this.getBillById(id);
  if (docToDelete && docToDelete.documentType === DocumentType.BILL) {
    for (const item of docToDelete.items) {
      if (item.productId) {
        await this.productService.updateStock(item.productId, item.quantity);
      }
    }
  }
  await window.electronAPI.deleteBill(id);
  await this.refreshDocuments();
}
  calculateStockAdjustments(originalItems: BillItem[], newItems: BillItem[]): { productId: string, quantityChange: number }[] {
    const adjustments: { productId: string, quantityChange: number }[] = [];
    const newCartMap = new Map(newItems.filter(i => i.productId).map(i => [i.productId!, Number(i.quantity) || 0]));
    const originalCartMap = new Map(originalItems.filter(i => i.productId).map(i => [i.productId!, Number(i.quantity) || 0]));
    const allProductIds = new Set([...originalCartMap.keys(), ...newCartMap.keys()]);
  
    allProductIds.forEach(productId => {
      const originalQuantity = originalCartMap.get(productId) || 0;
      const newQuantity = newCartMap.get(productId) || 0;
      const difference = originalQuantity - newQuantity;
      if (difference !== 0) adjustments.push({ productId, quantityChange: difference });
    });
    return adjustments;
  }
}