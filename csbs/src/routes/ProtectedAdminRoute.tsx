import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
}

/**
 * ProtectedAdminRoute — Guards admin dashboard access
 *
 * Requirements (all must be true):
 *   1. User must be authenticated
 *   2. User role must be 'admin'
 *   3. User must have verified access code in current session
 *      (set after successful Firestore code verification)
 *
 * If any check fails → redirect to "/" (home)
 * If code verification needed → redirect to "/admin" (login page)
 */

const ProtectedAdminRoute = ({ children }: Props) => {
  const { user, isAuthenticated, isLoading, verifiedAdminCode } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Don't check until auth state is settled
    if (isLoading) return

    // Check 1: Not logged in → redirect to home
    if (!isAuthenticated || !user) {
      navigate('/', { replace: true })
      return
    }

    // Check 2: Not an admin → redirect to home
    if (user.role !== 'admin') {
      navigate('/', { replace: true })
      return
    }

    // Check 3: Admin code not verified in this session → redirect to login
    if (!verifiedAdminCode) {
      navigate('/admin', { replace: true })
      return
    }
  }, [isLoading, isAuthenticated, user, verifiedAdminCode, navigate])

  if (isLoading) {
    return (
      <div className="protected-loading">
        <div className="protected-loading__spinner" />
        <p className="protected-loading__text">Verifying access...</p>
      </div>
    )
  }

  // If any check fails, useEffect will navigate away, so don't render children
  if (!isAuthenticated || !user || user.role !== 'admin' || !verifiedAdminCode) {
    return null
  }

  // All checks passed → render protected content
  return <>{children}</>
}

export default ProtectedAdminRoute
