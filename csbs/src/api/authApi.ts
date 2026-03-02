import {
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, deleteDoc, getDocs,
  collection, query, where, limit, runTransaction,
} from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { logEmailDiagnostics, validateEmailPayload, checkPayloadSizeWarnings } from '../utils/appsScriptDebug'

// ─── Apps Script URL for admin OTP email delivery ──────
// Uses a SEPARATE env var from event registration
// MUST be set in .env — no hardcoded fallback for security
const APPS_SCRIPT_URL = import.meta.env.VITE_ADMIN_APPS_SCRIPT_URL ||
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  ''

if (!APPS_SCRIPT_URL) {
  console.error('VITE_ADMIN_APPS_SCRIPT_URL or VITE_GOOGLE_APPS_SCRIPT_URL is not configured in .env')
}

// ─── Types ──────────────────────────────────────────────
export type UserRole = 'user' | 'admin'

export interface RegisterPayload {
  fullName: string
  email: string
  rollNumber: string
  department: string
  password: string
}

export interface UserProfile {
  uid: string
  name: string
  email: string
  rollNumber: string
  department: string
  role: UserRole
  createdAt: string
  designation?: string
  username?: string
  profileImage?: string
  profileImagePublicId?: string
  bio?: string
  resumeURL?: string
  resumePublicId?: string
  resumeName?: string
}

// ─── Register (student) ─────────────────────────────────
export const registerUser = async (data: RegisterPayload): Promise<void> => {
  const credential = await createUserWithEmailAndPassword(auth, data.email, data.password)
  const user = credential.user

  await updateProfile(user, { displayName: data.fullName })

  const profile: UserProfile = {
    uid: user.uid,
    name: data.fullName,
    email: data.email,
    rollNumber: data.rollNumber,
    department: data.department,
    role: 'user',
    createdAt: new Date().toISOString(),
  }
  await setDoc(doc(db, 'users', user.uid), profile)
  await signOut(auth)
}

// ─── Login (student) ────────────────────────────────────
export const loginUser = async (
  email: string,
  password: string
): Promise<{ user: UserProfile; token: string }> => {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const firebaseUser = credential.user

  const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))

  if (!profileSnap.exists()) {
    await signOut(auth)
    throw new Error('User profile not found. Please register first.')
  }

  const profile = profileSnap.data() as UserProfile
  const token = await firebaseUser.getIdToken()

  return { user: profile, token }
}


// ═══════════════════════════════════════════════════════════
// ADMIN SYSTEM — Direct Firestore + Apps Script Email
// ═══════════════════════════════════════════════════════════

// ─── Eligibility result type ────────────────────────────
export interface EligibilityResult {
  eligible: boolean
  accountExists?: boolean
  needsRegistration?: boolean
  hasCode?: boolean
  message: string
}

// ─── Helper: Generate auto-increment code via Firestore transaction ──
async function generateAccessCode(): Promise<string> {
  const counterRef = doc(db, 'adminMeta', 'adminCounter')

  const code = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef)

    let current = 0
    if (counterDoc.exists()) {
      current = counterDoc.data().current || 0
    }

    const next = current + 1
    const formatted = `CSBS-${String(next).padStart(3, '0')}`

    transaction.set(counterRef, { current: next }, { merge: true })

    return formatted
  })

  return code
}

