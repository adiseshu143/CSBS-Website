import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

interface RegisterFormProps {
  onSwitchToLogin?: () => void
}

const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
  const { register, isLoading } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) return setError('Full name is required')
    if (!email.trim()) return setError('Email is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Invalid email format')
    if (!rollNumber.trim()) return setError('Roll number is required')
    if (!department) return setError('Please select your department')
    if (!password) return setError('Password is required')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirmPassword) return setError('Passwords do not match')

    try {
      await register({
        fullName,
        email,
        rollNumber,
        department,
        password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    }
  }

  // Auto-switch to login 3 seconds after successful registration
  useEffect(() => {
    if (!success || !onSwitchToLogin) return
    const timer = setTimeout(() => onSwitchToLogin(), 3000)
    return () => clearTimeout(timer)
  }, [success, onSwitchToLogin])

  if (success) {
    return (
      <div className="auth-form auth-form--success">
        <div className="auth-form__success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="auth-form__title" style={{ color: '#22c55e' }}>Account Created!</h3>
        <p className="auth-form__subtitle">Welcome to Techie Blazers, {fullName}!</p>
        <p className="auth-form__subtitle">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form__header">
        <h2 className="auth-form__title">Create Account</h2>
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
          <label htmlFor="reg-name" className="auth-form__label">Full Name</label>
          <div className="auth-form__input-wrap">
            <svg className="auth-form__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <input
              id="reg-name"
              type="text"
              className="auth-form__input"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
              aria-required="true"
            />
          </div>
        </div>

        <div className="auth-form__group">
          <label htmlFor="reg-email" className="auth-form__label">Email</label>
          <div className="auth-form__input-wrap">
            <svg className="auth-form__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <input
              id="reg-email"
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

        <div className="auth-form__row">
          <div className="auth-form__group auth-form__group--half">
            <label htmlFor="reg-roll" className="auth-form__label">Roll Number</label>
            <div className="auth-form__input-wrap">
              <svg className="auth-form__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <input
                id="reg-roll"
                type="text"
                className="auth-form__input"
                placeholder="e.g. 22MH1A4201"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                required
                aria-required="true"
              />
            </div>
          </div>

          <div className="auth-form__group auth-form__group--half">
            <label htmlFor="reg-dept" className="auth-form__label">Department</label>
            <div className="auth-form__input-wrap">
              <select
                id="reg-dept"
                className="auth-form__input auth-form__select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                aria-required="true"
                style={{ fontWeight: department ? 400 : 600 }}
              >
                <option value="" disabled hidden>Select Branch</option>
                <option value="CSBS">CSBS</option>
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="AI&DS">AI&DS</option>
                <option value="AI&ML">AI&ML</option>
                <option value="CE">CE</option>
                <option value="MECH">MECH</option>
              </select>
            </div>
          </div>
        </div>

        <div className="auth-form__group">
          <label htmlFor="reg-password" className="auth-form__label">Password</label>
          <div className="auth-form__input-wrap">
            <svg className="auth-form__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-form__input"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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

        <div className="auth-form__group">
          <label htmlFor="reg-confirm" className="auth-form__label">Confirm Password</label>
          <div className="auth-form__input-wrap">
            <svg className="auth-form__input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <input
              id="reg-confirm"
              type={showPassword ? 'text' : 'password'}
              className="auth-form__input"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              aria-required="true"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="auth-form__submit auth-form__submit--register"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="auth-form__spinner" />
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  )
}

export default RegisterForm
