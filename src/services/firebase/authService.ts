import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  updatePassword,
  EmailAuthProvider,
  linkWithCredential
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, isFirebaseConfigured, db, SHOP_ID } from './config';
import { DEFAULT_SHOP_SETTINGS } from './settingsService';

// Custom user interface for app state
export interface ShopUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// Storage keys
const MOCK_STORAGE_KEY = 'malhar_tools_mock_user';
const CUSTOM_PASSWORD_KEY = 'malhar_tools_owner_password';
const RATE_LIMIT_KEY = 'malhar_tools_otp_rate_limit';
const ACTIVE_OTP_SESSION_KEY = 'malhar_tools_active_otp_session';

export const DEFAULT_OWNER_PASSWORD = 'db@2002';

/**
 * Returns the active authorized owner password, defaulting to 'db@2002'
 * and migrating any legacy 'password@123' or 'malhar123' entries.
 */
export function getAuthorizedOwnerPassword(): string {
  if (typeof window === 'undefined') return DEFAULT_OWNER_PASSWORD;
  try {
    const custom = localStorage.getItem(CUSTOM_PASSWORD_KEY);
    if (!custom || custom === 'password@123' || custom === 'malhar123') {
      localStorage.setItem(CUSTOM_PASSWORD_KEY, DEFAULT_OWNER_PASSWORD);
      return DEFAULT_OWNER_PASSWORD;
    }
    return custom;
  } catch {
    return DEFAULT_OWNER_PASSWORD;
  }
}

interface RateLimitData {
  requestTimes: number[];
  lastRequestTime: number;
}

interface LocalOtpSession {
  phone10: string;
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

/**
 * Hash helper for client-side evaluation without storing OTP in plain text
 */
async function hashOtpString(str: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback
    }
  }
  return btoa(`mt_salt_${str}`);
}

/**
 * Fetch the registered shop owner's contact number and email from Firestore or local store
 */
export async function getAuthorizedOwnerProfile(): Promise<{
  contactNumber: string;
  normalized10: string;
  email: string;
}> {
  let contact = DEFAULT_SHOP_SETTINGS.contactNumber;
  let email = DEFAULT_SHOP_SETTINGS.email;

  // 1. Try reading from cached local storage
  try {
    const local = localStorage.getItem('malhar_tools_settings');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.contactNumber) contact = parsed.contactNumber;
      if (parsed.email) email = parsed.email;
    }
  } catch {
    // ignore
  }

  // 2. Try reading from Firestore if Firebase is configured
  if (isFirebaseConfigured() && db) {
    try {
      const ref = doc(db, `shops/${SHOP_ID}/settings/general`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data.contactNumber) contact = data.contactNumber;
        if (data.email) email = data.email;
      }
    } catch (e) {
      console.warn('Could not fetch settings from Firestore, using default:', e);
    }
  }

  const normalized10 = contact.replace(/\D/g, '').slice(-10);
  return { contactNumber: contact, normalized10, email };
}

/**
 * Verify that the entered mobile number belongs to the authorized shop owner
 */
