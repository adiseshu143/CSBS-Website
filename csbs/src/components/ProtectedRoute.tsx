import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated, isLoading, openAuthModal } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Pass the current location path so user returns here after login
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

  return <>{children}</>
}

export default ProtectedRoute
