import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Supplier } from '../../models/supplier.model';
import { Product } from '../../models/product.model';
import { PurchaseInvoice, PurchaseItem } from '../../models/purchase.model';
import { SupplierService } from '../../services/supplier.service';
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { SupplierPaymentService } from '../../services/supplier-payment.service';

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './purchase-form.component.html',
  styleUrls: ['./purchase-form.component.css']
})
export class PurchaseFormComponent implements OnInit {
  // --- Component State ---
  editMode = false;
  currentPurchaseId: string | null = null;
  pageTitle = 'Record New Purchase';
  originalPurchaseForEdit: PurchaseInvoice | null = null;
  isLoading = false;

  // --- Form Properties ---
  selectedSupplier: Supplier | null = null;
  supplierInvoiceNo: string = '';
  purchaseDate: string = '';
  remark: string = '';

  // --- Search & Selection ---
  supplierSearchTerm: string = '';
  supplierSearchResults: Supplier[] = [];
  showSupplierSearchResults = false;
  private supplierSearchTimeout: any;
  productSearchTerm: string = '';
  productSearchResults: Product[] = [];
  
  // --- Item Entry ---
  purchaseQuantity: number = 1;
  purchasePrice: number = 0;
  purchaseItems: PurchaseItem[] = [];

  // --- Summary & Calculation ---
  subtotal = 0; taxAmount = 0; otherCharges = 0; totalAmount = 0; amountPaid = 0;

  // --- Modals State ---
  showSellingPriceModal = false;
  pendingNewProduct: { name: string, quantity: number, purchasePrice: number } | null = null;
  newProductSellingPrice = 0;
  showDeleteConfirmation = false;

