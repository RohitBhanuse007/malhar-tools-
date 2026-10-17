export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string; // Piece, Box, Kg, Meter, Set, Pair, etc.
  sellingPrice: number;
  purchasePrice: number;
  currentStock: number;
  lowStockThreshold: number;
  description?: string;
  hsnCode?: string;
  gstRate?: number; // 0, 5, 12, 18, 28
  isDeleted?: boolean;
  createdAt: any;
  updatedAt: any;
}

export type PaymentStatus = 'paid' | 'pending' | 'partial';

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number; // Unit price
  totalAmount: number;
  date: string; // ISO date YYYY-MM-DD
  supplierName: string;
  supplierContact?: string;
  paymentStatus: PaymentStatus;
  notes?: string;
  // GST Fields
  invoiceNumber?: string;
  supplierGstin?: string;
  supplierState?: string;
  supplierStateCode?: string;
  hsnCode?: string;
  gstRate?: number;
  isTaxInclusive?: boolean;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalGst?: number;
  isInterState?: boolean;
  isEligibleITC?: boolean; // Eligible for Input Tax Credit under GST rules
  createdAt: any;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number; // Unit price
  totalAmount: number;
  date: string; // ISO date YYYY-MM-DD
  paymentMode: PaymentMode;
  customerName?: string;
  customerId?: string; // If mapped to customer dues
  notes?: string;
  // GST Fields
  invoiceNumber?: string;
  customerGstin?: string;
  customerState?: string;
  customerStateCode?: string;
  customerAddress?: string;
  hsnCode?: string;
  gstRate?: number;
  isTaxInclusive?: boolean;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalGst?: number;
  isInterState?: boolean;
  discount?: number;
  createdAt: any;
}

export interface Customer {
  id: string;
  name: string;
  contactNumber: string;
  address?: string;
  gstin?: string;
  state?: string;
  stateCode?: string;
  totalPurchaseAmount: number;
  totalPaid: number;
  remainingBalance: number;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  reference?: string;
  notes?: string;
  createdAt: any;
}

export type MovementType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantityChange: number; // +ve for additions, -ve for sales
  previousStock: number;
  newStock: number;
  referenceId?: string; // Purchase ID or Sale ID
  reason?: string;
  date: string;
  createdAt: any;
}

export interface ShopSettings {
  shopName: string;
  shopNameMr?: string;
  address: string;
  contactNumber: string;
  email: string;
  logoUrl?: string;
  defaultLanguage: 'en' | 'mr';
  defaultLowStockThreshold: number;
  customUnits?: string[];
  customCategories?: string[];
  // GST & Invoicing Settings
  gstin?: string;
  state?: string;
  stateCode?: string;
  tradeName?: string;
  gstScheme?: 'regular' | 'composition';
  defaultGstRate?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  invoicePrefix?: string;
  invoiceTerms?: string;
  updatedAt?: any;
}

export interface DashboardStats {
  totalProducts: number;
  currentStockUnits: number;
  todaySalesAmount: number;
  todaySalesCount: number;
  todayPurchasesAmount: number;
  pendingCustomerPayments: number;
  lowStockCount: number;
  outOfStockCount: number;
}

// GST Module Types
export type GstRate = 0 | 5 | 12 | 18 | 28;

export type GstFilterPeriod =
  | 'today'
  | 'this_month'
  | 'prev_month'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'fy'
  | 'custom';

export interface GstTaxBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  grandTotal: number;
}

export interface GstSummaryData {
  totalSalesValue: number;
  totalTaxableSales: number;
  outwardCgst: number;
  outwardSgst: number;
  outwardIgst: number;
  totalOutputTax: number;
  totalPurchasesValue: number;
  totalTaxablePurchases: number;
  inwardCgst: number;
  inwardSgst: number;
  inwardIgst: number;
  totalInputTax: number;
  eligibleItc: number;
  ineligibleItc: number;
  netTaxPayable: number;
  rateWiseSummary: Record<number, {
    taxableSales: number;
    salesGst: number;
    taxablePurchases: number;
    purchasesGst: number;
  }>;
}
