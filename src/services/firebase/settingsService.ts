import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, SHOP_ID, isFirebaseConfigured } from './config';
import { ShopSettings, FontSettings } from '../../types';

const SETTINGS_DOC_PATH = `shops/${SHOP_ID}/settings/general`;
const LOCAL_SETTINGS_KEY = 'malhar_tools_settings';

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  fontFamily: 'Inter',
  fontSize: 'md',
  fontWeight: 'medium',
  fontColor: '#0f172a',
};

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: 'Malhar Tools',
  shopNameMr: 'मल्हार टूल्स',
  address: 'Shop No. 4, Main Hardware Market, Station Road, Sangli, Maharashtra',
  contactNumber: '+91 98765 43210',
  email: 'bhanusedarshan@gmail.com',
  logoUrl: '/logo.png',
  defaultLanguage: 'en',
  defaultLowStockThreshold: 5,
  customUnits: ['Piece', 'Box', 'Kg', 'Meter', 'Set', 'Pair', 'Roll', 'Packet', 'Litre'],
  customCategories: [
    'Hand Tools',
    'Power Tools',
    'Fasteners & Screws',
    'Plumbing & Pipes',
    'Electricals',
    'Paints & Adhesives',
    'Safety Equipment',
    'Hardware Fittings',
    'General Materials'
  ],
  // GST & Invoicing Defaults
  gstin: '27AABCM1234F1Z5',
  state: 'Maharashtra',
  stateCode: '27',
  tradeName: 'Malhar Tools Hardware & Spares',
  gstScheme: 'regular',
  defaultGstRate: 18,
  bankName: 'State Bank of India',
  bankAccountNumber: '389012345678',
  bankIfsc: 'SBIN0001234',
  bankBranch: 'Main Market Branch, Sangli',
  invoicePrefix: 'MT/26-27/',
  invoiceTerms: '1. Goods once sold will not be taken back without original invoice. 2. Warranty/guarantee as per manufacturer terms. 3. Subject to Sangli jurisdiction.',
  // Font & Appearance Defaults
  fontSettings: DEFAULT_FONT_SETTINGS,
};

function getLocalSettings(): ShopSettings {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SHOP_SETTINGS,
        ...parsed,
        logoUrl: parsed.logoUrl || '/logo.png',
        fontSettings: {
          ...DEFAULT_FONT_SETTINGS,
          ...(parsed.fontSettings || {}),
        },
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SHOP_SETTINGS;
}

function saveLocalSettings(settings: ShopSettings): void {
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

export async function getShopSettings(): Promise<ShopSettings> {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const docRef = doc(firestore, SETTINGS_DOC_PATH);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...DEFAULT_SHOP_SETTINGS, ...snap.data() } as ShopSettings;
      }
    } catch (error) {
      console.warn('Failed to load shop settings from Firestore, using fallback:', error);
    }
  }

  return getLocalSettings();
}

export async function updateShopSettings(settings: Partial<ShopSettings>): Promise<void> {
  const current = await getShopSettings();
  const updated: ShopSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const docRef = doc(firestore, SETTINGS_DOC_PATH);
      await setDoc(docRef, {
        ...updated,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving settings to Firestore:', error);
      throw error;
    }
  }

  saveLocalSettings(updated);
}

export function subscribeToShopSettings(callback: (settings: ShopSettings) => void): () => void {
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    const docRef = doc(firestore, SETTINGS_DOC_PATH);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...DEFAULT_SHOP_SETTINGS, ...snapshot.data() } as ShopSettings);
      } else {
        callback(DEFAULT_SHOP_SETTINGS);
      }
    });
    return unsubscribe;
  }

  let lastRaw = '';
  const poll = () => {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY) || '';
    if (raw !== lastRaw) {
      lastRaw = raw;
      callback(getLocalSettings());
    }
  };
  poll();
  const interval = setInterval(poll, 2500);
  return () => clearInterval(interval);
}
