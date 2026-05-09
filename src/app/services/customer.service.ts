// import { Injectable, inject } from '@angular/core';
// import { Customer } from '../models/customer.model';
// import { StorageService } from './storage.service';
// import { BehaviorSubject, Observable } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class CustomerService {
//   private readonly CUSTOMERS_KEY = 'customers';
//   private storageService = inject(StorageService);



//   private customersSubject = new BehaviorSubject<Customer[]>([]);
//   public customers$: Observable<Customer[]> = this.customersSubject.asObservable();

//   constructor() {
//     this.customersSubject.next(this.storageService.getData(this.CUSTOMERS_KEY) || []);
//   }

//   private saveDataAndNotify(customers: Customer[]): void {
//     this.storageService.saveData(this.CUSTOMERS_KEY, customers);
//     this.customersSubject.next([...customers]);
//   }

//   getCustomers(): Customer[] {
//     return this.customersSubject.getValue();
//   }

//   getCustomerById(id: string): Customer | undefined {
//     return this.getCustomers().find(customer => customer.id === id);
//   }

//   findCustomersByName(name: string): Customer[] {
//     if (!name.trim()) return [];
//     const lowerCaseName = name.toLowerCase();
//     return this.getCustomers().filter(customer =>
//       customer.name.toLowerCase().includes(lowerCaseName)
//     );
//   }

//   getCustomerByPhone(phone: string): Customer | undefined {
//     if (!phone || !phone.trim()) return undefined;
//     const trimmedPhone = phone.trim();
//     return this.getCustomers().find(customer => customer.phone === trimmedPhone);
//   }

//   getCustomerByEmail(email: string): Customer | undefined {
//     if (!email || !email.trim()) return undefined;
//     const lowerCaseEmail = email.trim().toLowerCase();
//     return this.getCustomers().find(customer =>
//       customer.email?.toLowerCase() === lowerCaseEmail
//     );
//   }

//   addCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'creditBalance'>): Customer {
//     const customers = this.getCustomers();
//     const trimmedPhone = customerData.phone?.trim();
//     const trimmedEmail = customerData.email?.trim()?.toLowerCase();

//     if (trimmedPhone && this.getCustomerByPhone(trimmedPhone)) {
//       throw new Error(`A customer with phone number ${trimmedPhone} already exists.`);
//     }
//     if (trimmedEmail && this.getCustomerByEmail(trimmedEmail)) {
//       throw new Error(`A customer with email ${trimmedEmail} already exists.`);
//     }

//     const newCustomer: Customer = {
//       id: this.storageService.generateId(),
//       name: customerData.name.trim(),
//       phone: trimmedPhone || undefined,
//       email: trimmedEmail || undefined,
//       address: customerData.address?.trim() || undefined,
//       creditBalance: 0,
//       createdAt: new Date(),
//       updatedAt: new Date()
//     };
//     this.saveDataAndNotify([...customers, newCustomer]);
//     return newCustomer;
//   }

//   updateCustomer(id: string, customerUpdateData: Partial<Omit<Customer, 'id' | 'createdAt'>>): Customer | null {
//     const customers = this.getCustomers();
//     const index = customers.findIndex(c => c.id === id);

//     if (index !== -1) {
//       const originalCustomer = customers[index];
//       const newPhone = customerUpdateData.phone?.trim();
//       const newEmail = customerUpdateData.email?.trim()?.toLowerCase();

//       if (newPhone && newPhone !== originalCustomer.phone) {
//         if (this.getCustomers().some(c => c.phone === newPhone && c.id !== id)) {
//           throw new Error(`Phone number ${newPhone} is already in use by another customer.`);
//         }
//       }
//       if (newEmail && newEmail !== originalCustomer.email?.toLowerCase()) {
//         if (this.getCustomers().some(c => c.email?.toLowerCase() === newEmail && c.id !== id)) {
//           throw new Error(`Email ${newEmail} is already in use by another customer.`);
//         }
//       }

//       customers[index] = { ...customers[index], ...customerUpdateData, updatedAt: new Date() };


//       this.saveDataAndNotify([...customers]);
//       return customers[index];
//     }
//     return null;
//   }



//   updateCustomerCreditBalance(customerId: string, amountChange: number): Customer | null {
//     const customer = this.getCustomerById(customerId);
//     if (customer) {
//       const newCreditBalance = (customer.creditBalance || 0) + amountChange;
//       return this.updateCustomer(customerId, { creditBalance: parseFloat(newCreditBalance.toFixed(2)) });
//     }
//     return null;
//   }
  
