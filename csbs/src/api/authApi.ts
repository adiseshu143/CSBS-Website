import {
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  GithubAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, deleteDoc, getDocs,
  collection, query, where, limit,
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
  customRole?: string
  username?: string
  profileImage?: string
  profileImagePublicId?: string
  bio?: string
  resumeURL?: string
  resumePublicId?: string
  resumeName?: string
}

const VISHNU_DOMAIN = 'vishnu.edu.in'
const REGD_NO_PATTERN = /^[a-z0-9]+$/i

const parseEmail = (email?: string | null) => {
  const normalized = (email || '').trim().toLowerCase()
  const [localPart = '', domain = ''] = normalized.split('@')
  return { normalized, localPart, domain }
}

const validateGoogleCollegeEmail = (email?: string | null) => {
  const { localPart, domain } = parseEmail(email)
  if (!email || !domain) {
    return { valid: false, message: 'Google account email not found. Please try again.' }
  }
  if (domain !== VISHNU_DOMAIN) {
    return { valid: false, message: 'Only college Google accounts ending with @vishnu.edu.in are allowed.' }
  }
  if (!REGD_NO_PATTERN.test(localPart)) {
    return {
      valid: false,
      message: 'Google sign-in requires a valid registration-number style college email (e.g. 24pa1a5723@vishnu.edu.in).',
    }
  }
  return { valid: true, regdNo: localPart }
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

// ─── Helper: Generate secure random access code (CSBS-XXXX) ──────────
// Uses crypto-safe random when available, falls back to Math.random.
// Format: CSBS-XXXX where XXXX is a 4-digit random number (0000–9999).
function generateAccessCode(): string {
  let digits = ''
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    digits = String(arr[0] % 10000).padStart(4, '0')
  } else {
    digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  }
  return `CSBS-${digits}`
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
//   3. Try to check if user profile exists (may fail if unauthenticated)
//   4. Return eligibility result
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

  // 3. Try to check if admin already has a user profile
  //    This may fail if user is unauthenticated (Firestore rules require auth for 'users')
  //    In that case, we can't tell if account exists — we'll handle it in requestAdminAccessCode
  try {
    const usersSnap = await getDocs(
      query(
        collection(db, 'users'),
        where('email', '==', normalizedEmail),
        where('role', '==', 'admin'),
        limit(1)
      )
    )

    if (!usersSnap.empty) {
      return {
        eligible: true,
        accountExists: true,
        hasCode: false,
        message: 'Welcome back! A new access code will be sent to your email.',
      }
    }
  } catch (err) {
    // Can't query users collection (unauthenticated) — that's fine
    console.warn('[ELIGIBILITY] Could not check users collection (expected when unauthenticated):', err)
  }

  // 4. New admin OR we couldn't check → needs account setup
  return {
    eligible: true,
    accountExists: false,
    needsRegistration: true,
    message: 'Email verified. Setting up your admin account...',
  }
}

