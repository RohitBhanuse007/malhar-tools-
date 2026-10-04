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
  createdAt: any;
}

export interface Customer {
  id: string;
  name: string;
  contactNumber: string;
  address?: string;
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
