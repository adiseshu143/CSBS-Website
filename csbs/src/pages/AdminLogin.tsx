import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { requestAdminAccessCode, getErrorMessage } from '../api/authApi'

/**
 * AdminLogin — OTP-based 2-step admin authentication
 * 
 * Step 1: Send OTP (email verification)
 * Step 2: Verify OTP + Login (password + access code)
 */

type Step = 'email-verification' | 'otp-verification'

const AdminLogin = () => {
  const {
    isAuthenticated,
    user,
    isLoading: authLoading,
    verifiedAdminCode,
    adminLogin: contextAdminLogin,
  } = useAuth()
  const navigate = useNavigate()

  // ── Step & UI state ─────────────────────────────────────
  const [step, setStep] = useState<Step>('email-verification')
  const [fadeKey, setFadeKey] = useState(0)

  // ── Email Verification ──────────────────────────────────
  const [email, setEmail] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [emailError, setEmailError] = useState('')


  // ── OTP Verification ───────────────────────────────────
  const [accessCode, setAccessCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpSuccess, setOtpSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Helper: change step with travel animation
  const goToStep = useCallback((newStep: Step) => {
    setIsTransitioning(true)
    // Let the travel animation play, then switch step
    setTimeout(() => {
      setFadeKey(k => k + 1)
      setStep(newStep)
      setIsTransitioning(false)
    }, 950)
  }, [])

  // Redirect if already verified admin
  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated && user?.role === 'admin' && verifiedAdminCode) {
      navigate('/admin/profile', { replace: true })
    }
  }, [authLoading, isAuthenticated, user, verifiedAdminCode, navigate])

  // ── Step 1: Send OTP ────────────────────────────────────
  const handleSendOTP = async (e: FormEvent) => {
    e.preventDefault()
    setEmailError('')

    const emailValue = email.trim()
    if (!emailValue) return setEmailError('Email is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) return setEmailError('Invalid email format.')

    setIsChecking(true)
    try {
      // Single unified call: checks admins collection, creates/signs-in account, generates code, sends email
      await requestAdminAccessCode(emailValue)

      // Move to OTP verification step
      goToStep('otp-verification')
    } catch (err) {
      setEmailError(getErrorMessage(err))
    } finally {
      setIsChecking(false)
    }
  }

  // ── Step 2: Verify OTP ──────────────────────────────────
  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault()
    setOtpError('')
    setOtpSuccess('')

    if (!accessCode.trim()) return setOtpError('Access code is required.')

    setIsSubmitting(true)
    try {
      await contextAdminLogin(email.trim(), accessCode.trim().toUpperCase())
      navigate('/admin/profile', { replace: true })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verification failed.'
      setOtpError(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="admin-login-page">
      {/* Pink Background */}
      <div className="admin-login-bg" aria-hidden="true">
        <div className="admin-login-bg__gradient" />
      </div>

      <div className="admin-login-wrapper">
        {/* Header — on pink background */}
        <div className="admin-login-header">
          <div className="admin-login-badge">
            <span className="admin-login-badge__dot" />
            AUTHORIZED ACCESS
          </div>
          <h1 className="admin-login-title">ADMIN PORTAL</h1>
          <p className="admin-login-subtitle">Secure OTP authentication for event management personnel</p>
        </div>

        {/* Main Card */}
        <div className="admin-login-card">
          {/* Step Indicator Bar */}
          <div className="admin-login-steps-bar">
            <div className="admin-login-steps">
              <div className={`admin-login-step ${step !== 'email-verification' ? 'admin-login-step--complete' : 'admin-login-step--active'}`}>
                <div className="admin-login-step__circle">
                  {step !== 'email-verification' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : '1'}
                </div>
                <span className="admin-login-step__label">SEND OTP</span>
              </div>

              <div className={`admin-login-step__connector ${isTransitioning ? 'admin-login-step__connector--traveling' : ''} ${step === 'otp-verification' ? 'admin-login-step__connector--done' : ''}`} />

              <div className={`admin-login-step ${step === 'otp-verification' ? 'admin-login-step--active' : ''}`}>
                <div className="admin-login-step__circle">2</div>
                <span className="admin-login-step__label">VERIFY</span>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="admin-login-card-body">

            {/* ═══ STEP 1: EMAIL VERIFICATION ═══ */}
            {step === 'email-verification' && (
              <div className="admin-login-form-section" key={`email-${fadeKey}`}>

                <div className="admin-login-form-area">
                  <div className="admin-login-form-heading">
                    <span className="admin-login-form-icon">🛡️</span>
                    <h2 className="admin-login-form-title">ELIGIBILITY CHECK</h2>
                  </div>
                  <p className="admin-login-form-desc">
                    Enter your admin email to receive an OTP access code.
                  </p>
                </div>

                {emailError && (
                  <div className="admin-login-alert admin-login-alert--error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {emailError}
                  </div>
                )}

                <form onSubmit={handleSendOTP} className="admin-login-form" noValidate>

                  <div className="admin-login-form-area">
                    <div className="admin-login-form-subtitle-row">
                      <span className="admin-login-subtitle-icon">📧</span>
                      <h3 className="admin-login-form-subtitle">EMAIL VERIFICATION</h3>
                    </div>
                    <div className="admin-login-divider" />

                    <div className="admin-login-field">
                      <label className="admin-login-label">Email Address</label>
                      <div className="admin-login-input-icon-wrapper">
                        <span className="admin-login-input-left-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                          </svg>
                        </span>
                        <input
                          type="email"
                          placeholder="yourname@vishnu.edu.in"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="admin-login-input"
                          disabled={isChecking}
                          autoComplete="email"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="admin-login-btn admin-login-btn--primary"
                    disabled={isChecking}
                  >
                    <span className="admin-login-btn__dot" />
                    {isChecking ? 'Sending OTP...' : 'Send Access Code'}
                  </button>
                </form>

                <button
                  type="button"
                  className="admin-login-back-link"
                  onClick={() => navigate('/')}
                >
                  ← Back to Home
                </button>
              </div>
            )}

            {/* ═══ STEP 2: OTP VERIFICATION ═══ */}
            {step === 'otp-verification' && (
              <div className="admin-login-form-section" key={`otp-${fadeKey}`}>

                <div className="admin-login-form-area">
                  <div className="admin-login-form-heading">
                    <span className="admin-login-form-icon">🔒</span>
                    <h2 className="admin-login-form-title">VERIFY ACCESS CODE</h2>
                  </div>
                  <p className="admin-login-form-desc">
                    Enter the access code sent to <strong>{email}</strong>
                  </p>
                </div>

                {otpSuccess && (
                  <div className="admin-login-alert admin-login-alert--success">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="16 12 12 8 8 12" />
                    </svg>
                    {otpSuccess}
                  </div>
                )}

                {otpError && (
                  <div className="admin-login-alert admin-login-alert--error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {otpError}
                  </div>
                )}

                <form onSubmit={handleVerifyOTP} className="admin-login-form" noValidate>

                  <div className="admin-login-form-area">
                    <div className="admin-login-form-subtitle-row">
                      <span className="admin-login-subtitle-icon">🔑</span>
                      <h3 className="admin-login-form-subtitle">ENTER ACCESS CODE</h3>
                    </div>
                    <div className="admin-login-divider" />

                    <div className="admin-login-field">
                      <label className="admin-login-label">Email</label>
                      <div className="admin-login-input-static">{email}</div>
                    </div>

                    <div className="admin-login-field">
                      <label className="admin-login-label">Access Code</label>
                      <input
                        type="text"
                        placeholder="CSBS-XXXX"
                        value={accessCode.toUpperCase()}
                        onChange={e => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
                        className="admin-login-input admin-login-input--code"
                        disabled={isSubmitting}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="admin-login-btn admin-login-btn--primary"
                    disabled={isSubmitting}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    {isSubmitting ? 'Verifying...' : 'Verify & Login'}
                  </button>
                </form>

                <div className="admin-login-form-actions">
                  <button
                    type="button"
                    className="admin-login-link"
                    onClick={() => {
                      goToStep('email-verification')
                      setOtpError('')
                      setOtpSuccess('')
                      setAccessCode('')
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="admin-login-link admin-login-link--muted"
                    onClick={() => navigate('/')}
                  >
                    Home →
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
