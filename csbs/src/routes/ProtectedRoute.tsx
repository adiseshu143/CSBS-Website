import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
  allowedRole: UserRole
}

const ProtectedRoute = ({ children, allowedRole }: Props) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Don't check until auth state is settled
    if (isLoading) return

    // Not logged in → redirect home
    if (!isAuthenticated || !user) {
      navigate('/', { replace: true })
      return
    }

    // Wrong role → redirect home
    if (user.role !== allowedRole) {
      navigate('/', { replace: true })
      return
    }
  }, [isLoading, isAuthenticated, user, allowedRole, navigate])

  if (isLoading) {
    return (
      <div className="protected-loading">
        <div className="protected-loading__spinner" />
        <p className="protected-loading__text">Loading...</p>
      </div>
    )
  }

  // If any check fails, useEffect will navigate away, so don't render children
  if (!isAuthenticated || !user || user.role !== allowedRole) {
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute
