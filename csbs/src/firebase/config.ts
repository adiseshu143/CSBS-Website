import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

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

// Firestore instance (for storing user profiles, events, registrations, etc.)
export const db = getFirestore(app)

// Firebase Storage instance (for event banners, etc.)
export const storage = getStorage(app)

export default app
