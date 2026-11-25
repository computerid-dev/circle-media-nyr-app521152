import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { SECRETS } from './secrets.js';

const app =
  getApps()[0] ||
  initializeApp({
    credential: cert({
      projectId: SECRETS.FIREBASE_PROJECT_ID,
      clientEmail: SECRETS.FIREBASE_CLIENT_EMAIL,
      privateKey: (SECRETS.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
