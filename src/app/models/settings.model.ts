export interface AppSettings {
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string; // Or any other Tax ID
  currencySymbol: string; // e.g., '₹', '$', '€'
  
  // --- NEW PROPERTIES ---
  companyLogo?: string;   // Will store the logo as a Base64 string
  invoiceFooter?: string; // For custom footer text
}