// ─── Helper: Send access code email via Apps Script ─────
// Google Apps Script doesn't support CORS preflight for POST requests,
// so we use mode: 'no-cors'. With no-cors, only CORS-safelisted
// Content-Types are allowed: text/plain, application/x-www-form-urlencoded,
// multipart/form-data. 'application/json' gets silently DROPPED.
// The JSON string body is still delivered as text/plain — the Apps Script
// doPost(e) receives it via e.postData.contents and can JSON.parse() it.
async function sendAccessCodeEmail(
  email: string,
  accessCode: string,
  name: string,
  isFirstTime: boolean
): Promise<void> {
  const requestId = `EMAIL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('YOUR_')) {
      console.error(`[${requestId}] ❌ Apps Script URL not configured:`, APPS_SCRIPT_URL)
      logEmailDiagnostics('ERROR', 'ACCESS_CODE', { email, name, error: 'URL not configured' }, requestId)
      return
    }

    const payload = {
      email,
      accessCode,
      name,
      isFirstTime: !!isFirstTime,
    }

    console.group(`[${requestId}] 📧 Sending Access Code Email`)
    console.log('Recipient:', email)
    console.log('Name:', name)
    console.log('Is First Time:', isFirstTime)
    console.log('Apps Script URL:', APPS_SCRIPT_URL)
    console.log('Payload:', payload)
    console.groupEnd()

    // Validate payload structure
    const validationErrors = validateEmailPayload(payload, 'admin')
    if (validationErrors.length > 0) {
      console.error(`[${requestId}] ❌ Payload validation failed:`, validationErrors)
      logEmailDiagnostics('ERROR', 'ACCESS_CODE', { ...payload, validationErrors }, requestId)
      throw new Error(`Invalid payload: ${validationErrors.join(', ')}`)
    }

    // Log payload size
    const jsonPayload = JSON.stringify(payload)
    checkPayloadSizeWarnings(jsonPayload)

    logEmailDiagnostics('START', 'ACCESS_CODE', payload, requestId)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      console.log(`[${requestId}] 📤 Fetching Apps Script...`)
      logEmailDiagnostics('SEND', 'ACCESS_CODE', payload, requestId)

      const fetchResponse = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: jsonPayload,
        mode: 'no-cors',
        redirect: 'follow',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      console.log(`[${requestId}] ✅ Fetch completed:`, {
        status: fetchResponse.status,
        type: fetchResponse.type,
        ok: fetchResponse.ok,
      })
      console.log(`[${requestId}] ✅ Access code email request sent for ${email}`)
      
      logEmailDiagnostics('SUCCESS', 'ACCESS_CODE', { email, accessCode: '***' }, requestId)
    } catch (fetchErr: any) {
      clearTimeout(timeoutId)
      
      if (fetchErr?.name === 'AbortError') {
        console.warn(`[${requestId}] ⏱️ Timeout sending to ${email} (request queued in background)`)
        logEmailDiagnostics('ERROR', 'ACCESS_CODE', { email, error: 'Timeout (queued)' }, requestId)
      } else {
        console.error(`[${requestId}] ❌ Fetch error:`, {
          name: fetchErr?.name,
          message: fetchErr?.message,
          stack: fetchErr?.stack,
        })
        logEmailDiagnostics('ERROR', 'ACCESS_CODE', { email, error: fetchErr?.message }, requestId)
        throw fetchErr
      }
    }
  } catch (err) {
    console.error(`[${requestId}] ❌ Email sending error:`, err)
    logEmailDiagnostics('ERROR', 'ACCESS_CODE', { 
      email, 
      error: err instanceof Error ? err.message : String(err),
    }, requestId)
    // Don't fail the operation — code is stored in Firestore
    console.warn(`[${requestId}] ⚠️ Email send failed but access code is stored in Firestore`)
  }
}

// ─── Check admin eligibility ────────────────────────────
// Direct Firestore operations (unauthenticated — public read rules):
//   1. Query admins collection for email
//   2. Check if adminCodes/{email} already exists (code was already sent)
//   3. Check if user profile already exists in users collection
//   4. Return eligibility result — UI will ask user to register, resend, or login
export const checkAdminEligibility = async (email: string): Promise<EligibilityResult> => {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required.')
  }

  const normalizedEmail = email.toLowerCase().trim()

  // 1. Check admins collection in Firestore (only admins collection members are eligible)
  const adminsSnap = await getDocs(
    query(
      collection(db, 'admins'),
      where('email', '==', normalizedEmail),
      limit(1)
    )
  )

  if (adminsSnap.empty) {
    throw new Error('Your email is not authorized for admin access.')
  }

  // 2. Check if access code already exists (public read)
  const codeSnap = await getDoc(doc(db, 'adminCodes', normalizedEmail))

  if (codeSnap.exists()) {
    return {
      eligible: true,
      accountExists: true,
      hasCode: true,
      message: 'You already have an access code. Check your email and proceed to login.',
    }
  }

  // 3. Check if admin already has a user profile (returning admin, code was used/expired)
  const usersSnap = await getDocs(
    query(
      collection(db, 'users'),
      where('email', '==', normalizedEmail),
      where('role', '==', 'admin'),
      limit(1)
    )
  )

  if (!usersSnap.empty) {
    // Returning admin — account exists but no code. Need to resend OTP.
    return {
      eligible: true,
      accountExists: true,
      hasCode: false,
      message: 'Welcome back! A new access code will be sent to your email.',
    }
  }

  // 4. New admin — no account, no code → needs full registration
  return {
    eligible: true,
    accountExists: false,
    needsRegistration: true,
    message: 'Email verified. Setting up your admin account...',
  }
}

// ─── Create admin account ───────────────────────────────
// Direct Firestore operations:
//   1. Validate email in allowedAdmins
//   2. Create Firebase Auth user
//   3. Create Firestore profile with admin role
//   4. Generate access code, store in Firestore
//   5. Email the code via Apps Script
export const createAdminAccount = async (
  email: string,
  password: string,
  name: string,
  designation: string = 'Admin'
): Promise<EligibilityResult> => {
  const normalizedEmail = email.toLowerCase().trim()

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.')
  }

  // 1. Verify email is in admins collection
  const adminsSnap = await getDocs(
    query(
      collection(db, 'admins'),
      where('email', '==', normalizedEmail),
      limit(1)
    )
  )

  if (adminsSnap.empty) {
    throw new Error('Your email is not authorized for admin access.')
  }

  // 2. Create Firebase Auth user
  let adminUser: any
  try {
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
    adminUser = credential.user

    await updateProfile(adminUser, { displayName: name })
  } catch (authErr: any) {
    console.error('[CREATE ADMIN] Firebase Auth Error Details:', {
      error: authErr,
      code: authErr?.code,
      message: authErr?.message || String(authErr),
      email: normalizedEmail,
      passwordLength: password.length,
    })
    
    // Handle Firebase-specific error codes
    if (authErr?.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists. Please use a different email or go to login.')
    }
    if (authErr?.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.')
    }
    if (authErr?.code === 'auth/weak-password') {
      throw new Error('Password must be at least 6 characters.')
    }
    if (authErr?.code === 'auth/operation-not-allowed') {
      throw new Error('Email/Password sign-up is not enabled. Please contact the administrator.')
    }
    
    // Re-throw original error if not handled above
    if (authErr instanceof Error) {
      throw authErr
    }
    throw new Error('Failed to create Firebase account. Check console for details.')
  }

  // 3. Create Firestore profile
  try {
    await setDoc(doc(db, 'users', adminUser.uid), {
      uid: adminUser.uid,
      name,
      email: normalizedEmail,
      rollNumber: '',
      department: 'CSBS',
      role: 'admin',
      designation: designation || 'Admin',
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Firestore profile creation failed:', err)
    throw new Error('Failed to create admin profile. Please try again.')
  }

  // 4. Generate access code (user is now authenticated, can write to Firestore)
  const plainCode = await generateAccessCode()

  await setDoc(doc(db, 'adminCodes', normalizedEmail), {
    accessCode: plainCode,
    createdAt: new Date().toISOString(),
  })

  // 5. Email the code via Apps Script
  await sendAccessCodeEmail(normalizedEmail, plainCode, name, true)

  console.log(`[ADMIN] Account created for ${normalizedEmail}, code: ${plainCode}`)

  // Sign out so admin can log in fresh with code
  await signOut(auth)

  return {
    eligible: true,
    accountExists: true,
    hasCode: false,
    message: 'Admin account created! Access code has been sent to your email.',
  }
}

// ─── Resend admin access code (returning admin) ─────────
// For admins who already have an account but their code was used/expired.
// Flow:
//   1. Verify email is in admins collection
//   2. Sign in with Firebase Auth (internal password)
//   3. Generate new access code, store in Firestore
//   4. Email the code via Apps Script
//   5. Sign out so admin can log in fresh with code
export const resendAdminCode = async (
  email: string
): Promise<EligibilityResult> => {
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Verify email is in admins collection
  const adminsSnap = await getDocs(
    query(
      collection(db, 'admins'),
      where('email', '==', normalizedEmail),
      limit(1)
    )
  )

  if (adminsSnap.empty) {
    throw new Error('Your email is not authorized for admin access.')
  }

  // 2. Sign in to get write access to Firestore
  const INTERNAL_ADMIN_PASSWORD = 'tempPassword123'
  try {
    await signInWithEmailAndPassword(auth, normalizedEmail, INTERNAL_ADMIN_PASSWORD)
  } catch (authErr: any) {
    console.error('[RESEND] Firebase Auth error:', authErr?.code, authErr?.message)
    throw new Error('Authentication failed. Please contact administrator.')
  }

  // 3. Get admin name from profile
  const userSnap = await getDocs(
    query(
      collection(db, 'users'),
      where('email', '==', normalizedEmail),
      limit(1)
    )
  )
  const adminName = userSnap.empty ? normalizedEmail.split('@')[0] : (userSnap.docs[0].data().name || normalizedEmail.split('@')[0])

  // 4. Generate new access code
  const plainCode = await generateAccessCode()

  await setDoc(doc(db, 'adminCodes', normalizedEmail), {
    accessCode: plainCode,
    createdAt: new Date().toISOString(),
  })

  // 5. Email the code via Apps Script (isFirstTime = false → login template)
  await sendAccessCodeEmail(normalizedEmail, plainCode, adminName, false)

  console.log(`[ADMIN] Resent code for ${normalizedEmail}, code: ${plainCode}`)

  // Sign out so admin can log in fresh with code
  await signOut(auth)

  return {
    eligible: true,
    accountExists: true,
    hasCode: true,
    message: 'A new access code has been sent to your email.',
  }
}

// ─── Admin Login (Access Code Only — No Password) ────────
// Flow:
//   1. Verify access code against Firestore adminCodes/{email}
//   2. Code valid → sign in with Firebase Auth (internal password)
//   3. Fetch admin profile, return user + token
//   4. Delete the used access code (single-use)
export const adminLogin = async (
  email: string,
  accessCode: string
): Promise<{ user: UserProfile; token: string }> => {
  const normalizedEmail = email.toLowerCase().trim()

  if (!accessCode || !accessCode.trim()) {
    throw new Error('Access code is required.')
  }

  // 1. Check if this admin has an access code in Firestore
  const codeSnap = await getDoc(doc(db, 'adminCodes', normalizedEmail))

  if (!codeSnap.exists() || !codeSnap.data().accessCode) {
    throw new Error('No access code found. Please request a new one.')
  }

  const storedCode = codeSnap.data().accessCode

  // 2. Compare codes (case-insensitive)
  if (accessCode.trim().toUpperCase() !== storedCode.trim().toUpperCase()) {
    throw new Error('Invalid access code.')
  }

  // 3. Code valid → sign in with Firebase Auth using internal password
  const INTERNAL_ADMIN_PASSWORD = 'tempPassword123'
  let firebaseUser: any

  try {
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, INTERNAL_ADMIN_PASSWORD)
    firebaseUser = credential.user
  } catch (authErr: any) {
    console.error('[ADMIN LOGIN] Firebase Auth error:', authErr?.code, authErr?.message)
    throw new Error('Authentication failed. Please contact administrator.')
  }

  try {
    // 4. Delete the used access code (single-use)
    await deleteDoc(doc(db, 'adminCodes', normalizedEmail))

    // 5. Fetch user profile
    const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))

    if (!profileSnap.exists()) {
      await signOut(auth)
      throw new Error('User profile not found.')
    }

    const profile = profileSnap.data() as UserProfile

    if (profile.role !== 'admin') {
      await signOut(auth)
      throw new Error('Admin privileges required.')
    }

    // 6. Get Firebase ID token
    const token = await firebaseUser.getIdToken()

    return { user: profile, token }
  } catch (error: any) {
    // Verification failed → sign out
    if (auth.currentUser) {
      await signOut(auth)
    }
    throw error
  }
}


// ─── Social Authentication (Google) ─────────────────────
export const loginWithGoogle = async (): Promise<{ user: UserProfile; token: string }> => {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const credential = await signInWithPopup(auth, provider)
  const firebaseUser = credential.user

  // Check if user profile exists
  let profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))

  if (!profileSnap.exists()) {
    // Create new user profile for social auth
    const profile: UserProfile = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      rollNumber: '',
      department: '',
      role: 'user',
      createdAt: new Date().toISOString(),
      profileImage: firebaseUser.photoURL || undefined,
    }
    await setDoc(doc(db, 'users', firebaseUser.uid), profile)
    profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
  }

  const profile = profileSnap.data() as UserProfile
  const token = await firebaseUser.getIdToken()

  return { user: profile, token }
}

// ─── Social Authentication (GitHub) ────────────────────
export const loginWithGitHub = async (): Promise<{ user: UserProfile; token: string }> => {
  const provider = new GithubAuthProvider()
  provider.addScope('user:email')

  const credential = await signInWithPopup(auth, provider)
  const firebaseUser = credential.user

  // Check if user profile exists
  let profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))

  if (!profileSnap.exists()) {
    // Create new user profile for social auth
    const profile: UserProfile = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      rollNumber: '',
      department: '',
      role: 'user',
      createdAt: new Date().toISOString(),
      profileImage: firebaseUser.photoURL || undefined,
    }
    await setDoc(doc(db, 'users', firebaseUser.uid), profile)
    profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
  }

  const profile = profileSnap.data() as UserProfile
  const token = await firebaseUser.getIdToken()

  return { user: profile, token }
}


// ─── Logout ─────────────────────────────────────────────
export const logoutUser = async (): Promise<void> => {
  await signOut(auth)
}

// ─── Error helper ───────────────────────────────────────
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message

    // Firebase Auth error codes (already extracted by createAdminAccount)
    if (msg.includes('email already exists')) return msg // Uses our custom message
    if (msg.includes('Invalid email')) return msg
    if (msg.includes('Password must be')) return msg
    if (msg.includes('not enabled')) return msg
    if (msg.includes('Failed to create Firebase')) return msg

    // Fallback: Original Firebase error handling
    if (msg.includes('auth/email-already-in-use')) return 'An account with this email already exists.'
    if (msg.includes('auth/invalid-email')) return 'Invalid email address.'
    if (msg.includes('auth/weak-password')) return 'Password must be at least 6 characters.'
    if (msg.includes('auth/user-not-found')) return 'No account found with this email.'
    if (msg.includes('auth/wrong-password')) return 'Incorrect password.'
    if (msg.includes('auth/invalid-credential')) return 'Invalid email or password.'
    if (msg.includes('auth/too-many-requests')) return 'Too many attempts. Please try again later.'
    if (msg.includes('auth/network-request-failed')) return 'Network error. Check your connection.'
    if (msg.includes('auth/user-disabled')) return 'This account has been disabled.'
    if (msg.includes('auth/operation-not-allowed')) return 'Email/Password sign-up is not enabled. Contact the administrator.'
    if (msg.includes('auth/popup-closed-by-user')) return 'Sign-in was cancelled.'
    if (msg.includes('auth/popup-blocked')) return 'Sign-in popup was blocked. Please allow popups and try again.'
    if (msg.includes('auth/cancelled-popup-request')) return 'Sign-in was cancelled.'

    // Admin errors
    if (msg.includes('Invalid access code')) return 'Invalid access code. Please try again.'
    if (msg.includes('not authorized')) return 'Your email is not authorized for admin access.'
    if (msg.includes('Access denied')) return 'Access denied. Check your permissions.'

    // If it's a clean message (no Firebase prefix), return as-is
    if (!msg.includes('auth/') && !msg.includes('firestore/')) return msg
  }
  return 'Something went wrong. Please try again.'
}