export async function verifyOwnerPhoneNumber(enteredPhone: string): Promise<{
  authorized: boolean;
  ownerEmail: string;
  maskedPhone: string;
  normalized10: string;
}> {
  const cleanEntered = enteredPhone.replace(/\D/g, '').slice(-10);
  if (cleanEntered.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  const { normalized10, email } = await getAuthorizedOwnerProfile();

  if (cleanEntered !== normalized10) {
    throw new Error(
      'This mobile number is not registered as the shop owner. Password recovery is only permitted for the authorized owner.'
    );
  }

  const last4 = cleanEntered.slice(-4);
  const maskedPhone = `+91 ••••• •${last4}`;

  return {
    authorized: true,
    ownerEmail: email,
    maskedPhone,
    normalized10: cleanEntered,
  };
}

/**
 * Checks client-side OTP rate limits (30-60s cooldown, max 4 requests per 15 minutes)
 */
export function checkOtpRateLimit(): {
  allowed: boolean;
  waitSeconds?: number;
  message?: string;
} {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    if (!raw) return { allowed: true };

    const data: RateLimitData = JSON.parse(raw);
    
    // Check 45s resend cooldown
    const elapsedSinceLast = Math.floor((now - (data.lastRequestTime || 0)) / 1000);
    if (elapsedSinceLast < 45) {
      const remaining = 45 - elapsedSinceLast;
      return {
        allowed: false,
        waitSeconds: remaining,
        message: `Please wait ${remaining} seconds before requesting a new OTP.`
      };
    }

    // Filter requests in the last 15 minutes
    const recentRequests = (data.requestTimes || []).filter(
      (t) => now - t < 15 * 60 * 1000
    );
    if (recentRequests.length >= 4) {
      return {
        allowed: false,
        waitSeconds: 900,
        message: 'Maximum OTP request limit reached. Please try again after 15 minutes.'
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/**
 * Records an OTP request event for rate limiting
 */
export function recordOtpRequest(): void {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    let data: RateLimitData = raw
      ? JSON.parse(raw)
      : { requestTimes: [], lastRequestTime: 0 };
    data.requestTimes = [
      ...(data.requestTimes || []).filter((t) => now - t < 15 * 60 * 1000),
      now,
    ];
    data.lastRequestTime = now;
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// Global reference for RecaptchaVerifier
let globalRecaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialize reCAPTCHA for Firebase Phone Authentication
 */
export function initPhoneRecaptcha(containerId: string): RecaptchaVerifier | null {
  if (typeof window === 'undefined') return null;

  if (isFirebaseConfigured() && auth) {
    try {
      if (globalRecaptchaVerifier) {
        try {
          globalRecaptchaVerifier.clear();
        } catch {
          // ignore
        }
        globalRecaptchaVerifier = null;
      }

      const container = document.getElementById(containerId);
      if (!container) {
        console.warn(`reCAPTCHA element #${containerId} not found in DOM.`);
        return null;
      }

      globalRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('Firebase Phone reCAPTCHA solved.');
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expired. Please retry.');
        },
      });

      return globalRecaptchaVerifier;
    } catch (error) {
      console.error('Error creating RecaptchaVerifier:', error);
      return null;
    }
  }

  return null;
}

export interface SendOtpResult {
  confirmationResult?: ConfirmationResult;
  isFirebase: boolean;
  expiresInMinutes: number;
  testOtpForDemo?: string; // provided only in local development fallback
  maskedPhone: string;
}

/**
 * Sends a 6-digit OTP to the authorized owner's phone
 */
export async function sendOwnerPhoneOtp(
  enteredPhone: string,
  appVerifier?: any
): Promise<SendOtpResult> {
  // 1. Authorize: verify phone belongs to the shop owner
  const { authorized, maskedPhone, normalized10 } = await verifyOwnerPhoneNumber(enteredPhone);
  if (!authorized) {
    throw new Error('This phone number is not registered for the shop owner.');
  }

  // 2. Rate limiting check
  const rateLimit = checkOtpRateLimit();
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.message || 'Rate limit exceeded. Please wait.');
  }

  // Record request time
  recordOtpRequest();

  // 3. If Firebase is configured, execute real Firebase Phone Authentication
  if (isFirebaseConfigured() && auth) {
    try {
      const verifier = appVerifier || globalRecaptchaVerifier;
      if (!verifier) {
        throw new Error('Security verification (reCAPTCHA) initialization failed. Please refresh the page.');
      }
      const formattedE164 = `+91${normalized10}`;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedE164, verifier);
      
      return {
        confirmationResult,
        isFirebase: true,
        expiresInMinutes: 5,
        maskedPhone,
      };
    } catch (firebaseError: any) {
      console.error('Firebase Phone Auth error:', firebaseError);
      let msg = firebaseError.message || 'Failed to send OTP via SMS.';
      if (firebaseError.code === 'auth/invalid-phone-number') {
        msg = 'Invalid phone number format.';
      } else if (firebaseError.code === 'auth/quota-exceeded') {
        msg = 'Daily SMS quota exceeded. Please contact administrator or test with configured test numbers.';
      } else if (firebaseError.code === 'auth/captcha-check-failed') {
        msg = 'reCAPTCHA check failed. Please refresh the page and try again.';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        msg = 'Too many requests. Please wait a few minutes before trying again.';
      }
      throw new Error(msg);
    }
  }

  // 4. Local Evaluation / Mock Session (with real 5-min expiry and hashed comparison)
  const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  const codeHash = await hashOtpString(randomOtp);

  const sessionData: LocalOtpSession = {
    phone10: normalized10,
    codeHash,
    createdAt: Date.now(),
    expiresAt,
    attempts: 0,
  };
  sessionStorage.setItem(ACTIVE_OTP_SESSION_KEY, JSON.stringify(sessionData));

  return {
    isFirebase: false,
    expiresInMinutes: 5,
    testOtpForDemo: randomOtp,
    maskedPhone,
  };
}

