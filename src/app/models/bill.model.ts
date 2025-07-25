export interface BillItem {
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
}

export enum PaymentType {
  CASH = 'CASH',
  CREDIT = 'CREDIT'
}

export enum DocumentType {
  BILL = 'BILL',
  QUOTATION = 'QUOTATION'
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  CONVERTED = 'CONVERTED'
}

export interface Bill {
  id: string;
  billNo: string;
  documentType: DocumentType;
  quotationStatus?: QuotationStatus;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGSTIN?: string;
  items: BillItem[];
  subtotal: number;
  // --- NEW PROPERTY ADDED HERE ---
  totalItemDiscount?: number; // Sum of all item-level discounts
  discount?: number;          // Bill-level discount
  packingCharge?: number;
  handlingCharge?: number;
  deliveryCharge?: number;
  tax?: number;
  total: number;
  paymentType: PaymentType;
  amountPaid: number;
  createdAt: Date;
  updatedAt: Date;
  remark?: string;
  transportName?: string;
}