import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

type Panel = 'login' | 'register'

const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, isAuthenticated, intendedRoute } = useAuth()
  const [activePanel, setActivePanel] = useState<Panel>('login')
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()

  // Reset to login when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setActivePanel('login')
    }
  }, [isAuthModalOpen])

  // Close modal and navigate based on intended route when authenticated
  useEffect(() => {
    if (isAuthenticated && isAuthModalOpen) {
      closeAuthModal()
      // If there's an intended route, go there; otherwise go to profile
      setTimeout(() => {
        if (intendedRoute) {
          navigate(intendedRoute, { replace: false })
        } else {
          navigate('/profile', { replace: false })
        }
      }, 50)
    }
  }, [isAuthenticated, isAuthModalOpen, closeAuthModal, navigate, intendedRoute])

  // Body scroll lock + focus
  useEffect(() => {
    if (isAuthModalOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        const focusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      })
    } else {
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
    return () => { document.body.style.overflow = '' }
  }, [isAuthModalOpen])

  // ESC + focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal()
      if (e.key === 'Tab' && modalRef.current) {
        const els = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (els.length === 0) return
        const first = els[0], last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    },
    [closeAuthModal]
  )

  useEffect(() => {
    if (isAuthModalOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAuthModalOpen, handleKeyDown])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeAuthModal()
  }

  if (!isAuthModalOpen) return null

  return (
    <div
      className="auth-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
    >
      {/* Backdrop */}
      <div className="auth-overlay__backdrop" aria-hidden="true" />

      {/* Modal */}
      <div className="auth-modal" ref={modalRef}>
        {/* Close */}
        <button className="auth-modal__close" onClick={closeAuthModal} aria-label="Close" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Top accent line */}
        <div className="auth-modal__accent" aria-hidden="true" />

        {/* Glow orbs */}
        <div className="auth-modal__orb auth-modal__orb--1" aria-hidden="true" />
        <div className="auth-modal__orb auth-modal__orb--2" aria-hidden="true" />

        {/* Brand header */}
        <div className="auth-modal__brand">
          <div className="auth-modal__brand-icon">
            {activePanel === 'login' ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            )}
          </div>
          <span className="auth-modal__brand-name">TECHIE BLAZERS</span>
        </div>

        {/* Panel content */}
        <div className="auth-modal__body">
          {activePanel === 'login' ? (
            <div className="auth-modal__panel" key="login">
              <LoginForm />
            </div>
          ) : (
            <div className="auth-modal__panel" key="register">
              <RegisterForm onSwitchToLogin={() => setActivePanel('login')} />
            </div>
          )}
        </div>

        {/* Bottom switch */}
        <div className="auth-modal__footer">
          <div className="auth-modal__footer-line" aria-hidden="true" />
          {activePanel === 'login' ? (
            <p className="auth-modal__switch">
              New here?{' '}
              <button type="button" className="auth-modal__switch-btn" onClick={() => setActivePanel('register')}>
                Create an Account
              </button>
            </p>
          ) : (
            <p className="auth-modal__switch">
              Already have an account?{' '}
              <button type="button" className="auth-modal__switch-btn" onClick={() => setActivePanel('login')}>
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
