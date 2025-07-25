// src/app/components/product-management/product-management.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.css']
})
export class ProductManagementComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm: string = '';
  
  showProductForm: boolean = false;
  editMode: boolean = false;
  productForm: FormGroup;
  currentProductId: string | null = null;
  
  showDeleteConfirmation: boolean = false;
  productToDeleteId: string | null = null;
  
  private subscriptions = new Subscription();
  private productService = inject(ProductService);
  private fb = inject(FormBuilder);
  
  constructor() {
    this.productForm = this.fb.group({
      name: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      purchasePrice: [0, [Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      category: [''],
      description: ['']
    });
  }

  ngOnInit(): void {
    const productsSub = this.productService.products$.subscribe(products => {
      this.products = products.sort((a,b) => a.name.localeCompare(b.name));
      this.filterProducts();
    });
    this.subscriptions.add(productsSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  loadProducts(): void {
    // Obsolete method.
  }
  
  filterProducts(): void {
    if (!this.searchTerm.trim()) {
      this.filteredProducts = [...this.products];
      return;
    }
    
    const term = this.searchTerm.toLowerCase();
    this.filteredProducts = this.products.filter(product =>  
      product.name.toLowerCase().includes(term) ||
      (product.category && product.category.toLowerCase().includes(term))
    );
  }
  
  openProductForm(): void {
    this.editMode = false;
    this.currentProductId = null;
    this.productForm.reset({ price: 0, purchasePrice: 0, stock: 0 });
    this.showProductForm = true;
  }
  
  editProduct(product: Product): void {
    this.editMode = true;
    this.currentProductId = product.id;
    this.productForm.patchValue(product);
    this.showProductForm = true;
  }
  
  closeProductForm(): void {
    this.showProductForm = false;
  }
  
  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    
    const productData = this.productForm.value;
    
    if (this.editMode && this.currentProductId) {
      this.productService.updateProduct(this.currentProductId, productData);
    } else {
      this.productService.addProduct(productData);
    }
    
    this.closeProductForm();
  }
  
  // *** FIX IS HERE: Renamed 'requestDelete' to 'deleteProduct' to match the template call ***
  deleteProduct(id: string): void {
    this.productToDeleteId = id;
    this.showDeleteConfirmation = true;
  }
  
  cancelDelete(): void {
    this.productToDeleteId = null;
    this.showDeleteConfirmation = false;
  }
  
  confirmDelete(): void {
    if (this.productToDeleteId) {
      this.productService.deleteProduct(this.productToDeleteId);
    }
    this.cancelDelete();
  }
}