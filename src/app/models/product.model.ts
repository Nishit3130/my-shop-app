// src/app/models/product.model.ts

export interface Product {
  id: string;
  name: string;
  price: number; // Selling price
  purchasePrice: number; // ** NEW FIELD ** - Cost price
  stock: number;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}