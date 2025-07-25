export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  creditBalance: number;
  createdAt: Date;
  updatedAt: Date;
}