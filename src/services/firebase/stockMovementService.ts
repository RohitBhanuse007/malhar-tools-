import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, SHOP_ID, isFirebaseConfigured } from './config';
import { StockMovement } from '../../types';

const MOVEMENTS_COLLECTION = `shops/${SHOP_ID}/stockMovements`;
const LOCAL_STORAGE_KEY = 'malhar_tools_stock_movements';

function getLocalMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMovements(items: StockMovement[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

export async function recordStockMovement(
  movement: Omit<StockMovement, 'id' | 'createdAt'>
): Promise<string> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const docRef = await addDoc(collection(firestore, MOVEMENTS_COLLECTION), {
      ...movement,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  const items = getLocalMovements();
  const newItem: StockMovement = {
    id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    ...movement,
    createdAt: new Date().toISOString(),
  };
  items.unshift(newItem);
  saveLocalMovements(items);
  return newItem.id;
}

export async function getStockMovements(): Promise<StockMovement[]> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const q = query(
        collection(firestore, MOVEMENTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement));
    } catch {
      const snapshot = await getDocs(collection(firestore, MOVEMENTS_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement));
    }
  }

  return getLocalMovements();
}

export function subscribeToStockMovements(callback: (movements: StockMovement[]) => void): () => void {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const q = collection(firestore, MOVEMENTS_COLLECTION);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement));
      callback(items);
    });
    return unsubscribe;
  }

  let lastRaw = '';
  const poll = () => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    if (raw !== lastRaw) {
      lastRaw = raw;
      callback(getLocalMovements());
    }
  };
  poll();
  const interval = setInterval(poll, 1500);
  return () => clearInterval(interval);
}
