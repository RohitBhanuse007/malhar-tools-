import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Configuration keys from environment variables or stored settings
const getFirebaseConfig = () => {
  const env = import.meta.env;
  
  // Also support localStorage custom config if configured via UI
  const localConfigStr = typeof window !== 'undefined' ? localStorage.getItem('malhar_tools_firebase_config') : null;
  if (localConfigStr) {
    try {
      const parsed = JSON.parse(localConfigStr);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch {
      // ignore JSON parse error
    }
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
  };
};

export const firebaseConfig = getFirebaseConfig();

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'your_api_key_here'
  );
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

export { app, auth, db };

// Primary Shop document ID for Malhar Tools
export const SHOP_ID = 'malhar-tools';
