// src/app/models/supplier.model.ts

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string; // Goods and Services Tax Identification Number

  // The total amount you owe this supplier.
  // This will be calculated and updated by the services.
  balanceDue: number; 

  createdAt: Date;
  updatedAt: Date;
}