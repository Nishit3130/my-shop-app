import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { BillingService } from '../../services/billing.service';
import { CustomerService } from '../../services/customer.service';
import { PaymentService } from '../../services/payment.service';
import { BillingStateService, BillingFormState } from '../../services/billing-state.service';
import { Product } from '../../models/product.model';
import { BillItem, PaymentType, Bill, DocumentType, QuotationStatus } from '../../models/bill.model';
import { Customer } from '../../models/customer.model';
import { SettingsService } from '../../services/settings.service';
import { AppSettings } from '../../models/settings.model';
@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.css']
})
export class BillingComponent implements OnInit, OnDestroy {
  @ViewChild('productNameInput') productNameInputRef!: ElementRef;

  editMode = false;
  editingBillId: string | null = null;
  pageTitle = 'Create New Bill';
  originalBillForEdit: Bill | null = null;
  appSettings!: AppSettings;
  today = new Date();
  
  documentMode: DocumentType = DocumentType.BILL;
  public DocumentType = DocumentType;
  originalQuoteIdToDelete: string | null = null;

  customerName = '';
  customerPhone = '';
  customerAddress = '';
  customerSearchResults: Customer[] = [];
  selectedCustomer: Customer | null = null;
  showCustomerSearchResults = false;
  private customerSearchTimeout: any;

  paymentType: PaymentType = PaymentType.CASH;
  public PaymentType = PaymentType;
  remark = '';
  transportName = '';

  cart: BillItem[] = [];
  newItem: { productName: string; quantity: number; price: number; stock: number | string; product?: Product } = {
    productName: '', quantity: 1, price: 0, stock: '-', product: undefined
  };
  productSearchResults: Product[] = [];
  showProductSearchResults = false;
  activeSuggestionIndex = -1;

  baseSubtotal = 0;
  totalItemDiscount = 0;
  discount = 0;
  taxAmountInput = 0;
  packingCharge = 0;
  handlingCharge = 0;
  deliveryCharge = 0;

  showBillConfirmation = false;
  generatedBill: Bill | null = null;
  applyCreditToBill: boolean = true;

