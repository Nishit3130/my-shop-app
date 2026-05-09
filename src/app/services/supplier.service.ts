// import { Injectable, inject, Injector } from '@angular/core';
// import { Supplier } from '../models/supplier.model';
// import { StorageService } from './storage.service';
// import { BehaviorSubject, Observable } from 'rxjs';
// import { PurchaseService } from './purchase.service';

// @Injectable({
//   providedIn: 'root'
// })
// export class SupplierService {
//   private readonly SUPPLIERS_KEY = 'suppliers';
//   private storageService = inject(StorageService);

//   // Inject the master Injector to break the dependency cycle.
//   private injector = inject(Injector);

//   private suppliersSubject = new BehaviorSubject<Supplier[]>([]);
//   public suppliers$: Observable<Supplier[]> = this.suppliersSubject.asObservable();

//   constructor() {
//     this.suppliersSubject.next(this.storageService.getData(this.SUPPLIERS_KEY) || []);
//   }

//   private saveDataAndNotify(suppliers: Supplier[]): void {
//     this.storageService.saveData(this.SUPPLIERS_KEY, suppliers);
//     this.suppliersSubject.next([...suppliers]);
//   }

//   getSuppliers(): Supplier[] {
//     return this.suppliersSubject.getValue();
//   }

//   getSupplierById(id: string): Supplier | undefined {
//     return this.getSuppliers().find(s => s.id === id);
//   }

//   addSupplier(supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'balanceDue'>): Supplier {
//     const suppliers = this.getSuppliers();
//     const trimmedPhone = supplierData.phone?.trim();

//     if (trimmedPhone && suppliers.some(s => s.phone === trimmedPhone)) {
//       throw new Error(`Error: A supplier with phone number ${trimmedPhone} already exists.`);
//     }
    
//     const newSupplier: Supplier = {
//       ...supplierData,
//       id: this.storageService.generateId(),
//       balanceDue: 0,
//       createdAt: new Date(),
//       updatedAt: new Date()
//     };
//     this.saveDataAndNotify([...suppliers, newSupplier]);
//     return newSupplier;
//   }

//   updateSupplier(id: string, updateData: Partial<Omit<Supplier, 'id' | 'createdAt'>>): Supplier | null {
//     const suppliers = this.getSuppliers();
//     const index = suppliers.findIndex(s => s.id === id);

//     if (index !== -1) {
//       suppliers[index] = { ...suppliers[index], ...updateData, updatedAt: new Date() };
//       const updatedSupplier = suppliers[index];
      
//       if(updatedSupplier && updateData.name) {
//           this.propagateSupplierUpdateToPurchases(id, updatedSupplier);
//       }

//       this.saveDataAndNotify([...suppliers]);
//       return updatedSupplier;
//     }
//     return null;
//   }

//   private propagateSupplierUpdateToPurchases(supplierId: string, updatedSupplier: Supplier): void {
//     const purchaseService = this.injector.get(PurchaseService);
      
//     console.log(`Supplier name updated. Propagation hook is ready.`);
//   }

//   deleteSupplier(id: string): boolean {
//     const purchaseService = this.injector.get(PurchaseService);
//     const supplierPurchases = purchaseService.getAllPurchases().filter(p => p.supplierId === id);

//     if (supplierPurchases.length > 0) {
//       throw new Error(
//         'This supplier cannot be deleted because they have ' + supplierPurchases.length + ' associated purchase invoice(s).'
//       );
//     }

//     let suppliers = this.getSuppliers();
//     const initialLength = suppliers.length;
//     const updatedSuppliers = suppliers.filter(s => s.id !== id);

//     if (updatedSuppliers.length < initialLength) {
//       this.saveDataAndNotify(updatedSuppliers);
//       return true;
//     }
//     return false;
//   }


//   updateSupplierBalance(supplierId: string, amountChange: number): Supplier | null {
//     const supplier = this.getSupplierById(supplierId);
//     if (supplier) {
//       const newBalance = (supplier.balanceDue || 0) + amountChange;
//       return this.updateSupplier(supplierId, { balanceDue: parseFloat(newBalance.toFixed(2)) });
//     }
//     console.error(`Supplier not found for ID: ${supplierId} while trying to update balance due.`);
//     return null;
//   }
// }

