export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateProduct(data: {
  name: string;
  category: string;
  unit: string;
  sellingPrice: number | string;
  purchasePrice: number | string;
  currentStock: number | string;
  lowStockThreshold: number | string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Product name is required.';
  }

  const sellingPrice = Number(data.sellingPrice);
  if (isNaN(sellingPrice) || sellingPrice < 0) {
    errors.sellingPrice = 'Selling price must be 0 or greater.';
  }

  const purchasePrice = Number(data.purchasePrice);
  if (isNaN(purchasePrice) || purchasePrice < 0) {
    errors.purchasePrice = 'Purchase price must be 0 or greater.';
  }

  const currentStock = Number(data.currentStock);
  if (isNaN(currentStock) || currentStock < 0) {
    errors.currentStock = 'Current stock cannot be negative.';
  }

  const lowStockThreshold = Number(data.lowStockThreshold);
  if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
    errors.lowStockThreshold = 'Alert threshold cannot be negative.';
  }

  if (!data.unit || !data.unit.trim()) {
    errors.unit = 'Unit is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePurchase(data: {
  productId: string;
  quantity: number | string;
  purchasePrice: number | string;
  supplierName: string;
  date: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.productId) {
    errors.productId = 'Product is required.';
  }

  const quantity = Number(data.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    errors.quantity = 'Quantity must be at least 1.';
  }

  const price = Number(data.purchasePrice);
  if (isNaN(price) || price < 0) {
    errors.purchasePrice = 'Purchase price must be 0 or greater.';
  }

  if (!data.supplierName || !data.supplierName.trim()) {
    errors.supplierName = 'Supplier name is required.';
  }

  if (!data.date) {
    errors.date = 'Date is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSale(data: {
  productId: string;
  quantity: number | string;
  sellingPrice: number | string;
  availableStock: number;
  date: string;
  paymentMode: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.productId) {
    errors.productId = 'Product is required.';
  }

  const quantity = Number(data.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    errors.quantity = 'Quantity must be at least 1.';
  } else if (quantity > data.availableStock) {
    errors.quantity = `Insufficient stock available (${data.availableStock} in stock).`;
  }

  const price = Number(data.sellingPrice);
  if (isNaN(price) || price < 0) {
    errors.sellingPrice = 'Selling price must be 0 or greater.';
  }

  if (!data.date) {
    errors.date = 'Date is required.';
  }

  if (!data.paymentMode) {
    errors.paymentMode = 'Payment mode is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCustomerPayment(data: {
  customerId: string;
  amount: number | string;
  remainingBalance: number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.customerId) {
    errors.customerId = 'Customer is required.';
  }

  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than 0.';
  } else if (amount > data.remainingBalance) {
    errors.amount = `Payment cannot exceed remaining balance (₹${data.remainingBalance}).`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