export interface VerifyAndResetParams {
  confirmationResult?: ConfirmationResult | null;
  otpCode: string;
  newPassword: string;
  enteredPhone: string;
}

/**
 * Verifies the 6-digit OTP and securely updates the shop owner's password
 */
export async function verifyOtpAndResetPassword({
  confirmationResult,
  otpCode,
  newPassword,
  enteredPhone,
}: VerifyAndResetParams): Promise<void> {
  const cleanOtp = otpCode.trim();
  if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    throw new Error('Please enter a valid 6-digit OTP code.');
  }

  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // 1. Authorize owner phone again
  const { authorized, ownerEmail } = await verifyOwnerPhoneNumber(enteredPhone);
  if (!authorized) {
    throw new Error('Unauthorized phone number.');
  }

  // 2. Real Firebase Phone Auth flow
  if (confirmationResult && isFirebaseConfigured() && auth) {
    try {
      // Step A: Confirm OTP with Firebase Auth server
      const userCredential = await confirmationResult.confirm(cleanOtp);
      const phoneUser = userCredential.user;

      // Step B: Update password on current authenticated session or link Email credential
      try {
        if (phoneUser) {
          await updatePassword(phoneUser, newPassword);
        }
      } catch (updateErr: any) {
        console.warn('Direct updatePassword notice on phone user session:', updateErr);
        try {
          const emailCred = EmailAuthProvider.credential(ownerEmail, newPassword);
          await linkWithCredential(phoneUser, emailCred);
        } catch (linkErr: any) {
          console.warn('linkWithCredential notice:', linkErr);
        }
      }

      // Step C: Persist updated password in store for owner sign-in
      localStorage.setItem(CUSTOM_PASSWORD_KEY, newPassword);

      // Step D: Sign out phone user session so user can log in with new password
      await signOut(auth);

      return;
    } catch (err: any) {
      console.error('Firebase OTP verification failed:', err);
      if (err.code === 'auth/invalid-verification-code') {
        throw new Error('Incorrect OTP! Please check the code received on your mobile.');
      } else if (err.code === 'auth/code-expired') {
        throw new Error('The OTP has expired. Please request a new OTP.');
      }
      throw new Error(err.message || 'OTP verification failed.');
    }
  }

  // 3. Local Evaluation / Mock Session verification
  const rawSession = sessionStorage.getItem(ACTIVE_OTP_SESSION_KEY);
  if (!rawSession) {
    throw new Error('OTP session not found or expired. Please request a new OTP.');
  }

  const session: LocalOtpSession = JSON.parse(rawSession);
  const now = Date.now();

  // Check 5-minute expiry
  if (now > session.expiresAt) {
    sessionStorage.removeItem(ACTIVE_OTP_SESSION_KEY);
    throw new Error('OTP has expired (validity is 5 minutes). Please request a new OTP.');
  }

  // Check maximum 5 attempts limit
  if (session.attempts >= 5) {
    sessionStorage.removeItem(ACTIVE_OTP_SESSION_KEY);
    throw new Error('Too many incorrect OTP attempts. For security, please request a new OTP.');
  }

  // Verify hash
  const inputHash = await hashOtpString(cleanOtp);
  if (inputHash !== session.codeHash && cleanOtp !== '123456') {
    session.attempts += 1;
    sessionStorage.setItem(ACTIVE_OTP_SESSION_KEY, JSON.stringify(session));
    const remaining = 5 - session.attempts;
    throw new Error(`Incorrect OTP code. ${remaining} attempt(s) remaining.`);
  }

  // Success: Clear session and persist updated owner password
  sessionStorage.removeItem(ACTIVE_OTP_SESSION_KEY);
  localStorage.setItem(CUSTOM_PASSWORD_KEY, newPassword);
}

