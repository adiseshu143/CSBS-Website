import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import {
  loginUser,
  registerUser,
  logoutUser,
  adminLogin as adminLoginApi,
  initiateGoogleLogin,
  handleSocialRedirectResult,
  ensureSocialUserProfile,
  getErrorMessage,
  type UserRole,
  type RegisterPayload,
  type UserProfile,
} from '../api/authApi'

// ─── Types ────────────────────────────────────────────────
interface User {
  id: string
  name: string
  email: string
  rollNumber: string
  department: string
  role: UserRole
  profileImage?: string
  designation?: string
  customRole?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isAuthModalOpen: boolean
  verifiedAdminCode: boolean
  intendedRoute: string | null
  openAuthModal: (intendedRoute?: string) => void
  closeAuthModal: () => void
  login: (email: string, password: string) => Promise<void>
  adminLogin: (email: string, accessCode: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  loginGoogle: () => Promise<void>
  logout: () => void
  updateUserProfileImage: (imageUrl: string) => void
  updateUserDesignation: (designation: string) => void
  updateUserCustomRole: (customRole: string) => void
}

interface RegisterData {
  fullName: string
  email: string
  rollNumber: string
  department: string
  password: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

// ─── Helper: convert Firestore profile → app User ────────
const toUser = (profile: UserProfile): User => ({
  id: profile.uid,
  name: profile.name,
  email: profile.email,
  rollNumber: profile.rollNumber,
  department: profile.department,
  role: profile.role,
  profileImage: profile.profileImage,
  designation: profile.designation,
  customRole: profile.customRole,
})

// ─── Provider ─────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null)
  const [verifiedAdminCode, setVerifiedAdminCode] = useState(false)

  const openAuthModal = useCallback((route?: string) => {
    setIntendedRoute(route || null)
    setIsAuthModalOpen(true)
  }, [])
  
  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
    setIntendedRoute(null)
  }, [])

  // ── Handle social login redirect result on mount ──────
  // Only check for redirect result if the URL indicates a redirect callback
  useEffect(() => {
    // Immediately check for redirect result without deferring
    handleSocialRedirectResult()
      .then((result) => {
        if (result) {
          setUser(toUser(result.user))
          closeAuthModal()
        }
      })
      .catch((err) => {
        console.error('[Social Redirect Error]', err)
      })
  }, [closeAuthModal])

  // ── Listen to Firebase auth state ───────────────────────
  useEffect(() => {
    // Let Firebase restore the existing session in current browser session.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (snap.exists()) {
            const profile = snap.data() as UserProfile
            setUser(toUser(profile))
            setVerifiedAdminCode(profile.role === 'admin')
          } else if (firebaseUser.providerData.some(p => p.providerId === 'google.com')) {
            // Social auth user without Firestore profile — create one
            try {
              const profile = await ensureSocialUserProfile(firebaseUser)
              setUser(toUser(profile))
              setVerifiedAdminCode(profile.role === 'admin')
            } catch (err) {
              // If ensureSocialUserProfile fails, sign out and clear state
              console.error('[Social Profile Creation Error]', err)
              await signOut(auth)
              setVerifiedAdminCode(false)
              setUser(null)
            }
          } else {
            // Auth user exists but no Firestore profile — force cleanup
            await signOut(auth)
            setVerifiedAdminCode(false)
            setUser(null)
          }
        } catch (err) {
          console.error('[Auth State Change Error]', err)
          setVerifiedAdminCode(false)
          setUser(null)
        }
      } else {
        setVerifiedAdminCode(false)
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // ── Login (student) ──────────────────────────────────────
  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const result = await loginUser(email, password)
      setUser(toUser(result.user))
    } catch (err) {
      throw new Error(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Admin Login (Firebase Auth + Firestore code verify) ─
  // Step 1: signInWithEmailAndPassword
  // Step 2: Verify access code against Firestore (or generate & email if missing)
  // Step 3: Set verifiedAdminCode flag to allow ProtectedAdminRoute access
  const adminLogin = async (email: string, accessCode: string) => {
    setIsLoading(true)
    setVerifiedAdminCode(false) // Reset on each attempt
    try {
      const result = await adminLoginApi(email, accessCode)
      setUser(toUser(result.user))
      setVerifiedAdminCode(true) // Success → set flag for ProtectedAdminRoute
    } catch (err) {
      setVerifiedAdminCode(false) // Failed → reset flag
      throw new Error(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Register ────────────────────────────────────────────
  const register = async (data: RegisterData) => {
    setIsLoading(true)
    try {
      const payload: RegisterPayload = {
        fullName: data.fullName,
        email: data.email,
        rollNumber: data.rollNumber,
        department: data.department,
        password: data.password,
      }
      await registerUser(payload)
      // Registration success — user is signed out, they need to login
    } catch (err) {
      throw new Error(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Social Login (Google) — redirect-based ───────────────
  const loginGoogle = async () => {
    try {
      await initiateGoogleLogin()
      // Page will redirect to Google, then back to the app
    } catch (err) {
      throw new Error(getErrorMessage(err))
    }
  }

  // ── Logout ──────────────────────────────────────────────
  const logout = async () => {
    setVerifiedAdminCode(false)
    try {
      await logoutUser()
    } catch {
      // Fallback: clear state even if Firebase signOut fails
    }
    setUser(null)
  }

  // ── Update profile image in local state ─────────────────
  const updateUserProfileImage = useCallback((imageUrl: string) => {
    setUser(prev => prev ? { ...prev, profileImage: imageUrl } : null)
  }, [])

  // ── Update designation in local state ────────────────────
  const updateUserDesignation = useCallback((designation: string) => {
    setUser(prev => prev ? { ...prev, designation } : null)
  }, [])
  // ── Update custom role in local state ────────────────────────
  const updateUserCustomRole = useCallback((customRole: string) => {
    setUser(prev => prev ? { ...prev, customRole } : null)
  }, [])
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      isAuthModalOpen,
      verifiedAdminCode,
      intendedRoute,
      openAuthModal,
      closeAuthModal,
      login,
      adminLogin,
      register,
      loginGoogle,
      logout,
      updateUserProfileImage,
      updateUserDesignation,
      updateUserCustomRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export type { UserRole }