// ─── Request Admin Access Code (unified flow) ───────────
// Single robust function that handles BOTH new and returning admins.
// Flow:
//   1. Verify email is in admins collection (public read)
//   2. Try to create Firebase Auth account
//      - If new → create account + profile
//      - If already exists → sign in with internal password
//   3. Generate access code, store in Firestore adminCodes
//   4. Send code via Apps Script email
//   5. Sign out so admin can log in fresh with the code
export const requestAdminAccessCode = async (
  email: string
): Promise<EligibilityResult> => {
  const normalizedEmail = email.toLowerCase().trim()
  const INTERNAL_PASSWORD = 'tempPassword123'
  const displayName = normalizedEmail.split('@')[0]

  // 1. Verify email is in admins collection (public read — always works)
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

  console.log('[ADMIN] ✅ Email verified in admins collection:', normalizedEmail)

  // 2. Create or sign in to Firebase Auth to get write access
  let adminUser: any
  let isNewAccount = false

  try {
    // Try creating a new account first
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, INTERNAL_PASSWORD)
    adminUser = credential.user
    isNewAccount = true
    await updateProfile(adminUser, { displayName })
    console.log('[ADMIN] ✅ New Firebase Auth account created')
  } catch (authErr: any) {
    if (authErr?.code === 'auth/email-already-in-use') {
      // Account already exists — sign in instead
      console.log('[ADMIN] Account already exists, signing in...')
      try {
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, INTERNAL_PASSWORD)
        adminUser = credential.user
        console.log('[ADMIN] ✅ Signed in to existing account')
      } catch (signInErr: any) {
        console.error('[ADMIN] Sign in failed:', signInErr?.code, signInErr?.message)
        throw new Error('Authentication failed. Please contact the administrator.')
      }
    } else {
      console.error('[ADMIN] Account creation error:', authErr?.code, authErr?.message)
      throw new Error('Failed to set up admin account. Please try again.')
    }
  }

  // 3. Create Firestore profile if new account
  if (isNewAccount) {
    try {
      await setDoc(doc(db, 'users', adminUser.uid), {
        uid: adminUser.uid,
        name: displayName,
        email: normalizedEmail,
        rollNumber: '',
        department: 'CSBS',
        role: 'admin',
        designation: 'Admin',
        createdAt: new Date().toISOString(),
      })
      console.log('[ADMIN] ✅ Firestore profile created')
    } catch (err) {
      console.error('[ADMIN] Profile creation failed:', err)
      // Continue anyway — profile might already exist from a previous attempt
    }
  }

  // 4. Generate access code and store in Firestore (now authenticated — can write)
  const accessCode = generateAccessCode()

  try {
    await setDoc(doc(db, 'adminCodes', normalizedEmail), {
      accessCode,
      createdAt: new Date().toISOString(),
    })
    console.log('[ADMIN] ✅ Access code stored in Firestore:', accessCode)
  } catch (err) {
    console.error('[ADMIN] Failed to store access code:', err)
    await signOut(auth)
    throw new Error('Failed to generate access code. Please try again.')
  }

  // 5. Send access code email via Apps Script
  await sendAccessCodeEmail(normalizedEmail, accessCode, displayName, isNewAccount)
  console.log('[ADMIN] ✅ Access code email sent to', normalizedEmail)

  // 6. Sign out so admin can log in fresh with the code
  await signOut(auth)

  return {
    eligible: true,
    accountExists: true,
    hasCode: true,
    message: 'Access code has been sent to your email.',
  }
}

// Keep legacy exports for backward compatibility
export const createAdminAccount = async (
  email: string,
  _password: string,
  _name: string,
  _designation: string = 'Admin'
): Promise<EligibilityResult> => {
  return requestAdminAccessCode(email)
}

export const resendAdminCode = async (
  email: string
): Promise<EligibilityResult> => {
  return requestAdminAccessCode(email)
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


// ─── Social Authentication (Google) — redirect-based ────
export const initiateGoogleLogin = async (): Promise<void> => {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({
    prompt: 'select_account',
    hd: VISHNU_DOMAIN,
  })
  await signInWithRedirect(auth, provider)
}

// ─── Social Authentication (GitHub) — redirect-based ────
export const initiateGitHubLogin = async (): Promise<void> => {
  const provider = new GithubAuthProvider()
  provider.addScope('user:email')
  await signInWithRedirect(auth, provider)
}

// ─── Handle redirect result on page load ────────────────
export const handleSocialRedirectResult = async (): Promise<{ user: UserProfile; token: string } | null> => {
  const result = await getRedirectResult(auth)
  if (!result || !result.user) return null
  const firebaseUser = result.user

  const googleProviderUsed = result.providerId === 'google.com' || firebaseUser.providerData.some(p => p.providerId === 'google.com')
  if (googleProviderUsed) {
    const validation = validateGoogleCollegeEmail(firebaseUser.email)
    if (!validation.valid) {
      await signOut(auth)
      throw new Error(validation.message)
    }
  }

  const profile = await ensureSocialUserProfile(firebaseUser)
  const token = await firebaseUser.getIdToken()
  return { user: profile, token }
}

// ─── Create Firestore profile for social auth user if missing ─
export const ensureSocialUserProfile = async (firebaseUser: FirebaseUser): Promise<UserProfile> => {
  const validation = validateGoogleCollegeEmail(firebaseUser.email)
  const isEligibleGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com') && validation.valid
  let profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))

  if (!profileSnap.exists()) {
    const profile: UserProfile = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      rollNumber: isEligibleGoogleUser ? (validation.regdNo || '') : '',
      department: 'CSBS',
      role: 'user',
      createdAt: new Date().toISOString(),
      profileImage: firebaseUser.photoURL || undefined,
    }
    await setDoc(doc(db, 'users', firebaseUser.uid), profile)
    profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
  } else {
    const profile = profileSnap.data() as UserProfile
    const updates: Partial<UserProfile> = {}

    if (!profile.profileImage && firebaseUser.photoURL) {
      updates.profileImage = firebaseUser.photoURL
    }

    if (!profile.name && firebaseUser.displayName) {
      updates.name = firebaseUser.displayName
    }

    if (!profile.email && firebaseUser.email) {
      updates.email = firebaseUser.email
    }

    if (!profile.rollNumber && isEligibleGoogleUser) {
      updates.rollNumber = validation.regdNo || ''
    }

    if (!profile.department) {
      updates.department = 'CSBS'
    }

    if (Object.keys(updates).length > 0) {
      await setDoc(doc(db, 'users', firebaseUser.uid), updates, { merge: true })
      profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
    }
  }

  return profileSnap.data() as UserProfile
}


