/**
 * Frontend Project Reset Utilities
 * 
 * Safe utilities to clear frontend state, cache, and storage
 * This complements the backend reset operations
 */

import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

/**
 * Storage keys used throughout the application
 */
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  ADMIN_SESSION: 'admin_session',
  REGISTRATION_CACHE: 'registration_cache',
  FORM_DRAFT: 'form_draft',
  EVENT_CACHE: 'event_cache',
  NOTIFICATION_STATE: 'notification_state',
  LAST_LOGIN: 'last_login',
  THEME_PREFERENCE: 'theme_preference',
  LANGUAGE: 'language',
};

/**
 * Interface for reset progress tracking
 */
interface ResetProgress {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  authState: boolean;
  firebaseCache: boolean;
  contextState: boolean;
}

/**
 * Clear all localStorage data
 */
export const clearLocalStorage = (): boolean => {
  try {
    // Clear all application-specific storage
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    // Also clear any other stored data
    localStorage.clear();

    console.log('✅ localStorage cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear localStorage:', error);
    return false;
  }
};

/**
 * Clear all sessionStorage data
 */
export const clearSessionStorage = (): boolean => {
  try {
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear sessionStorage:', error);
    return false;
  }
};

/**
 * Clear IndexedDB (used by Firebase SDK)
 */
export const clearIndexedDB = async (): Promise<boolean> => {
  try {
    // Firebase uses IndexedDB for persistence
    const databases = await window.indexedDB.databases?.();

    if (databases) {
      for (const db of databases) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    }

    console.log('✅ IndexedDB cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear IndexedDB:', error);
    return false;
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async (): Promise<boolean> => {
  try {
    await signOut(auth);
    console.log('✅ User signed out');
    return true;
  } catch (error) {
    console.error('❌ Failed to sign out:', error);
    return false;
  }
};

/**
 * Clear all cookies (if any are set)
 */
export const clearCookies = (): boolean => {
  try {
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });

    console.log('✅ Cookies cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear cookies:', error);
    return false;
  }
};

/**
 * Reset React Context states (requires integration with your context)
 * This should be called from your main App component or reset button
 */
export interface ContextResetFunctions {
  resetAuth?: () => void;
  resetEvents?: () => void;
  resetRegistration?: () => void;
  resetUI?: () => void;
}

/**
 * Complete frontend reset
 */
export const performFrontendReset = async (
  contextResetFunctions?: ContextResetFunctions
): Promise<ResetProgress> => {
  const progress: ResetProgress = {
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
    authState: false,
    firebaseCache: false,
    contextState: false,
  };

  try {
    console.log('🔄 Starting frontend reset...\n');

    // Clear storage
    progress.localStorage = clearLocalStorage();
    progress.sessionStorage = clearSessionStorage();
    progress.indexedDB = await clearIndexedDB();
    progress.firebaseCache = clearCookies();

    // Sign out user
    progress.authState = await signOutUser();

    // Reset context states if provided
    if (contextResetFunctions) {
      try {
        contextResetFunctions.resetAuth?.();
        contextResetFunctions.resetEvents?.();
        contextResetFunctions.resetRegistration?.();
        contextResetFunctions.resetUI?.();
        progress.contextState = true;
        console.log('✅ Context states reset');
      } catch (error) {
        console.error('❌ Failed to reset context:', error);
      }
    }

    console.log('\n✅ Frontend reset complete');
    return progress;
  } catch (error) {
    console.error('❌ Frontend reset failed:', error);
    return progress;
  }
};

/**
 * Verify reset was successful
 */
export const verifyResetSuccess = (): boolean => {
  const checks = {
    localStorageEmpty: localStorage.length === 0,
    sessionStorageEmpty: sessionStorage.length === 0,
    cookiesCleared: document.cookie === '',
  };

  const allCleared = Object.values(checks).every((v) => v === true);

  if (allCleared) {
    console.log('✅ Reset verification: ALL CHECKS PASSED');
  } else {
    console.log('⚠️  Reset verification: Some items may remain');
    console.log(checks);
  }

  return allCleared;
};

/**
 * Helper to clear specific storage key
 */
export const clearStorageKey = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to clear key "${key}":`, error);
    return false;
  }
};

/**
 * Get current storage status for debugging
 */
export const getStorageStatus = () => {
  return {
    localStorageItems: localStorage.length,
    sessionStorageItems: sessionStorage.length,
    localStorageKeys: Object.keys(localStorage),
    sessionStorageKeys: Object.keys(sessionStorage),
  };
};

/**
 * Full page reload after reset
 * Ensures all cached states are completely cleared
 */
export const reloadPage = (delayMs: number = 1000): void => {
  setTimeout(() => {
    window.location.href = '/';
  }, delayMs);
};

export default {
  clearLocalStorage,
  clearSessionStorage,
  clearIndexedDB,
  signOutUser,
  clearCookies,
  performFrontendReset,
  verifyResetSuccess,
  clearStorageKey,
  getStorageStatus,
  reloadPage,
  STORAGE_KEYS,
};
