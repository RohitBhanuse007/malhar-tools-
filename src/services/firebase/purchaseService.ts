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
import { Purchase, Product } from '../../types';
import { recordStockMovement } from './stockMovementService';

const PURCHASES_COLLECTION = `shops/${SHOP_ID}/purchases`;
const PRODUCTS_COLLECTION = `shops/${SHOP_ID}/products`;
const LOCAL_STORAGE_KEY = 'malhar_tools_purchases';
const PRODUCTS_LOCAL_KEY = 'malhar_tools_products';

import { INVOICE_PURCHASES } from '../../data/invoiceProducts';

function getLocalPurchases(): Purchase[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      saveLocalPurchases(INVOICE_PURCHASES);
      return INVOICE_PURCHASES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveLocalPurchases(INVOICE_PURCHASES);
      return INVOICE_PURCHASES;
    }
    return parsed;
  } catch {
    return INVOICE_PURCHASES;
  }
}

function saveLocalPurchases(items: Purchase[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

export async function createPurchase(
  purchaseData: Omit<Purchase, 'id' | 'createdAt'>
): Promise<string> {
  const quantity = Number(purchaseData.quantity);
  const price = Number(purchaseData.purchasePrice);
  const totalAmount = quantity * price;
  const firestore = db;

  if (isFirebaseConfigured() && firestore) {
    let newPurchaseId = '';

    await runTransaction(firestore, async (transaction) => {
      const productRef = doc(firestore, PRODUCTS_COLLECTION, purchaseData.productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) {
        throw new Error('Product not found.');
      }

      const product = productDoc.data() as Product;
      const prevStock = Number(product.currentStock) || 0;
      const newStock = prevStock + quantity;

      // 1. Create Purchase document
      const purchaseRef = doc(collection(firestore, PURCHASES_COLLECTION));
      newPurchaseId = purchaseRef.id;

      transaction.set(purchaseRef, {
        ...purchaseData,
        quantity,
        purchasePrice: price,
        totalAmount,
        createdAt: serverTimestamp(),
      });

      // 2. Atomically increase stock
      transaction.update(productRef, {
        currentStock: newStock,
        updatedAt: serverTimestamp(),
      });

      // 3. Record stock movement
      const movementRef = doc(collection(firestore, `shops/${SHOP_ID}/stockMovements`));
      transaction.set(movementRef, {
        productId: purchaseData.productId,
        productName: purchaseData.productName,
        type: 'PURCHASE',
        quantityChange: quantity,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: newPurchaseId,
        reason: `Purchase from ${purchaseData.supplierName}`,
        date: purchaseData.date,
        createdAt: serverTimestamp(),
      });
    });

    return newPurchaseId;
  }

  // Local persistent transaction fallback
  const rawProducts = localStorage.getItem(PRODUCTS_LOCAL_KEY);
  const products: Product[] = rawProducts ? JSON.parse(rawProducts) : [];
  const productIndex = products.findIndex(p => p.id === purchaseData.productId);

  if (productIndex === -1) {
    throw new Error('Product not found.');
  }

  const prevStock = Number(products[productIndex].currentStock) || 0;
  const newStock = prevStock + quantity;

  products[productIndex].currentStock = newStock;
  products[productIndex].updatedAt = new Date().toISOString();
  localStorage.setItem(PRODUCTS_LOCAL_KEY, JSON.stringify(products));

  const purchases = getLocalPurchases();
  const newPurchase: Purchase = {
    id: 'pur_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    ...purchaseData,
    quantity,
    purchasePrice: price,
    totalAmount,
    createdAt: new Date().toISOString(),
  };

  purchases.unshift(newPurchase);
  saveLocalPurchases(purchases);

  // Record stock movement
  await recordStockMovement({
    productId: purchaseData.productId,
    productName: purchaseData.productName,
    type: 'PURCHASE',
    quantityChange: quantity,
    previousStock: prevStock,
    newStock: newStock,
    referenceId: newPurchase.id,
    reason: `Purchase from ${purchaseData.supplierName}`,
    date: purchaseData.date,
  });

  return newPurchase.id;
}

export async function getPurchases(): Promise<Purchase[]> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const q = query(collection(firestore, PURCHASES_COLLECTION), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
    } catch {
      const snapshot = await getDocs(collection(firestore, PURCHASES_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
    }
  }

  return getLocalPurchases();
}

export function subscribeToPurchases(callback: (purchases: Purchase[]) => void): () => void {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const q = collection(firestore, PURCHASES_COLLECTION);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
      callback(items);
    });
    return unsubscribe;
  }

  let lastRaw = '';
  const poll = () => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    if (raw !== lastRaw) {
      lastRaw = raw;
      callback(getLocalPurchases());
    }
  };
  poll();
  const interval = setInterval(poll, 1500);
  return () => clearInterval(interval);
}