// ─── Logout ─────────────────────────────────────────────
export const logoutUser = async (): Promise<void> => {
  await signOut(auth)
}

// ─── Error helper ───────────────────────────────────────
export const getErrorMessage = (error: unknown): string => {
  // Log the full error for debugging
  console.error('[Auth Error]', error)

  if (error instanceof Error) {
    const msg = error.message
    const code = (error as { code?: string }).code || ''

    // Check both error.code (FirebaseError) and error.message
    const check = (str: string) => msg.includes(str) || code.includes(str)

    // Firebase Auth error codes (already extracted by createAdminAccount)
    if (msg.includes('email already exists')) return msg // Uses our custom message
    if (msg.includes('Invalid email')) return msg
    if (msg.includes('Password must be')) return msg
    if (msg.includes('not enabled')) return msg
    if (msg.includes('Failed to create Firebase')) return msg

    // Fallback: Original Firebase error handling
    if (check('auth/email-already-in-use')) return 'An account with this email already exists.'
    if (check('auth/invalid-email')) return 'Invalid email address.'
    if (check('auth/weak-password')) return 'Password must be at least 6 characters.'
    if (check('auth/user-not-found')) return 'No account found with this email.'
    if (check('auth/wrong-password')) return 'Incorrect password.'
    if (check('auth/invalid-credential')) return 'Invalid email or password.'
    if (check('auth/too-many-requests')) return 'Too many attempts. Please try again later.'
    if (check('auth/network-request-failed')) return 'Network error. Check your connection.'
    if (check('auth/user-disabled')) return 'This account has been disabled.'
    if (check('auth/operation-not-allowed')) return 'This sign-in method is not enabled. Contact the administrator.'
    if (check('auth/popup-closed-by-user')) return 'Sign-in was cancelled.'
    if (check('auth/popup-blocked')) return 'Sign-in popup was blocked. Please allow popups and try again.'
    if (check('auth/cancelled-popup-request')) return 'Sign-in was cancelled.'
    if (check('auth/unauthorized-domain')) return 'This domain is not authorized for sign-in. Please contact the administrator to add this domain in Firebase Console.'
    if (check('auth/account-exists-with-different-credential')) return 'An account already exists with the same email but a different sign-in method. Try signing in with email/password instead.'
    if (check('auth/credential-already-in-use')) return 'This credential is already linked to another account.'
    if (check('auth/internal-error')) return 'An internal error occurred. Please try again.'
    if (check('auth/invalid-api-key')) return 'Invalid API key. Please contact the administrator.'
    if (msg.includes('Only college Google accounts ending with @vishnu.edu.in are allowed.')) return msg
    if (msg.includes('Google sign-in requires a valid registration-number style college email')) return msg
    if (msg.includes('Google account email not found. Please try again.')) return msg

    // Admin errors
    if (msg.includes('Invalid access code')) return 'Invalid access code. Please try again.'
    if (msg.includes('not authorized')) return 'Your email is not authorized for admin access.'
    if (msg.includes('Access denied')) return 'Access denied. Check your permissions.'

    // If it's a clean message (no Firebase prefix), return as-is
    if (!msg.includes('auth/') && !msg.includes('firestore/')) return msg
  }
  return 'Something went wrong. Please try again.'
}