  private supplierService = inject(SupplierService);
  private productService = inject(ProductService);
  private purchaseService = inject(PurchaseService);
  private supplierPaymentService = inject(SupplierPaymentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    // REFINED: Subscribing to paramMap is more robust than snapshot
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editMode = true;
        this.currentPurchaseId = id;
        this.pageTitle = 'Edit Purchase Invoice';
        this.loadPurchaseForEditing(id);
      } else {
        this.editMode = false;
        this.currentPurchaseId = null;
        this.pageTitle = 'Record New Purchase';
        this.purchaseDate = new Date().toISOString().split('T')[0];
      }
    });
  }

  loadPurchaseForEditing(id: string): void {
    this.isLoading = true;
    const purchase = this.purchaseService.getPurchaseById(id);
    if (purchase) {
      this.originalPurchaseForEdit = JSON.parse(JSON.stringify(purchase));
      const supplier = this.supplierService.getSupplierById(purchase.supplierId);
      if (supplier) { this.selectSupplier(supplier); }
      this.supplierInvoiceNo = purchase.supplierInvoiceNo;
      this.purchaseDate = new Date(purchase.purchaseDate).toISOString().split('T')[0];
      this.remark = purchase.remark || '';
      this.purchaseItems = purchase.items.map(item => ({...item}));
      this.taxAmount = purchase.taxAmount || 0;
      this.otherCharges = purchase.otherCharges || 0;
      this.amountPaid = purchase.amountPaid;
      this.calculateTotals();
    } else {
      alert('Purchase invoice not found!');
      this.router.navigate(['/purchases']);
    }
    this.isLoading = false;
  }

  // --- Supplier Logic (Unchanged) ---
  onSupplierSearch(): void {
    if (this.supplierSearchTimeout) clearTimeout(this.supplierSearchTimeout);
    this.selectedSupplier = null;
    if (!this.supplierSearchTerm.trim()) { this.supplierSearchResults = []; this.showSupplierSearchResults = false; return; }
    this.showSupplierSearchResults = true;
    this.supplierSearchTimeout = setTimeout(() => {
      this.supplierSearchResults = this.supplierService.getSuppliers().filter(s => 
        s.name.toLowerCase().includes(this.supplierSearchTerm.toLowerCase())
      );
    }, 300);
  }
  selectSupplier(supplier: Supplier): void { this.selectedSupplier = supplier; this.supplierSearchTerm = supplier.name; this.showSupplierSearchResults = false; }
  hideSupplierResults(): void { setTimeout(() => this.showSupplierSearchResults = false, 200); }

  // --- REFINED Product Logic ---
  onProductSearch(): void {
    if (!this.productSearchTerm.trim()) { this.productSearchResults = []; return; }
    this.productSearchResults = this.productService.getProducts().filter(p => p.name.toLowerCase().includes(this.productSearchTerm.toLowerCase())).slice(0, 5);
  }

  selectProduct(product: Product): void {
    this.productSearchTerm = product.name;
    this.purchasePrice = product.purchasePrice || 0;
    this.purchaseQuantity = 1;
    this.productSearchResults = [];
  }

  addItemToPurchase(): void {
    const productName = this.productSearchTerm.trim();
    if (!productName || this.purchaseQuantity <= 0 || this.purchasePrice < 0) { alert('Please enter a product name, valid quantity, and price.'); return; }
    
    const existingProduct = this.productService.getProductByName(productName);

    if (existingProduct) {
      // Logic for adding a known product
      const existingItemInCart = this.purchaseItems.find(item => item.productId === existingProduct.id);
      if (existingItemInCart) { alert(`${existingProduct.name} is already in the list.`); return; }
      
      this.purchaseItems.push({
        productId: existingProduct.id, productName: existingProduct.name,
        quantity: this.purchaseQuantity, purchasePrice: this.purchasePrice,
        total: this.purchaseQuantity * this.purchasePrice
      });
      this.clearProductSelection();
      this.calculateTotals();
    } else {
      // Logic for a new product: open the modal
      this.pendingNewProduct = { name: productName, quantity: this.purchaseQuantity, purchasePrice: this.purchasePrice };
      this.newProductSellingPrice = this.purchasePrice; // Default selling price
      this.showSellingPriceModal = true;
    }
  }

  confirmNewProductSellingPrice(): void {
    if (!this.pendingNewProduct || this.newProductSellingPrice < 0) { alert('Please enter a valid selling price.'); return; }
    this.purchaseItems.push({
      productName: this.pendingNewProduct.name,
      quantity: this.pendingNewProduct.quantity,
      purchasePrice: this.pendingNewProduct.purchasePrice,
      total: this.pendingNewProduct.quantity * this.pendingNewProduct.purchasePrice,
      isNew: true,
      sellingPrice: this.newProductSellingPrice
    });
    this.calculateTotals();
    this.clearProductSelection();
    this.cancelNewProduct();
  }

  cancelNewProduct(): void {
    this.showSellingPriceModal = false;
    this.pendingNewProduct = null;
    this.newProductSellingPrice = 0;
  }

  clearProductSelection(): void {
    this.productSearchTerm = ''; this.purchaseQuantity = 1; this.purchasePrice = 0;
  }
  
  removeItem(index: number): void { this.purchaseItems.splice(index, 1); this.calculateTotals(); }
  calculateTotals(): void { this.subtotal = this.purchaseItems.reduce((sum, item) => sum + item.total, 0); this.totalAmount = this.subtotal + (Number(this.taxAmount) || 0) + (Number(this.otherCharges) || 0); }

  // --- REFINED Save & Delete Logic ---
  savePurchase(): void {
    if (!this.supplierSearchTerm.trim()) { alert('Please select or enter a supplier name.'); return; }
    if (!this.supplierInvoiceNo.trim()) { alert("Please enter the supplier's invoice number."); return; }
    if (this.purchaseItems.length === 0) { alert('Please add at least one item to the purchase.'); return; }
    
    let supplierToUse = this.selectedSupplier;
    if (!supplierToUse) {
      const supplierName = this.supplierSearchTerm.trim();
      const existing = this.supplierService.getSuppliers().find(s => s.name.toLowerCase() === supplierName.toLowerCase());
      if (existing) { supplierToUse = existing; } 
      else {
        try { supplierToUse = this.supplierService.addSupplier({ name: supplierName }); } 
        catch (error) { return; } // Service will alert on failure
      }
    }
    
    this.calculateTotals();
    
    if (this.editMode && this.currentPurchaseId) {
      const updatedData = {
        supplierId: supplierToUse.id, supplierInvoiceNo: this.supplierInvoiceNo, purchaseDate: new Date(this.purchaseDate),
        items: this.purchaseItems, subtotal: this.subtotal, taxAmount: this.taxAmount || undefined, otherCharges: this.otherCharges || undefined,
        totalAmount: this.totalAmount, amountPaid: this.amountPaid, remark: this.remark || undefined
      };
      const result = this.purchaseService.updatePurchaseInvoice(this.currentPurchaseId, updatedData);
      if(result) { alert('Purchase invoice updated successfully!'); this.router.navigate(['/purchases']); }
      else { alert('Failed to update purchase invoice.'); }
    } else {
      const newPurchaseInvoice = this.purchaseService.createPurchaseInvoice({
        supplierId: supplierToUse.id, supplierInvoiceNo: this.supplierInvoiceNo, purchaseDate: new Date(this.purchaseDate),
        items: this.purchaseItems, subtotal: this.subtotal, taxAmount: this.taxAmount || undefined, otherCharges: this.otherCharges || undefined,
        totalAmount: this.totalAmount, amountPaid: this.amountPaid || 0, remark: this.remark || undefined
      });
      if (newPurchaseInvoice.amountPaid > 0) { this.supplierPaymentService.recordPayment({ supplierId: newPurchaseInvoice.supplierId, purchaseInvoiceId: newPurchaseInvoice.id, amount: newPurchaseInvoice.amountPaid, paymentDate: newPurchaseInvoice.purchaseDate, paymentMethod: 'UPFRONT', notes: `Initial payment for purchase #${newPurchaseInvoice.supplierInvoiceNo}` }); }
      alert('Purchase recorded successfully!');
      this.router.navigate(['/purchases']);
    }
  }

  requestDeletePurchase(): void {
    if (!this.editMode || !this.originalPurchaseForEdit) return;
    this.showDeleteConfirmation = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirmation = false;
  }

  confirmDelete(): void {
    if (!this.currentPurchaseId) return;
    const success = this.purchaseService.deletePurchaseInvoice(this.currentPurchaseId);
    if (success) {
      alert('Purchase invoice has been deleted successfully.');
      this.router.navigate(['/purchases']);
    } else {
      alert('Failed to delete the purchase invoice.');
    }
    this.showDeleteConfirmation = false;
  }
}