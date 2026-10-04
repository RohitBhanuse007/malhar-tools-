import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';

// Custom user interface for app state
export interface ShopUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// Local mock user for when Firebase is not yet hooked up to .env
const MOCK_STORAGE_KEY = 'malhar_tools_mock_user';

export async function loginOwner(email: string, password: string): Promise<ShopUser> {
  if (isFirebaseConfigured() && auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || 'Shop Owner',
      };
    } catch (error: any) {
      console.error('Firebase login error:', error);
      throw error;
    }
  }

  // Graceful fallback for local evaluation before .env is populated
  if (email && password.length >= 6) {
    const mockUser: ShopUser = {
      uid: 'owner-local-admin',
      email: email,
      displayName: 'Malhar Tools Owner',
    };
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockUser));
    return mockUser;
  } else {
    throw new Error('Invalid credentials. Password must be at least 6 characters.');
  }
}

export async function logoutOwner(): Promise<void> {
  if (isFirebaseConfigured() && auth) {
    await signOut(auth);
  }
  localStorage.removeItem(MOCK_STORAGE_KEY);
}

export function subscribeToAuth(callback: (user: ShopUser | null) => void): () => void {
  if (isFirebaseConfigured() && auth) {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Shop Owner',
        });
      } else {
        callback(null);
      }
    });
    return unsubscribe;
  }

  // Fallback to local session check
  const saved = localStorage.getItem(MOCK_STORAGE_KEY);
  if (saved) {
    try {
      callback(JSON.parse(saved));
    } catch {
      callback(null);
    }
  } else {
    callback(null);
  }

  return () => {};
}

export async function resetOwnerPassword(email: string): Promise<void> {
  if (isFirebaseConfigured() && auth) {
    await sendPasswordResetEmail(auth, email);
  } else {
    console.log('Password reset link simulated for:', email);
  }
}
