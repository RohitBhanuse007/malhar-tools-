import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, SHOP_ID, isFirebaseConfigured } from './config';
import { Product } from '../../types';

const PRODUCTS_COLLECTION = `shops/${SHOP_ID}/products`;
const LOCAL_STORAGE_KEY = 'malhar_tools_products';

// Helper for local fallback
function getLocalProducts(): Product[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProducts(products: Product[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
}

export async function getProducts(): Promise<Product[]> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const q = query(
        collection(firestore, PRODUCTS_COLLECTION),
        where('isDeleted', '!=', true),
        orderBy('isDeleted'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (error) {
      console.warn('Firestore query failed, fetching all products:', error);
      const snapshot = await getDocs(collection(firestore, PRODUCTS_COLLECTION));
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Product))
        .filter(p => !p.isDeleted);
    }
  }

  return getLocalProducts().filter(p => !p.isDeleted);
}

export async function getProductById(id: string): Promise<Product | null> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const docRef = doc(firestore, PRODUCTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Product;
    }
    return null;
  }

  const products = getLocalProducts();
  return products.find(p => p.id === id) || null;
}

export async function createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const docRef = await addDoc(collection(firestore, PRODUCTS_COLLECTION), {
      ...productData,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  const products = getLocalProducts();
  const newProduct: Product = {
    id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    ...productData,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  products.push(newProduct);
  saveLocalProducts(products);
  return newProduct.id;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const docRef = doc(firestore, PRODUCTS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const products = getLocalProducts();
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = {
      ...products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveLocalProducts(products);
  }
}

// Soft delete ensures historical sales/purchases referencing this product don't break
export async function deleteProduct(id: string): Promise<void> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const docRef = doc(firestore, PRODUCTS_COLLECTION, id);
    await updateDoc(docRef, {
      isDeleted: true,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const products = getLocalProducts();
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index].isDeleted = true;
    products[index].updatedAt = new Date().toISOString();
    saveLocalProducts(products);
  }
}

export function subscribeToProducts(callback: (products: Product[]) => void): () => void {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const q = collection(firestore, PRODUCTS_COLLECTION);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Product))
        .filter(p => !p.isDeleted);
      callback(items);
    }, (error) => {
      console.error('Realtime products listener error:', error);
    });
    return unsubscribe;
  }

  // Local storage listener
  const poll = () => {
    callback(getLocalProducts().filter(p => !p.isDeleted));
  };
  poll();
  const interval = setInterval(poll, 1500);
  return () => clearInterval(interval);
}
