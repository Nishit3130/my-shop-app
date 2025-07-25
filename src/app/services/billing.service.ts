import { Injectable, inject } from '@angular/core';
import { Bill, BillItem, DocumentType, PaymentType, QuotationStatus } from '../models/bill.model';
import { StorageService } from './storage.service';
import { ProductService } from './product.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly DOCS_KEY = 'billing_documents';
  private storageService = inject(StorageService);
  private productService = inject(ProductService);

  private documentsSubject = new BehaviorSubject<Bill[]>([]);
  public documents$: Observable<Bill[]> = this.documentsSubject.asObservable();

  public bills$: Observable<Bill[]> = this.documents$.pipe(
    map(docs => docs.filter(doc => doc.documentType === DocumentType.BILL))
  );

  public quotations$: Observable<Bill[]> = this.documents$.pipe(
    map(docs => docs.filter(doc => doc.documentType === DocumentType.QUOTATION))
  );

  constructor() {
    this.documentsSubject.next(this.storageService.getData(this.DOCS_KEY) || []);
  }

  private saveDataAndNotify(documents: Bill[]): void {
    this.storageService.saveData(this.DOCS_KEY, documents);
    this.documentsSubject.next([...documents]);
  }

  getAllDocuments(): Bill[] {
    return this.documentsSubject.getValue();
  }
  
  getAllBills(): Bill[] {
    return this.getAllDocuments().filter(doc => doc.documentType === DocumentType.BILL);
  }

  getAllQuotations(): Bill[] {
    return this.getAllDocuments().filter(doc => doc.documentType === DocumentType.QUOTATION);
  }

  getBillById(id: string): Bill | undefined {
    return this.getAllDocuments().find(doc => doc.id === id);
  }

  getBillsByCustomerId(customerId: string): Bill[] {
    if (!customerId) return [];
    return this.getAllBills()
      .filter(bill => bill.customerId === customerId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  
  getPendingBills(): Bill[] {
    return this.getAllBills().filter(bill =>
      bill.paymentType === PaymentType.CREDIT && (bill.total - bill.amountPaid > 0)
    );
  }

  getBillsByDateRange(start: Date, end: Date): Bill[] {
    const startTime = start.getTime();
    // Use end as exclusive upper bound, do not add extra day
    const endTime = end.getTime();

    return this.getAllBills().filter(bill => {
      const billTime = new Date(bill.createdAt).getTime();
      return billTime >= startTime && billTime < endTime;
    });
  }

  createDocument(docData: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'billNo'>): Bill {
    const allDocs = this.getAllDocuments();
    const isBill = docData.documentType === DocumentType.BILL;
    const sequenceKey = isBill ? 'bill_sequence_number' : 'quotation_sequence_number';
    const prefix = isBill ? 'INV-' : 'QTN-';
    
    const nextSequence = this.storageService.getNextSequence(sequenceKey);
    const formattedDocNo = `${prefix}${String(nextSequence).padStart(5, '0')}`;

    const newDocument: Bill = {
      ...docData,
      id: this.storageService.generateId(),
      billNo: formattedDocNo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isBill) {
      newDocument.items.forEach(item => {
        if (item.productId) {
          this.productService.updateStock(item.productId, -item.quantity);
        }
      });
    }

    this.saveDataAndNotify([...allDocs, newDocument]);
    this.storageService.saveSequence(sequenceKey, nextSequence);
    return newDocument;
  }

  updateBill(id: string, billUpdateData: Partial<Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'billNo'>>): Bill | null {
    const allDocs = this.getAllDocuments();
    const index = allDocs.findIndex(b => b.id === id);

    if (index !== -1) {
      const originalBill = allDocs[index];
      allDocs[index] = {
        ...originalBill,
        ...billUpdateData,
        billNo: originalBill.billNo,
        updatedAt: new Date()
      };
      this.saveDataAndNotify([...allDocs]);
      return allDocs[index];
    }
    return null;
  }

  deleteBill(id: string): boolean {
    const allDocs = this.getAllDocuments();
    const docToDelete = allDocs.find(d => d.id === id);

    if (docToDelete && docToDelete.documentType === DocumentType.BILL) {
      docToDelete.items.forEach(item => {
        if (item.productId) {
          this.productService.updateStock(item.productId, item.quantity); // Add stock back
        }
      });
    }

    const filteredDocs = allDocs.filter(d => d.id !== id);
    if (filteredDocs.length !== allDocs.length) {
      this.saveDataAndNotify(filteredDocs);
      return true;
    }
    return false;
  }
  
  markBillAsPaid(id: string): Bill | null {
    const bill = this.getBillById(id);
    if (bill && bill.documentType === DocumentType.BILL) {
      return this.updateBill(id, { amountPaid: bill.total });
    }
    return null;
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
  
      if (difference !== 0) {
        adjustments.push({ productId: productId, quantityChange: difference });
      }
    });
    return adjustments;
  }
}