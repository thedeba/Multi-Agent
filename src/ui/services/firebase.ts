import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(config).every(Boolean);

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseServices() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add the Web app settings to .env.local and rebuild.');
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config);

  if (!cachedAuth) {
    try {
      cachedAuth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
    } catch {
      cachedAuth = getAuth(app);
    }
  }

  if (!cachedDb) {
    cachedDb = getFirestore(app, 'privacy-browser');
  }

  return {
    auth: cachedAuth,
    db: cachedDb,
  };
}

