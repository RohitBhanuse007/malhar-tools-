import {
  collection,
  doc,
  getDocs,
  runTransaction,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, SHOP_ID, isFirebaseConfigured } from './config';
import { Sale, Product, Customer } from '../../types';
import { recordStockMovement } from './stockMovementService';

const SALES_COLLECTION = `shops/${SHOP_ID}/sales`;
const PRODUCTS_COLLECTION = `shops/${SHOP_ID}/products`;
const CUSTOMERS_COLLECTION = `shops/${SHOP_ID}/customers`;
const PAYMENTS_COLLECTION = `shops/${SHOP_ID}/payments`;
const LOCAL_STORAGE_KEY = 'malhar_tools_sales';
const PRODUCTS_LOCAL_KEY = 'malhar_tools_products';
const CUSTOMERS_LOCAL_KEY = 'malhar_tools_customers';
const PAYMENTS_LOCAL_KEY = 'malhar_tools_customer_payments';

function getLocalSales(): Sale[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSales(items: Sale[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

export interface CreateSaleInput extends Omit<Sale, 'id' | 'createdAt'> {
  // If credit sale or partial payment:
  initialPaid?: number;
}

export async function createSale(saleData: CreateSaleInput): Promise<string> {
  const quantity = Number(saleData.quantity);
  const price = Number(saleData.sellingPrice);
  const totalAmount = quantity * price;
  const firestore = db;

  if (isFirebaseConfigured() && firestore) {
    let newSaleId = '';

    await runTransaction(firestore, async (transaction) => {
      // 1. Read product
      const productRef = doc(firestore, PRODUCTS_COLLECTION, saleData.productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) {
        throw new Error('Product not found.');
      }

      const product = productDoc.data() as Product;
      const prevStock = Number(product.currentStock) || 0;

      // STRICT VALIDATION: check stock availability
      if (prevStock < quantity) {
        throw new Error(`Insufficient stock available. Current stock: ${prevStock}`);
      }

      const newStock = prevStock - quantity;

      // 2. Create Sale document
      const saleRef = doc(collection(firestore, SALES_COLLECTION));
      newSaleId = saleRef.id;

      transaction.set(saleRef, {
        productId: saleData.productId,
        productName: saleData.productName,
        quantity,
        sellingPrice: price,
        totalAmount,
        date: saleData.date,
        paymentMode: saleData.paymentMode,
        customerName: saleData.customerName || '',
        customerId: saleData.customerId || '',
        notes: saleData.notes || '',
        createdAt: serverTimestamp(),
      });

      // 3. Atomically decrease stock
      transaction.update(productRef, {
        currentStock: newStock,
        updatedAt: serverTimestamp(),
      });

      // 4. Record stock movement
      const movementRef = doc(collection(firestore, `shops/${SHOP_ID}/stockMovements`));
      transaction.set(movementRef, {
        productId: saleData.productId,
        productName: saleData.productName,
        type: 'SALE',
        quantityChange: -quantity,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: newSaleId,
        reason: `Sale to ${saleData.customerName || 'Cash counter'}`,
        date: saleData.date,
        createdAt: serverTimestamp(),
      });

      // 5. If linked to customer credit
      if (saleData.customerId) {
        const customerRef = doc(firestore, CUSTOMERS_COLLECTION, saleData.customerId);
        const customerDoc = await transaction.get(customerRef);

        if (customerDoc.exists()) {
          const cust = customerDoc.data() as Customer;
          const initialPaid = Number(saleData.initialPaid) || 0;
          const addedDue = totalAmount - initialPaid;

          const updatedPurchases = (Number(cust.totalPurchaseAmount) || 0) + totalAmount;
          const updatedPaid = (Number(cust.totalPaid) || 0) + initialPaid;
          const updatedRemaining = (Number(cust.remainingBalance) || 0) + addedDue;

          transaction.update(customerRef, {
            totalPurchaseAmount: updatedPurchases,
            totalPaid: updatedPaid,
            remainingBalance: updatedRemaining,
            updatedAt: serverTimestamp(),
          });

          if (initialPaid > 0) {
            const payRef = doc(collection(firestore, PAYMENTS_COLLECTION));
            transaction.set(payRef, {
              customerId: saleData.customerId,
              customerName: cust.name,
              amount: initialPaid,
              paymentDate: saleData.date,
              paymentMode: saleData.paymentMode,
              reference: `Initial down payment on sale #${newSaleId.slice(-4)}`,
              createdAt: serverTimestamp(),
            });
          }
        }
      }
    });

    return newSaleId;
  }

  // Local persistent transaction fallback
  const rawProducts = localStorage.getItem(PRODUCTS_LOCAL_KEY);
  const products: Product[] = rawProducts ? JSON.parse(rawProducts) : [];
  const productIndex = products.findIndex(p => p.id === saleData.productId);

  if (productIndex === -1) {
    throw new Error('Product not found.');
  }

  const prevStock = Number(products[productIndex].currentStock) || 0;
  if (prevStock < quantity) {
    throw new Error(`Insufficient stock available. Current stock: ${prevStock}`);
  }

  const newStock = prevStock - quantity;
  products[productIndex].currentStock = newStock;
  products[productIndex].updatedAt = new Date().toISOString();
  localStorage.setItem(PRODUCTS_LOCAL_KEY, JSON.stringify(products));

  const sales = getLocalSales();
  const newSale: Sale = {
    id: 'sale_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    productId: saleData.productId,
    productName: saleData.productName,
    quantity,
    sellingPrice: price,
    totalAmount,
    date: saleData.date,
    paymentMode: saleData.paymentMode,
    customerName: saleData.customerName || '',
    customerId: saleData.customerId || '',
    notes: saleData.notes || '',
    createdAt: new Date().toISOString(),
  };

  sales.unshift(newSale);
  saveLocalSales(sales);

  // Record stock movement
  await recordStockMovement({
    productId: saleData.productId,
    productName: saleData.productName,
    type: 'SALE',
    quantityChange: -quantity,
    previousStock: prevStock,
    newStock: newStock,
    referenceId: newSale.id,
    reason: `Sale to ${saleData.customerName || 'Cash counter'}`,
    date: saleData.date,
  });

  // Handle customer credit if linked
  if (saleData.customerId) {
    const rawCust = localStorage.getItem(CUSTOMERS_LOCAL_KEY);
    const customers: Customer[] = rawCust ? JSON.parse(rawCust) : [];
    const custIndex = customers.findIndex(c => c.id === saleData.customerId);
    if (custIndex !== -1) {
      const initialPaid = Number(saleData.initialPaid) || 0;
      const addedDue = totalAmount - initialPaid;
      customers[custIndex].totalPurchaseAmount += totalAmount;
      customers[custIndex].totalPaid += initialPaid;
      customers[custIndex].remainingBalance += addedDue;
      customers[custIndex].updatedAt = new Date().toISOString();
      localStorage.setItem(CUSTOMERS_LOCAL_KEY, JSON.stringify(customers));

      if (initialPaid > 0) {
        const rawPayments = localStorage.getItem(PAYMENTS_LOCAL_KEY);
        const payments = rawPayments ? JSON.parse(rawPayments) : [];
        payments.unshift({
          id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          customerId: saleData.customerId,
          customerName: customers[custIndex].name,
          amount: initialPaid,
          paymentDate: saleData.date,
          paymentMode: saleData.paymentMode,
          reference: `Initial down payment on sale #${newSale.id.slice(-4)}`,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(PAYMENTS_LOCAL_KEY, JSON.stringify(payments));
      }
    }
  }

  return newSale.id;
}

export async function getSales(): Promise<Sale[]> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const q = query(collection(firestore, SALES_COLLECTION), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
    } catch {
      const snapshot = await getDocs(collection(firestore, SALES_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
    }
  }

  return getLocalSales();
}

export function subscribeToSales(callback: (sales: Sale[]) => void): () => void {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const q = collection(firestore, SALES_COLLECTION);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      callback(items);
    });
    return unsubscribe;
  }

  let lastRaw = '';
  const poll = () => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    if (raw !== lastRaw) {
      lastRaw = raw;
      callback(getLocalSales());
    }
  };
  poll();
  const interval = setInterval(poll, 1500);
  return () => clearInterval(interval);
}
