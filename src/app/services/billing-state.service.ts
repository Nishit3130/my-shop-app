import { Injectable } from '@angular/core';
import { BillItem, PaymentType } from '../models/bill.model';
import { Customer } from '../models/customer.model';

// Interface to define the shape of the state we want to preserve
export interface BillingFormState {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  selectedCustomer: Customer | null;
  customerCreditBalance: number;

  paymentType: PaymentType;
  remark: string;
  transportName: string;
  
  cart: BillItem[];
  discount: number;
  taxAmountInput: number; // Manual tax
  packingCharge: number;
  handlingCharge: number;
  deliveryCharge: number;
  
  applyAvailableCreditToBill: boolean; // CORRECTED NAME
}

@Injectable({
  providedIn: 'root'
})
export class BillingStateService {
  private readonly BILLING_STATE_KEY = 'billingFormDraftState';
  private currentState: BillingFormState | null = null;

  constructor() {
    this.loadStateFromSessionStorage();
  }

  private getDefaultState(): BillingFormState {
    return {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      selectedCustomer: null,
      customerCreditBalance: 0,
      paymentType: PaymentType.CASH,
      remark: '',
      transportName: '',
      cart: [],
      discount: 0,
      taxAmountInput: 0,
      packingCharge: 0,
      handlingCharge: 0,
      deliveryCharge: 0,
      applyAvailableCreditToBill: true, // CORRECTED NAME and using default
    };
  }

  private loadStateFromSessionStorage(): void {
    try {
      const storedState = sessionStorage.getItem(this.BILLING_STATE_KEY);
      if (storedState) {
        this.currentState = JSON.parse(storedState) as BillingFormState; // Cast to ensure type
        // Migration for old property name
        if (this.currentState && this.currentState.hasOwnProperty('applyCreditToCashBill') && !this.currentState.hasOwnProperty('applyAvailableCreditToBill')) {
            this.currentState.applyAvailableCreditToBill = (this.currentState as any).applyCreditToCashBill;
            delete (this.currentState as any).applyCreditToCashBill;
        } else if (this.currentState && !this.currentState.hasOwnProperty('applyAvailableCreditToBill')) {
            // If neither old nor new property exists, set to default
            this.currentState.applyAvailableCreditToBill = this.getDefaultState().applyAvailableCreditToBill;
        }
      } else {
        this.currentState = null; 
      }
    } catch (e) {
      console.error("Error loading billing state from session storage:", e);
      this.currentState = null;
    }
  }

  private saveStateToSessionStorage(): void {
    try {
      if (this.currentState) {
        sessionStorage.setItem(this.BILLING_STATE_KEY, JSON.stringify(this.currentState));
      } else {
        sessionStorage.removeItem(this.BILLING_STATE_KEY);
      }
    } catch (e) {
      console.error("Error saving billing state to session storage:", e);
    }
  }

  getState(): BillingFormState {
    const defaultState = this.getDefaultState();
    const stateToReturn = this.currentState ? { ...defaultState, ...this.currentState } : { ...defaultState };
    // Ensure the critical property is always present in the returned state object
    if (!stateToReturn.hasOwnProperty('applyAvailableCreditToBill')) {
        stateToReturn.applyAvailableCreditToBill = defaultState.applyAvailableCreditToBill;
    }
    return stateToReturn;
  }

  updateState(partialState: Partial<BillingFormState>): void {
    const defaultState = this.getDefaultState();
    // Initialize with default if current state is null to ensure all keys exist
    if (!this.currentState) {
      this.currentState = { ...defaultState };
    }
    
    // Handle potential old key name if passed in partialState
    let stateToUpdate = { ...partialState };
    if (stateToUpdate.hasOwnProperty('applyCreditToCashBill') && !stateToUpdate.hasOwnProperty('applyAvailableCreditToBill')) {
        stateToUpdate.applyAvailableCreditToBill = (stateToUpdate as any).applyCreditToCashBill;
        delete (stateToUpdate as any).applyCreditToCashBill;
    }

    this.currentState = { ...this.currentState, ...stateToUpdate };
    this.saveStateToSessionStorage();
  }

  clearBillingState(): void {
    this.currentState = null;
    this.saveStateToSessionStorage();
  }

  hasState(): boolean {
    if (!this.currentState) return false;
    return this.currentState.cart.length > 0 ||
           this.currentState.customerName.trim() !== '' ||
           this.currentState.customerPhone.trim() !== '' ||
           this.currentState.discount > 0 || 
           this.currentState.taxAmountInput > 0 ||
           this.currentState.packingCharge > 0 ||
           this.currentState.handlingCharge > 0 ||
           this.currentState.deliveryCharge > 0;
  }
}