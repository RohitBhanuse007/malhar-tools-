import { doc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db, SHOP_ID, isFirebaseConfigured } from './config';
import { INVOICE_PRODUCTS, INVOICE_PURCHASES } from '../../data/invoiceProducts';
import { DEFAULT_SHOP_SETTINGS } from './settingsService';
import { Product, Purchase, Customer } from '../../types';

export interface SyncProgress {
  step: string;
  total: number;
  completed: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  error?: string;
}

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust_walk_in',
    name: 'Counter / Walk-in Customer (रोख ग्राहक)',
    contactNumber: '+91 99999 99999',
    address: 'Sangli, Maharashtra',
    totalPurchaseAmount: 0,
    totalPaid: 0,
    remainingBalance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust_patil_auto',
    name: 'Patil Auto Works (पाटील ऑटो वर्क्स)',
    contactNumber: '+91 98220 12345',
    address: 'MIDC Kupwad, Sangli',
    gstin: '27ABCDE1234F1Z5',
    totalPurchaseAmount: 12500,
    totalPaid: 10000,
    remainingBalance: 2500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust_shree_fabricators',
    name: 'Shree Fabricators & Hardware (श्री फॅब्रिकेटर्स)',
    contactNumber: '+91 94230 67890',
    address: 'Station Road, Miraj',
    gstin: '27XYZAB5678C1Z2',
    totalPurchaseAmount: 28400,
    totalPaid: 28400,
    remainingBalance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export async function uploadAllCurrentDataToFirebase(
  onProgress?: (progress: SyncProgress) => void
): Promise<{
  productsCount: number;
  purchasesCount: number;
  customersCount: number;
  settingsUpdated: boolean;
}> {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase is not configured or offline. Please check your Firebase credentials.');
  }

  const firestore = db;

  // 1. Upload Shop Settings
  if (onProgress) {
    onProgress({
      step: 'Uploading Malhar Tools Shop Settings...',
      total: 1,
      completed: 0,
      status: 'syncing',
    });
  }

  // Read saved local settings or default
  let shopSettings = DEFAULT_SHOP_SETTINGS;
  try {
    const saved = localStorage.getItem('malhar_tools_settings');
    if (saved) {
      shopSettings = { ...DEFAULT_SHOP_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }

  const settingsDocRef = doc(firestore, `shops/${SHOP_ID}/settings/general`);
  await setDoc(settingsDocRef, {
    ...shopSettings,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  if (onProgress) {
    onProgress({
      step: 'Shop Settings uploaded.',
      total: 1,
      completed: 1,
      status: 'syncing',
    });
  }

  // 2. Upload Products
  // Gather from localStorage or fallback INVOICE_PRODUCTS
  let productsToUpload: Product[] = INVOICE_PRODUCTS;
  try {
    const rawProds = localStorage.getItem('malhar_tools_products');
    if (rawProds) {
      const parsed = JSON.parse(rawProds);
      if (Array.isArray(parsed) && parsed.length > 0) {
        productsToUpload = parsed;
      }
    }
  } catch {
    // fallback
  }

  if (onProgress) {
    onProgress({
      step: `Uploading ${productsToUpload.length} Products to Firestore...`,
      total: productsToUpload.length,
      completed: 0,
      status: 'syncing',
    });
  }

  // Firestore allows up to 500 operations per batch
  const BATCH_SIZE = 400;
  for (let i = 0; i < productsToUpload.length; i += BATCH_SIZE) {
    const chunk = productsToUpload.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(firestore);

    for (const prod of chunk) {
      const prodRef = doc(firestore, `shops/${SHOP_ID}/products/${prod.id}`);
      batch.set(prodRef, {
        ...prod,
        isDeleted: prod.isDeleted || false,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    await batch.commit();

    if (onProgress) {
      onProgress({
        step: `Uploaded ${Math.min(i + BATCH_SIZE, productsToUpload.length)} of ${productsToUpload.length} products...`,
        total: productsToUpload.length,
        completed: Math.min(i + BATCH_SIZE, productsToUpload.length),
        status: 'syncing',
      });
    }
  }

  // 3. Upload Purchases
  let purchasesToUpload: Purchase[] = INVOICE_PURCHASES;
  try {
    const rawPur = localStorage.getItem('malhar_tools_purchases');
    if (rawPur) {
      const parsed = JSON.parse(rawPur);
      if (Array.isArray(parsed) && parsed.length > 0) {
        purchasesToUpload = parsed;
      }
    }
  } catch {
    // fallback
  }

  if (onProgress) {
    onProgress({
      step: `Uploading ${purchasesToUpload.length} Purchases...`,
      total: purchasesToUpload.length,
      completed: 0,
      status: 'syncing',
    });
  }

  for (let i = 0; i < purchasesToUpload.length; i += BATCH_SIZE) {
    const chunk = purchasesToUpload.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(firestore);

    for (const pur of chunk) {
      const purRef = doc(firestore, `shops/${SHOP_ID}/purchases/${pur.id}`);
      batch.set(purRef, {
        ...pur,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    await batch.commit();
  }

  // 4. Upload Customers
  let customersToUpload: Customer[] = DEFAULT_CUSTOMERS;
  try {
    const rawCust = localStorage.getItem('malhar_tools_customers');
    if (rawCust) {
      const parsed = JSON.parse(rawCust);
      if (Array.isArray(parsed) && parsed.length > 0) {
        customersToUpload = parsed;
      }
    }
  } catch {
    // fallback
  }

  const custBatch = writeBatch(firestore);
  for (const cust of customersToUpload) {
    const custRef = doc(firestore, `shops/${SHOP_ID}/customers/${cust.id}`);
    custBatch.set(custRef, {
      ...cust,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
  await custBatch.commit();

  if (onProgress) {
    onProgress({
      step: 'All data successfully uploaded to Firebase Firestore!',
      total: productsToUpload.length,
      completed: productsToUpload.length,
      status: 'success',
    });
  }

  return {
    productsCount: productsToUpload.length,
    purchasesCount: purchasesToUpload.length,
    customersCount: customersToUpload.length,
    settingsUpdated: true,
  };
}