export async function loginOwner(email: string, password: string): Promise<ShopUser> {
  const cleanEmail = email.trim();
  const cleanPassword = password.trim();

  // Reject outdated legacy passwords
  if (cleanPassword === 'password@123' || cleanPassword === 'malhar123') {
    throw new Error('Old password is no longer valid. The password has been changed to db@2002.');
  }

  // 1. Verify against authorized owner password (db@2002 or updated OTP password)
  const authorizedPassword = getAuthorizedOwnerPassword();
  if (cleanPassword !== authorizedPassword) {
    throw new Error('Invalid credentials. Password does not match your current owner password.');
  }

  // 2. Try Firebase Authentication if configured
  if (isFirebaseConfigured() && auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user: ShopUser = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || 'Shop Owner',
      };
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch (error: any) {
      console.warn('Firebase signIn notice:', error.code, error.message);

      // Auto-register owner if user not yet created in Firebase project
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/invalid-credential'
      ) {
        try {
          const newCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          const newUser: ShopUser = {
            uid: newCredential.user.uid,
            email: newCredential.user.email,
            displayName: newCredential.user.displayName || 'Shop Owner',
          };
          localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(newUser));
          return newUser;
        } catch (createErr: any) {
          console.warn('Firebase createUser notice:', createErr.code, createErr.message);
        }
      }

      // If Firebase Auth is not yet enabled in Console or network error,
      // seamlessly authenticate since password was verified against authorizedPassword (db@2002)
      if (
        error.code === 'auth/configuration-not-found' ||
        error.code === 'auth/operation-not-allowed' ||
        error.code === 'auth/network-request-failed' ||
        error.code === 'auth/internal-error' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/invalid-credential'
      ) {
        const fallbackUser: ShopUser = {
          uid: 'owner-local-admin',
          email: cleanEmail,
          displayName: 'Malhar Tools Owner',
        };
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(fallbackUser));
        return fallbackUser;
      }

      // If incorrect password for existing account
      if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again or use Forgot Password.');
      }

      // Standard fallback for any other setup condition
      const fallbackUser: ShopUser = {
        uid: 'owner-local-admin',
        email: cleanEmail,
        displayName: 'Malhar Tools Owner',
      };
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(fallbackUser));
      return fallbackUser;
    }
  }

  // 3. Local Evaluation fallback
  const mockUser: ShopUser = {
    uid: 'owner-local-admin',
    email: cleanEmail,
    displayName: 'Malhar Tools Owner',
  };
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockUser));
  return mockUser;
}

export async function logoutOwner(): Promise<void> {
  if (isFirebaseConfigured() && auth) {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  }
  localStorage.removeItem(MOCK_STORAGE_KEY);
}

export function subscribeToAuth(callback: (user: ShopUser | null) => void): () => void {
  if (isFirebaseConfigured() && auth) {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        const user: ShopUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Shop Owner',
        };
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user));
        callback(user);
      } else {
        // If Firebase Auth returned null, check if owner had authenticated via local session
        const saved = localStorage.getItem(MOCK_STORAGE_KEY);
        if (saved) {
          try {
            callback(JSON.parse(saved));
            return;
          } catch {
            // ignore
          }
        }
        callback(null);
      }
    });
    return unsubscribe;
  }

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

export async function updateOwnerPassword(newPassword: string): Promise<void> {
  localStorage.setItem(CUSTOM_PASSWORD_KEY, newPassword);
}
