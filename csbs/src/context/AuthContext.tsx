import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import {
  loginUser,
  registerUser,
  logoutUser,
  adminLogin as adminLoginApi,
  loginWithGoogle,
  loginWithGitHub,
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
  loginGitHub: () => Promise<void>
  logout: () => void
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
})

// ─── Provider ─────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null)
  // Use sessionStorage for admin verification — clears on browser close
  const [verifiedAdminCode, setVerifiedAdminCode] = useState(() => {
    return sessionStorage.getItem('adminVerified') === 'true'
  })

  const openAuthModal = useCallback((route?: string) => {
    setIntendedRoute(route || null)
    setIsAuthModalOpen(true)
  }, [])
  
  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
    setIntendedRoute(null)
  }, [])

  // ── Listen to Firebase auth state ───────────────────────
  useEffect(() => {
    // Sign out any existing Firebase session on app load
    // Users must explicitly login each session
    const clearAndListen = async () => {
      try {
        await signOut(auth)
      } catch {
        // Ignore errors on sign out
      }

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {
            const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
            if (snap.exists()) {
              setUser(toUser(snap.data() as UserProfile))
            } else {
              // Auth user exists but no Firestore profile — shouldn't happen
              setUser(null)
            }
          } catch {
            setUser(null)
          }
        } else {
          setUser(null)
        }
        setIsLoading(false)
      })
      return () => unsubscribe()
    }

    const unsubscribePromise = clearAndListen()
    return () => {
      unsubscribePromise.then(unsub => unsub?.())
    }
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
    sessionStorage.removeItem('adminVerified') // Clear session flag
    try {
      const result = await adminLoginApi(email, accessCode)
      setUser(toUser(result.user))
      setVerifiedAdminCode(true) // Success → set flag for ProtectedAdminRoute
      sessionStorage.setItem('adminVerified', 'true') // Persist in session only
    } catch (err) {
      setVerifiedAdminCode(false) // Failed → reset flag
      sessionStorage.removeItem('adminVerified')
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

  // ── Social Login (Google) ───────────────────────────────
  const loginGoogle = async () => {
    setIsLoading(true)
    try {
      const result = await loginWithGoogle()
      setUser(toUser(result.user))
      closeAuthModal()
    } catch (err) {
      throw new Error(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Social Login (GitHub) ───────────────────────────────
  const loginGitHub = async () => {
    setIsLoading(true)
    try {
      const result = await loginWithGitHub()
      setUser(toUser(result.user))
      closeAuthModal()
    } catch (err) {
      throw new Error(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Logout ──────────────────────────────────────────────
  const logout = async () => {
    try {
      await logoutUser()
    } catch {
      // Fallback: clear state even if Firebase signOut fails
    sessionStorage.removeItem('adminVerified') // Clear session storage
    }
    setUser(null)
    setVerifiedAdminCode(false) // Clear admin verification flag
  }

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
      loginGitHub,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export type { UserRole }
