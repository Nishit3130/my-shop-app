// src/app/models/external-entry.model.ts

export enum EntryType {
  DEBIT = 'DEBIT',   // They owe you more (or you owe them less)
  CREDIT = 'CREDIT'  // You owe them more (or they owe you less)
}

export interface ExternalLedgerEntry {
  id: string;
  accountId: string; // Links to the ExternalAccount
  date: Date;
  description: string;
  type: EntryType;
  amount: number;
  
  createdAt: Date;
}