  private billingStateService = inject(BillingStateService);
  private productService = inject(ProductService);
  private billingService = inject(BillingService);
  private customerService = inject(CustomerService);
  private settingsService = inject(SettingsService);
  private paymentService = inject(PaymentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    this.appSettings = this.settingsService.getSettings();
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      const isConvertingQuote = this.route.snapshot.url[1]?.path === 'from-quote';
      
      if (idParam && !isConvertingQuote) {
        this.editMode = true; 
        this.editingBillId = idParam; 
        this.loadBillForEditing(idParam);
      } else if (idParam && isConvertingQuote) {
        this.originalQuoteIdToDelete = idParam; 
        this.documentMode = DocumentType.BILL;
        this.pageTitle = 'Convert Quotation to Bill'; 
        this.loadBillForEditing(idParam, false);
        this.editMode = false;
      } else {
        this.editMode = false; 
        this.editingBillId = null; 
        this.pageTitle = 'Create New Bill';
        
        if (this.billingStateService.hasState()) {
          this.restoreState(this.billingStateService.getState());
        } else {
          this.resetBill();
        }
        
      }
    });
  }

  ngOnDestroy(): void {
    if (!this.editMode && this.cart.length > 0) { this.saveDraft(); }
  }

  saveDraft(): void {
    if (this.editMode || this.documentMode === DocumentType.QUOTATION) { return; }
    const state: BillingFormState = {
        customerName: this.customerName, 
        customerPhone: this.customerPhone, 
        customerEmail: '',
        customerAddress: this.customerAddress, 
        selectedCustomer: this.selectedCustomer,
        customerCreditBalance: this.selectedCustomer?.creditBalance || 0, 
        paymentType: this.paymentType,
        remark: this.remark, 
        transportName: this.transportName, 
        cart: this.cart,
        discount: this.discount, 
        taxAmountInput: this.taxAmountInput, 
        packingCharge: this.packingCharge,
        handlingCharge: this.handlingCharge, 
        deliveryCharge: this.deliveryCharge,
        applyAvailableCreditToBill: this.applyCreditToBill,
    };
    this.billingStateService.updateState(state);
  }

  restoreState(state: BillingFormState): void {
    this.customerName = state.customerName; 
    this.customerPhone = state.customerPhone;
    this.customerAddress = state.customerAddress; 
    this.selectedCustomer = state.selectedCustomer;
    this.paymentType = state.paymentType; 
    this.remark = state.remark;
    this.transportName = state.transportName; 
    this.cart = state.cart;
    this.discount = state.discount; 
    this.taxAmountInput = state.taxAmountInput;
    this.packingCharge = state.packingCharge; 
    this.handlingCharge = state.handlingCharge;
    this.deliveryCharge = state.deliveryCharge; 
    this.applyCreditToBill = state.applyAvailableCreditToBill;
    this.calculateAllTotals();
  }

  async loadBillForEditing(docId: string, isEdit: boolean = true): Promise<void> {
    const docToEdit = await this.billingService.getBillById(docId);
    if (docToEdit) {
      if (isEdit) {
        this.originalBillForEdit = JSON.parse(JSON.stringify(docToEdit));
        this.pageTitle = `Edit Bill #${docToEdit.billNo}`;
      } else {
        this.pageTitle = `Convert Quote #${docToEdit.billNo}`;
      }
      this.customerName = docToEdit.customerName;
      if (docToEdit.customerId) {
        const customer = this.customerService.getCustomerById(docToEdit.customerId);
        if (customer) { this.selectCustomer(customer); }
      }
      this.paymentType = docToEdit.paymentType; 
      this.remark = docToEdit.remark || '';
      this.transportName = docToEdit.transportName || '';
      this.cart = docToEdit.items.map(item => ({ 
        ...item, 
        discountType: item.discountType || 'FIXED', 
        discountValue: item.discountValue || 0 
      }));
      this.discount = docToEdit.discount || 0; 
      this.packingCharge = docToEdit.packingCharge || 0;
      this.handlingCharge = docToEdit.handlingCharge || 0; 
      this.deliveryCharge = docToEdit.deliveryCharge || 0;
      this.taxAmountInput = docToEdit.tax || 0;
      this.calculateAllTotals();
    } else {
      alert(`Document with ID ${docId} not found. Redirecting.`);
      this.router.navigate(['/billing']);
    }
  }

  onCustomerNameChange(newValue: string): void {
    this.customerName = newValue;
    if (this.customerSearchTimeout) { clearTimeout(this.customerSearchTimeout); }
    if (this.selectedCustomer && newValue !== this.selectedCustomer.name) {
      this.selectedCustomer = null;
    }
    if (newValue && newValue.trim().length > 1) {
      this.showCustomerSearchResults = true;
      this.customerSearchTimeout = setTimeout(() => {
        this.customerSearchResults = this.customerService.findCustomersByName(newValue);
      }, 300);
    } else {
      this.showCustomerSearchResults = false;
      this.customerSearchResults = [];
    }
    this.saveDraft();
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer; 
    this.customerName = customer.name;
    this.customerPhone = customer.phone || ''; 
    this.customerAddress = customer.address || '';
    this.customerSearchResults = []; 
    this.showCustomerSearchResults = false;
    this.saveDraft();
  }
  
  hideCustomerResults(): void { setTimeout(() => { this.showCustomerSearchResults = false; }, 300); }

  onProductInputKeydown(event: KeyboardEvent): void {
    if (this.showProductSearchResults) {
      if (event.key === 'ArrowDown') { 
        event.preventDefault(); 
        this.activeSuggestionIndex = (this.activeSuggestionIndex + 1) % this.productSearchResults.length; 
      }
      else if (event.key === 'ArrowUp') { 
        event.preventDefault(); 
        this.activeSuggestionIndex = (this.activeSuggestionIndex - 1 + this.productSearchResults.length) % this.productSearchResults.length; 
      }
      else if (event.key === 'Enter') {
        event.preventDefault();
        if (this.activeSuggestionIndex > -1) { 
          this.selectProduct(this.productSearchResults[this.activeSuggestionIndex]); 
        }
        else if (this.productSearchResults.length > 0) { 
          this.selectProduct(this.productSearchResults[0]); 
        }
        else { this.addProductToCart(); }
      } else if (event.key === 'Escape') { this.hideProductResults(); }
    }
  }

  onProductInput(): void {
    if (!this.newItem.productName || this.newItem.productName.trim().length < 2) { 
      this.productSearchResults = []; 
      this.showProductSearchResults = false; 
      return; 
    }
    this.showProductSearchResults = true; 
    this.activeSuggestionIndex = -1;
    this.productSearchResults = this.productService.getProducts().filter(p => 
      p.name.toLowerCase().includes(this.newItem.productName.toLowerCase())
    ).slice(0, 7);
  }

  selectProduct(product: Product): void {
    this.newItem.product = product; 
    this.newItem.productName = product.name;
    this.newItem.price = product.price; 
    this.newItem.stock = product.stock;
    this.newItem.quantity = 1; 
    this.hideProductResults();
  }

  hideProductResults(): void { 
    setTimeout(() => { 
      this.showProductSearchResults = false; 
      this.activeSuggestionIndex = -1; 
    }, 200); 
  }

  addProductToCart(): void {
    const isProductSelected = !!this.newItem.product;
    const isManualEntry = !isProductSelected && this.newItem.productName.trim() !== '' && this.newItem.price >= 0;
    if (!isProductSelected && !isManualEntry) { 
      alert('Please select a product or manually type a name and price.'); 
      return; 
    }
    if (this.newItem.quantity <= 0) { alert('Quantity must be greater than zero.'); return; }
    
    let cartItem: BillItem;
    if (isProductSelected) {
      cartItem = { 
        productId: this.newItem.product!.id, 
        productName: this.newItem.product!.name, 
        quantity: this.newItem.quantity, 
        price: this.newItem.price, 
        total: this.newItem.quantity * this.newItem.price, 
        discountType: 'FIXED', 
        discountValue: 0 
      };
    } else {
      cartItem = { 
        productName: this.newItem.productName.trim(), 
        quantity: this.newItem.quantity, 
        price: this.newItem.price, 
        total: this.newItem.quantity * this.newItem.price, 
        discountType: 'FIXED', 
        discountValue: 0 
      };
    }
    this.cart.push(cartItem); 
    this.calculateAllTotals(); 
    this.resetNewItem();
    setTimeout(() => this.productNameInputRef?.nativeElement.focus(), 0);
  }

  resetNewItem(): void {
    this.newItem = { productName: '', quantity: 1, price: 0, stock: '-', product: undefined };
    this.productSearchResults = []; this.showProductSearchResults = false; this.activeSuggestionIndex = -1;
  }

  removeFromCart(index: number): void { this.cart.splice(index, 1); this.calculateAllTotals(); }

  updateItemAndRecalculate(item: BillItem): void {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    item.total = price * quantity;
    this.calculateAllTotals();
  }
  
  calculateTotalItemDiscount(): number {
    return this.cart.reduce((sum: number, item: BillItem) => {
      if (item.discountValue && item.discountValue > 0) {
        const itemBaseTotal = (item.price || 0) * (item.quantity || 0);
        if (item.discountType === 'PERCENT') {
          return sum + (itemBaseTotal * (item.discountValue / 100));
        }
        return sum + item.discountValue;
      }
      return sum;
    }, 0);
  }
  
  calculateBaseSubtotal(): number {
    return this.cart.reduce((sum: number, item: BillItem) => sum + (item.price * item.quantity), 0);
  }

  calculateNetSubtotal(): number {
    return parseFloat((this.baseSubtotal - this.totalItemDiscount).toFixed(2));
  }
  
  calculateOtherChargesTotal(): number { 
    return (Number(this.packingCharge) || 0) + (Number(this.handlingCharge) || 0) + (Number(this.deliveryCharge) || 0); 
  }
  
  calculateTaxFromInput(): number { return Number(this.taxAmountInput) || 0; }
  
  calculateGrossTotal(): number {
    const netSubtotal = this.calculateNetSubtotal();
    const billLevelDiscount = Math.min(netSubtotal, (Number(this.discount) || 0));
    const tax = this.calculateTaxFromInput();
    const otherCharges = this.calculateOtherChargesTotal();
    return parseFloat(Math.max(0, (netSubtotal - billLevelDiscount) + tax + otherCharges).toFixed(2));
  }
  
  calculateAllTotals(): void {   
    this.baseSubtotal = this.calculateBaseSubtotal();
    this.totalItemDiscount = this.calculateTotalItemDiscount();
    this.saveDraft();
  }

  canSaveDocument(): boolean {
    if (this.cart.length === 0 || !this.customerName.trim()) { return false; }
    if (this.documentMode === DocumentType.BILL && this.paymentType === PaymentType.CREDIT) {
      return !!(this.selectedCustomer || (this.customerPhone.trim() && this.customerAddress.trim()));
    }
    return true;
  }

  async saveDocument(): Promise<void> {
    if (!this.canSaveDocument()) {
      alert("Please fill all required fields and add items.");
      return;
    }

    let customerIdToUse: string | undefined = this.selectedCustomer?.id;

    if (!customerIdToUse && this.documentMode === DocumentType.BILL && this.paymentType === PaymentType.CREDIT) {
      try {
        const newCustomer = await this.customerService.addCustomer({
          name: this.customerName.trim(),
          phone: this.customerPhone.trim(),
          address: this.customerAddress.trim()
        });
        customerIdToUse = newCustomer.id;
      } catch (error: any) {
        alert(`Error creating customer: ${error.message}`);
        return;
      }
    }

    const netSubtotal = this.calculateNetSubtotal();
    const billGrossTotal = this.calculateGrossTotal();

    const docData: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'billNo'> = {
      documentType: this.documentMode,
      quotationStatus: this.documentMode === DocumentType.QUOTATION ? QuotationStatus.DRAFT : undefined,
      customerId: customerIdToUse,
      customerName: this.customerName.trim(),
      customerPhone: this.customerPhone.trim() || undefined,
      customerEmail: this.selectedCustomer?.email || undefined,
      customerAddress: this.selectedCustomer?.address || undefined,
      customerGSTIN: this.selectedCustomer?.gstin || undefined,
      items: this.cart.map(item => ({ ...item })),
      subtotal: netSubtotal,
      totalItemDiscount: this.totalItemDiscount,
      discount: (Number(this.discount) || 0),
      packingCharge: (Number(this.packingCharge) || 0),
      handlingCharge: (Number(this.handlingCharge) || 0),
      deliveryCharge: (Number(this.deliveryCharge) || 0),
      tax: (Number(this.taxAmountInput) || 0),
      total: billGrossTotal,
      paymentType: this.paymentType,
      amountPaid: 0, 
      remark: this.remark.trim() || undefined,
      transportName: this.transportName.trim() || undefined,
    };

    try {
      if (this.editMode && this.editingBillId && this.originalBillForEdit) {
        if (this.paymentType === PaymentType.CASH) {
          docData.amountPaid = billGrossTotal;
        } else {
          docData.amountPaid = this.originalBillForEdit.paymentType === PaymentType.CASH ? 0 : this.originalBillForEdit.amountPaid;
        }
        
        const stockAdjustments = this.billingService.calculateStockAdjustments(this.originalBillForEdit.items, this.cart);
        for (const adj of stockAdjustments) {
          await this.productService.updateStock(adj.productId, adj.quantityChange);
        }
        
        if (this.originalBillForEdit.customerId) {
          const totalDifference = this.originalBillForEdit.total - docData.total;
          if (Math.abs(totalDifference) > 0.005) {
            await this.customerService.updateCustomerCreditBalance(this.originalBillForEdit.customerId, totalDifference);
          }
        }

        await this.billingService.updateBill(this.editingBillId, docData as Partial<Bill>);
        alert(`Bill updated successfully.`);
        this.router.navigate(['/bills']);

      } else if (this.documentMode === DocumentType.BILL) {
        if (this.paymentType === PaymentType.CASH) {
          docData.amountPaid = billGrossTotal;
        }
        
        const newBill = await this.billingService.createDocument(docData);
        
        if (this.paymentType === PaymentType.CREDIT && this.applyCreditToBill && this.selectedCustomer && this.selectedCustomer.creditBalance > 0) {
          const creditToApply = Math.min(newBill.total, this.selectedCustomer.creditBalance);
          if (creditToApply > 0) {
            await this.paymentService.applyCreditToBill(newBill.id, creditToApply);
          }
        }

        if (this.originalQuoteIdToDelete) {
          await this.billingService.deleteBill(this.originalQuoteIdToDelete);
        }

        this.billingStateService.clearBillingState();
        // Await the fetch to resolve the Promise
        this.generatedBill = await this.billingService.getBillById(newBill.id) || null;
        this.showBillConfirmation = true;

      } else { 
        const newQuotation = await this.billingService.createDocument(docData);
        alert(`Quotation #${newQuotation.billNo} saved successfully!`);
        this.resetBill();
        this.router.navigate(['/bills']);
      }
    } catch (error: any) {
      alert(`Error processing document: ${error.message}`);
      console.error(error);
    }
  }

  printBill(): void { window.print(); }
  closeBillConfirmation(): void { this.showBillConfirmation = false; this.resetBill(); }
  startNewBill(): void { this.resetBill(); }

  resetBill(): void {
    this.billingStateService.clearBillingState();
    this.documentMode = DocumentType.BILL; 
    this.editMode = false; 
    this.editingBillId = null;
    this.pageTitle = 'Create New Bill'; 
    this.originalBillForEdit = null; 
    this.cart = [];
    this.discount = 0; 
    this.taxAmountInput = 0; 
    this.packingCharge = 0; 
    this.handlingCharge = 0;
    this.deliveryCharge = 0; 
    this.selectedCustomer = null; 
    this.customerName = '';
    this.customerPhone = ''; 
    this.customerAddress = ''; 
    this.remark = '';
    this.transportName = ''; 
    this.paymentType = PaymentType.CASH; 
    this.applyCreditToBill = true;
    this.resetNewItem();
    this.calculateAllTotals();
  }
}