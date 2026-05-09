import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$: Observable<Product[]> = this.productsSubject.asObservable();

  constructor() {
    this.refreshProducts();
  }

  async refreshProducts(): Promise<void> {
    try {
      const products = await window.electronAPI.getProducts();
      this.productsSubject.next(products || []);
    } catch (error) {
      console.error('Failed to fetch products from SQLite:', error);
    }
  }

  getProducts(): Product[] {
    return this.productsSubject.getValue();
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return await window.electronAPI.getProduct(id);
  }

  async addProduct(productData: any): Promise<Product> {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const dbPayload = {
      ...newProduct,
      createdAt: newProduct.createdAt.toISOString(),
      updatedAt: newProduct.updatedAt.toISOString()
    };

    await window.electronAPI.addProduct(dbPayload);
    await this.refreshProducts();
    return newProduct;
  }

  async updateProduct(id: string, productUpdateData: Partial<Product>): Promise<void> {
    const current = await this.getProductById(id);
    if (current) {
      const updated = { ...current, ...productUpdateData, updatedAt: new Date().toISOString() };
      await window.electronAPI.updateProduct(id, updated);
      await this.refreshProducts();
    }
  }

  async getProductByName(name: string): Promise<Product | undefined> {
    if (!name) return undefined;
    const lowerCaseName = name.trim().toLowerCase();
    const products = await window.electronAPI.getProducts();
    return products.find((p: any) => p.name.toLowerCase() === lowerCaseName);
  }

  async deleteProduct(id: string): Promise<void> {
    await window.electronAPI.deleteProduct(id);
    await this.refreshProducts();
  }

  async updateStock(productId: string, quantityChange: number): Promise<void> {
    const product = await this.getProductById(productId);
    if (product) {
      const newStock = product.stock + quantityChange;
      await this.updateProduct(productId, { stock: newStock });
    }
  }
}