import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { StorageService } from './storage.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly STORAGE_KEY = 'products';
  private storageService = inject(StorageService);

  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$: Observable<Product[]> = this.productsSubject.asObservable();

  constructor() {
    this.productsSubject.next(this.storageService.getData(this.STORAGE_KEY) || []);
  }

  private saveDataAndNotify(products: Product[]): void {
    this.storageService.saveData(this.STORAGE_KEY, products);
    this.productsSubject.next([...products]);
  }

  getProducts(): Product[] {
    return this.productsSubject.getValue();
  }

  getProductById(id: string): Product | undefined {
    return this.getProducts().find(product => product.id === id);
  }

  getProductByName(name: string): Product | undefined {
    if (!name) return undefined;
    const lowerCaseName = name.trim().toLowerCase();
    return this.getProducts().find(p => p.name.toLowerCase() === lowerCaseName);
  }

  addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const currentProducts = this.getProducts();
    const newProduct: Product = {
      id: this.storageService.generateId(),
      name: productData.name,
      price: productData.price,
      purchasePrice: productData.purchasePrice,
      stock: productData.stock,
      category: productData.category,
      description: productData.description,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.saveDataAndNotify([...currentProducts, newProduct]);
    return newProduct;
  }

  updateProduct(id: string, productUpdateData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Product | null {
    const currentProducts = this.getProducts();
    const index = currentProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      currentProducts[index] = { ...currentProducts[index], ...productUpdateData, updatedAt: new Date() };
      this.saveDataAndNotify([...currentProducts]);
      return currentProducts[index];
    }
    return null;
  }

  deleteProduct(id: string): boolean {
    const currentProducts = this.getProducts();
    const updatedProducts = currentProducts.filter(p => p.id !== id);
    if (updatedProducts.length !== currentProducts.length) {
      this.saveDataAndNotify(updatedProducts);
      return true;
    }
    return false;
  }

  updateStock(productId: string, quantityChange: number): boolean {
    const product = this.getProductById(productId);
    if (!product) {
      console.error(`Product with ID ${productId} not found for stock update.`);
      return false;
    }
    const newStock = product.stock + quantityChange;
    this.updateProduct(productId, { stock: newStock });
    return true;
  }
}