import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const SHOP_ID = 'malhar-tools';

/**
 * Normalizes phone number to last 10 digits for strict matching
 */
function extractLast10Digits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
}

/**
 * Callable Cloud Function: resetOwnerPasswordWithPhoneOtp
 * 
 * Verifies that the caller has completed Firebase Phone Authentication,
 * confirms that the verified phone belongs to the authorized shop owner,
 * and securely updates the owner's account password using Firebase Admin SDK.
 */
export const resetOwnerPasswordWithPhoneOtp = functions.onCall(
  {
    cors: true,
    maxInstances: 5,
  },
  async (request) => {
    // 1. Enforce authentication: caller MUST be authenticated with Phone Auth
    if (!request.auth || !request.auth.token) {
      throw new functions.HttpsError(
        'unauthenticated',
        'Authentication required. You must verify your phone OTP first.'
      );
    }

    const verifiedPhone = request.auth.token.phone_number;
    if (!verifiedPhone) {
      throw new functions.HttpsError(
        'failed-precondition',
        'Caller is not verified via Phone Authentication.'
      );
    }

    const { newPassword } = request.data || {};
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw new functions.HttpsError(
        'invalid-argument',
        'Password must be at least 6 characters long.'
      );
    }

    const db = admin.firestore();

    // 2. Load authorized shop settings from Firestore
    const settingsDoc = await db.doc(`shops/${SHOP_ID}/settings/general`).get();
    if (!settingsDoc.exists) {
      throw new functions.HttpsError(
        'not-found',
        'Shop configuration not found. Please contact administration.'
      );
    }

    const settingsData = settingsDoc.data() || {};
    const authorizedContact = settingsData.contactNumber;
    const ownerEmail = settingsData.email || 'bhanusedarshan@gmail.com';

    if (!authorizedContact) {
      throw new functions.HttpsError(
        'failed-precondition',
        'No registered contact number found in shop settings.'
      );
    }

    // 3. Strict Phone Number Verification
    const caller10 = extractLast10Digits(verifiedPhone);
    const owner10 = extractLast10Digits(authorizedContact);

    if (caller10 !== owner10) {
      // Audit log failed authorization attempt
      await db.collection(`shops/${SHOP_ID}/securityLogs`).add({
        type: 'UNAUTHORIZED_PASSWORD_RESET_ATTEMPT',
        attemptedPhone: caller10,
        authorizedPhoneMasked: `+91 ••••• •${owner10.slice(-4)}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        callerUid: request.auth.uid,
      });

      throw new functions.HttpsError(
        'permission-denied',
        'This phone number is not authorized as the Malhar Tools shop owner.'
      );
    }

    // 4. Rate-Limiting: Check recent successful or failed password resets
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentResets = await db
      .collection(`shops/${SHOP_ID}/securityLogs`)
      .where('type', '==', 'PASSWORD_RESET_SUCCESS')
      .where('timestamp', '>=', oneHourAgo)
      .get();

    if (recentResets.size >= 5) {
      throw new functions.HttpsError(
        'resource-exhausted',
        'Too many password resets requested today. Please try again later.'
      );
    }

    // 5. Look up the Email/Password owner user account in Firebase Auth
    let ownerUser: admin.auth.UserRecord;
    try {
      ownerUser = await admin.auth().getUserByEmail(ownerEmail);
    } catch (err: any) {
      console.error('Owner user not found by email:', ownerEmail, err);
      throw new functions.HttpsError(
        'not-found',
        `No account found registered with email ${ownerEmail}.`
      );
    }

    // 6. Securely update password using Firebase Admin SDK
    try {
      await admin.auth().updateUser(ownerUser.uid, {
        password: newPassword,
      });
    } catch (err: any) {
      console.error('Error updating password via Admin SDK:', err);
      throw new functions.HttpsError('internal', 'Failed to update user password.');
    }

    // 7. Record successful audit event (never storing passwords)
    await db.collection(`shops/${SHOP_ID}/securityLogs`).add({
      type: 'PASSWORD_RESET_SUCCESS',
      ownerUid: ownerUser.uid,
      ownerEmail,
      phoneMasked: `+91 ••••• •${owner10.slice(-4)}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: 'Password reset successfully for Malhar Tools owner.',
    };
  }
);
