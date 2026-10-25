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
  contactNumber: '+91 9270693111',
  secondaryContactNumber: '+91 9172978555',
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
  gstin: '27AMWPB3781F1ZR',
  state: 'Maharashtra',
  stateCode: '27',
  tradeName: 'Malhar Tools Hardware & Spares',
  gstScheme: 'regular',
  defaultGstRate: 18,
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  bankBranch: '',
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
      // Automatically migrate legacy demo contact or email
      if (
        !parsed.contactNumber ||
        parsed.contactNumber === '+91 98765 43210' ||
        parsed.contactNumber === '9876543210' ||
        parsed.contactNumber === '+91 8208219305' ||
        parsed.contactNumber === '8208219305'
      ) {
        parsed.contactNumber = '+91 9270693111';
      }
      if (
        !parsed.secondaryContactNumber ||
        parsed.secondaryContactNumber === '+91 8208219305' ||
        parsed.secondaryContactNumber === '8208219305'
      ) {
        parsed.secondaryContactNumber = '+91 9172978555';
      }
      if (parsed.email === 'owner@malhartools.com') {
        parsed.email = 'bhanusedarshan@gmail.com';
      }
      if (!parsed.gstin || parsed.gstin === '27AABCM1234F1Z5') {
        parsed.gstin = '27AMWPB3781F1ZR';
      }
      if (parsed.bankAccountNumber === '389012345678') {
        parsed.bankName = '';
        parsed.bankAccountNumber = '';
        parsed.bankIfsc = '';
        parsed.bankBranch = '';
      }
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
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('malhar_tools_settings_changed', { detail: settings }));
    }
  } catch (e) {
    console.warn('Could not save settings to localStorage:', e);
  }
}

export async function getShopSettings(): Promise<ShopSettings> {
  const local = getLocalSettings();
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const docRef = doc(firestore, SETTINGS_DOC_PATH);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remote = snap.data();
        return { ...DEFAULT_SHOP_SETTINGS, ...remote, ...local } as ShopSettings;
      }
    } catch (error) {
      console.warn('Failed to load shop settings from Firestore, using local fallback:', error);
    }
  }

  return local;
}

export async function updateShopSettings(settings: Partial<ShopSettings>): Promise<ShopSettings> {
  const current = getLocalSettings();
  const updated: ShopSettings = {
    ...DEFAULT_SHOP_SETTINGS,
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  // 1. ALWAYS persist to local storage first so shop owner never loses settings
  saveLocalSettings(updated);

  // 2. Synchronize to Firestore with error tolerance (e.g. offline or auth rules)
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const docRef = doc(firestore, SETTINGS_DOC_PATH);
      const cleanData: Record<string, any> = {};
      Object.entries(updated).forEach(([k, v]) => {
        if (v !== undefined) {
          cleanData[k] = v;
        }
      });
      cleanData.updatedAt = serverTimestamp();
      await setDoc(docRef, cleanData, { merge: true });
    } catch (error: any) {
      console.warn('Notice saving settings to Firestore (preserved locally):', error?.message || error);
    }
  }

  return updated;
}

export function subscribeToShopSettings(callback: (settings: ShopSettings) => void): () => void {
  // Emit local settings immediately
  callback(getLocalSettings());

  const handleCustomEvent = (e: any) => {
    if (e.detail) {
      callback(e.detail);
    } else {
      callback(getLocalSettings());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_SETTINGS_KEY) {
      callback(getLocalSettings());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('malhar_tools_settings_changed', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  let firestoreUnsub: (() => void) | null = null;
  const firestore = db;
  if (isFirebaseConfigured() && firestore) {
    try {
      const docRef = doc(firestore, SETTINGS_DOC_PATH);
      firestoreUnsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const remote = snapshot.data();
            const local = getLocalSettings();
            const merged = { ...DEFAULT_SHOP_SETTINGS, ...remote, ...local } as ShopSettings;
            callback(merged);
          }
        },
        (err) => {
          console.warn('Firestore settings listener notice:', err.message);
        }
      );
    } catch (e) {
      console.warn('Could not subscribe to Firestore settings:', e);
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('malhar_tools_settings_changed', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
    if (firestoreUnsub) {
      firestoreUnsub();
    }
  };
}
