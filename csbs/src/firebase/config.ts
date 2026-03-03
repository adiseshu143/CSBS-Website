import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// ─── Firebase Configuration (from .env) ─────────────────
// All sensitive keys are stored in .env file
// Vite automatically prefixes VITE_ vars for client-side access
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Firebase Auth instance
export const auth = getAuth(app)

// Firestore instance with offline persistence & long-polling fallback
// - persistentLocalCache: caches data in IndexedDB for offline use
// - experimentalAutoDetectLongPolling: avoids QUIC protocol errors
//   by automatically falling back to HTTP long-polling when WebChannel fails
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalAutoDetectLongPolling: true,
})

// Firebase Storage — lazy loaded (only needed for uploads, not on initial page load)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _storage: any = null
export const getStorageLazy = async () => {
  if (!_storage) {
    const { getStorage } = await import('firebase/storage')
    _storage = getStorage(app)
  }
  return _storage
}

export default app
