/**
 * Firebase Admin SDK — server-side only.
 * Imported by Route Handlers to verify ID tokens and access Firestore
 * with elevated privileges (bypasses client security rules).
 *
 * Never import this in client components or pages.
 */
import * as admin from 'firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const adminApp  = getAdminApp();
export const adminAuth = admin.auth(adminApp);
export const adminDb   = admin.firestore(adminApp);

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token or throws if invalid.
 *
 * Usage in a Route Handler:
 *   const token = await verifyIdToken(request);
 *   const uid = token.uid;
 */
export async function verifyIdToken(request: Request): Promise<DecodedIdToken> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }
  const idToken = authHeader.slice(7);
  return adminAuth.verifyIdToken(idToken);
}
