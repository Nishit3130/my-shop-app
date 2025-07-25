export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Transaction {
  id: string;
  date: Date;
  description: string; // e.g., "Rent for May", "Electricity Bill", "Salary for John"
  amount: number;
  transactionType: TransactionType;
  category: string; // e.g., 'Rental Income', 'Utilities', 'Salaries'
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}