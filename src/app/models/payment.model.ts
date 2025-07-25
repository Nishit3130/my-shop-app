export interface Payment {
  id: string;
  billId: string;
  customerId?: string;
  amount: number;
  paymentDate: Date;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
}