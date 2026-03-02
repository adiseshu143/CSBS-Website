import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
}

const AdminRoute = ({ children }: Props) => {
  const { user, isAuthenticated, isLoading, openAuthModal } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Pass the current location so admin returns here after login
      openAuthModal(location.pathname)
    }
  }, [isLoading, isAuthenticated, openAuthModal, location.pathname])

  if (isLoading) {
    return (
      <div className="auth-loading">
        <span className="auth-form__spinner auth-form__spinner--lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (user?.role !== 'admin') {
    return (
      <div className="auth-loading">
        <p style={{ color: '#dc2626', fontFamily: 'Inter, sans-serif' }}>Access denied. Admin privileges required.</p>
      </div>
    )
  }

  return <>{children}</>
}

export default AdminRoute
