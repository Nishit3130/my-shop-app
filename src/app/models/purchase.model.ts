export interface PurchaseItem {
  productId?: string; 
  productName: string;
  quantity: number;
  purchasePrice: number;
  total: number;
  
  // Properties to handle automatic product creation during a purchase
  isNew?: boolean;
  sellingPrice?: number;
}

export enum PurchaseStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID'
}

export interface PurchaseInvoice {
  id: string; 
  supplierId: string;
  supplierInvoiceNo: string;
  purchaseDate: Date;
  
  items: PurchaseItem[];
  subtotal: number;
  taxAmount?: number;
  otherCharges?: number; 
  totalAmount: number;

  amountPaid: number;
  status: PurchaseStatus;
  
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}