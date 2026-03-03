import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

const LoginForm = () => {
  const { login, loginGoogle, loginGitHub, isLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) return setError('Email is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Invalid email format')
    if (!password) return setError('Password is required')
    if (password.length < 6) return setError('Password must be at least 6 characters')

    try {
      await login(email, password)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setSocialLoading('google')
    try {
      await loginGoogle()
      // Page will redirect to Google — no further action needed here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.')
      setSocialLoading(null)
    }
  }

  const handleGitHubLogin = async () => {
    setError('')
    setSocialLoading('github')
    try {
      await loginGitHub()
      // Page will redirect to GitHub — no further action needed here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub sign-in failed. Please try again.')
      setSocialLoading(null)
    }
  }

  if (success) {
    return (
      <div className="auth-form auth-form--success">
        <div className="auth-form__success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="auth-form__title" style={{ color: '#22c55e' }}>Welcome back!</h3>
        <p className="auth-form__subtitle">You've been logged in successfully.</p>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form__header">
        <h2 className="auth-form__title">Welcome Back!</h2>
        <p className="auth-form__subtitle">Please enter your details</p>
      </div>

      {error && (
        <div className="auth-form__error" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="auth-form__fields">
        <div className="auth-form__group">
          <label htmlFor="login-email" className="auth-form__label">Email</label>
          <div className="auth-form__input-wrap">
            <svg className="auth-form__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <input
              id="login-email"
              type="email"
              className="auth-form__input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              aria-required="true"
            />
          </div>
        </div>

        <div className="auth-form__group">
          <label htmlFor="login-password" className="auth-form__label">Password</label>
          <div className="auth-form__input-wrap">
            <svg className="auth-form__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-form__input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              aria-required="true"
            />
            <button
              type="button"
              className="auth-form__toggle-pw"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

      </div>

      <button
        type="submit"
        className="auth-form__submit"
        disabled={isLoading || socialLoading !== null}
      >
        {isLoading ? (
          <span className="auth-form__spinner" />
        ) : (
          'Sign In'
        )}
      </button>

      <a href="#" className="auth-form__forgot">Forgot password?</a>

      {/* Divider */}
      <div className="auth-form__divider">
        <span className="auth-form__divider-text">or continue with</span>
      </div>

      {/* Social Auth Buttons */}
      <div className="auth-form__social-buttons">
        <button
          type="button"
          className="auth-form__social-btn auth-form__social-btn--google"
          onClick={handleGoogleLogin}
          disabled={socialLoading !== null || isLoading}
          aria-label="Sign in with Google"
        >
          {socialLoading === 'google' ? (
            <span className="auth-form__spinner auth-form__spinner--small" />
          ) : (
            <>
              <svg className="auth-form__social-icon" width="18" height="18" viewBox="0 0 24 24">
                <path fill="#1F2937" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="auth-form__social-text">Google</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="auth-form__social-btn auth-form__social-btn--github"
          onClick={handleGitHubLogin}
          disabled={socialLoading !== null || isLoading}
          aria-label="Sign in with GitHub"
        >
          {socialLoading === 'github' ? (
            <span className="auth-form__spinner auth-form__spinner--small" />
          ) : (
            <>
              <svg className="auth-form__social-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="auth-form__social-text">GitHub</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default LoginForm