import { Injectable, inject, Injector } from '@angular/core';
import { Supplier } from '../models/supplier.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { PurchaseService } from './purchase.service';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  // RESTORED: Inject the master Injector to break the dependency cycle.
  private injector = inject(Injector);

  private suppliersSubject = new BehaviorSubject<Supplier[]>([]);
  public suppliers$: Observable<Supplier[]> = this.suppliersSubject.asObservable();

  private isElectron = !!(window && window.electronAPI);
  private memoryFallback: Supplier[] = [];

  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    if (this.isElectron) {
      const result = await window.electronAPI.getSuppliers();
      if (result?.success) {
        this.suppliersSubject.next(result.data);
      }
    } else {
      this.suppliersSubject.next([...this.memoryFallback]);
    }
  }

  getSuppliers(): Supplier[] {
    return this.suppliersSubject.getValue();
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.getSuppliers().find(s => s.id === id);
  }

  async addSupplier(supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'balanceDue'>): Promise<Supplier> {
    // RESTORED: Duplicate Phone Validation
    const suppliers = this.getSuppliers();
    const trimmedPhone = supplierData.phone?.trim();

    if (trimmedPhone && suppliers.some(s => s.phone === trimmedPhone)) {
      throw new Error(`Error: A supplier with phone number ${trimmedPhone} already exists.`);
    }

    const newSupplier: Supplier = {
      ...supplierData,
      id: Math.random().toString(36).substring(2, 10),
      balanceDue: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.isElectron) {
      await window.electronAPI.addSupplier(newSupplier);
    } else {
      this.memoryFallback.push(newSupplier);
    }

    this.suppliersSubject.next([...this.getSuppliers(), newSupplier]);
    return newSupplier;
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<boolean> {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex(s => s.id === id);
    if (index === -1) return false;

    const updated = { ...suppliers[index], ...data, updatedAt: new Date() };

    if (this.isElectron) {
      await window.electronAPI.updateSupplier(id, updated);
    } else {
      this.memoryFallback[index] = updated;
    }

    // RESTORED: Update Propagation Hook
    if (updated && data.name) {
      this.propagateSupplierUpdateToPurchases(id, updated);
    }

    suppliers[index] = updated;
    this.suppliersSubject.next([...suppliers]);
    return true;
  }

  // RESTORED: Missing Hook Method
  private propagateSupplierUpdateToPurchases(supplierId: string, updatedSupplier: Supplier): void {
    const purchaseService = this.injector.get(PurchaseService);
    console.log(`Supplier name updated. Propagation hook is ready.`);
  }

  async deleteSupplier(id: string): Promise<boolean> {
    // RESTORED: Validation to prevent deleting suppliers with active purchases
    const purchaseService = this.injector.get(PurchaseService);
    const supplierPurchases = purchaseService.getAllPurchases().filter(p => p.supplierId === id);

    if (supplierPurchases.length > 0) {
      throw new Error(
        'This supplier cannot be deleted because they have ' + supplierPurchases.length + ' associated purchase invoice(s).'
      );
    }

    if (this.isElectron) {
      const result = await window.electronAPI.deleteSupplier(id);
      if (!result.success) return false;
    } else {
      this.memoryFallback = this.memoryFallback.filter(s => s.id !== id);
    }

    this.suppliersSubject.next(this.getSuppliers().filter(s => s.id !== id));
    return true;
  }

  async updateSupplierBalance(supplierId: string, amountChange: number): Promise<void> {
    const supplier = this.getSupplierById(supplierId);
    if (supplier) {
      const newBalance = parseFloat(((supplier.balanceDue || 0) + amountChange).toFixed(2));
      await this.updateSupplier(supplierId, { balanceDue: newBalance });
    } else {
      // RESTORED: Error logging if supplier not found during balance update
      console.error(`Supplier not found for ID: ${supplierId} while trying to update balance due.`);
    }
  }
}