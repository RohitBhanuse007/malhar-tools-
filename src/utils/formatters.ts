import { StockStatus } from '../types';

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateVal: any, _locale: string = 'en'): string {
  if (!dateVal) return '-';
  try {
    let d: Date;
    if (typeof dateVal === 'string') {
      d = new Date(dateVal);
    } else if (dateVal.toDate && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else if (dateVal.seconds) {
      d = new Date(dateVal.seconds * 1000);
    } else {
      return String(dateVal);
    }

    if (isNaN(d.getTime())) return String(dateVal);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
}

export function formatDateTime(dateVal: any): string {
  if (!dateVal) return '-';
  try {
    let d: Date;
    if (typeof dateVal === 'string') {
      d = new Date(dateVal);
    } else if (dateVal.toDate && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else if (dateVal.seconds) {
      d = new Date(dateVal.seconds * 1000);
    } else {
      return String(dateVal);
    }

    if (isNaN(d.getTime())) return String(dateVal);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateVal);
  }
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function determineStockStatus(currentStock: number, threshold: number): StockStatus {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= threshold) return 'low_stock';
  return 'in_stock';
}