//   deleteCustomer(id: string): boolean {
//     const customers = this.getCustomers();
//     const updatedCustomers = customers.filter(c => c.id !== id);
//     if (updatedCustomers.length < customers.length) {
//       this.saveDataAndNotify(updatedCustomers);
//       return true;
//     }
//     return false;
//   }
// }
// src/app/services/customer.service.ts

import { Injectable } from '@angular/core';
import { Customer } from '../models/customer.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private customersSubject = new BehaviorSubject<Customer[]>([]);
  public customers$: Observable<Customer[]> = this.customersSubject.asObservable();

  private isElectron = !!(window && window.electronAPI);
  private memoryFallback: Customer[] = [];

  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    if (this.isElectron) {
      const result = await window.electronAPI.getCustomers();
      if (result?.success) {
        this.customersSubject.next(result.data);
      }
    } else {
      this.customersSubject.next([...this.memoryFallback]);
    }
  }

  // --- GETTERS & SEARCH HELPERS ---

  getCustomers(): Customer[] {
    return this.customersSubject.getValue();
  }

  getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find(c => c.id === id);
  }

  findCustomersByName(name: string): Customer[] {
    if (!name.trim()) return [];
    const term = name.toLowerCase();
    return this.getCustomers().filter(c => c.name.toLowerCase().includes(term));
  }

  // RESTORED: Search by phone
  getCustomerByPhone(phone: string): Customer | undefined {
    if (!phone || !phone.trim()) return undefined;
    const trimmedPhone = phone.trim();
    return this.getCustomers().find(customer => customer.phone === trimmedPhone);
  }

  // RESTORED: Search by email
  getCustomerByEmail(email: string): Customer | undefined {
    if (!email || !email.trim()) return undefined;
    const lowerCaseEmail = email.trim().toLowerCase();
    return this.getCustomers().find(customer =>
      customer.email?.toLowerCase() === lowerCaseEmail
    );
  }

  // --- ASYNC CRUD OPERATIONS ---

  async addCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'creditBalance'>): Promise<Customer> {
    // RESTORED: Duplicate checking logic
    const trimmedPhone = customerData.phone?.trim();
    const trimmedEmail = customerData.email?.trim()?.toLowerCase();

    if (trimmedPhone && this.getCustomerByPhone(trimmedPhone)) {
      throw new Error(`A customer with phone number ${trimmedPhone} already exists.`);
    }
    if (trimmedEmail && this.getCustomerByEmail(trimmedEmail)) {
      throw new Error(`A customer with email ${trimmedEmail} already exists.`);
    }

    const newCustomer: Customer = {
      ...customerData,
      id: Math.random().toString(36).substring(2, 10),
      creditBalance: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.isElectron) {
      await window.electronAPI.addCustomer(newCustomer);
    } else {
      this.memoryFallback.push(newCustomer);
    }

    this.customersSubject.next([...this.getCustomers(), newCustomer]);
    return newCustomer;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<boolean> {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return false;

    // RESTORED: Duplicate checking logic for updates
    const originalCustomer = customers[index];
    const newPhone = data.phone?.trim();
    const newEmail = data.email?.trim()?.toLowerCase();

    if (newPhone && newPhone !== originalCustomer.phone) {
      if (this.getCustomers().some(c => c.phone === newPhone && c.id !== id)) {
        throw new Error(`Phone number ${newPhone} is already in use by another customer.`);
      }
    }
    if (newEmail && newEmail !== originalCustomer.email?.toLowerCase()) {
      if (this.getCustomers().some(c => c.email?.toLowerCase() === newEmail && c.id !== id)) {
        throw new Error(`Email ${newEmail} is already in use by another customer.`);
      }
    }

    const updated = { ...originalCustomer, ...data, updatedAt: new Date() };

    if (this.isElectron) {
      await window.electronAPI.updateCustomer(id, updated);
    } else {
      this.memoryFallback[index] = updated;
    }

    customers[index] = updated;
    this.customersSubject.next([...customers]);
    return true;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    if (this.isElectron) {
      const result = await window.electronAPI.deleteCustomer(id);
      if (!result.success) return false;
    } else {
      this.memoryFallback = this.memoryFallback.filter(c => c.id !== id);
    }

    this.customersSubject.next(this.getCustomers().filter(c => c.id !== id));
    return true;
  }

  async updateCustomerCreditBalance(customerId: string, amountChange: number): Promise<void> {
    const customer = this.getCustomerById(customerId);
    if (customer) {
      const newBalance = parseFloat(((customer.creditBalance || 0) + amountChange).toFixed(2));
      await this.updateCustomer(customerId, { creditBalance: newBalance });
    }
  }
}