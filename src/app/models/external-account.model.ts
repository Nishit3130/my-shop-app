

export interface ExternalAccount {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  
 
  balance: number; 
  
  createdAt: Date;
  updatedAt: Date;
}