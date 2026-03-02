import { useState } from 'react'
import LoginForm from '../components/LoginForm'
import RegisterForm from '../components/RegisterForm'

const AuthPage = () => {
  const [activePanel, setActivePanel] = useState<'login' | 'register'>('login')

  return (
    <div className="auth-page">
      {/* Background decorations — same as site */}
      <div className="auth-page__bg" aria-hidden="true">
        <div className="hero__bg-pattern" />
        <div className="hero__glow hero__glow--1" />
        <div className="hero__glow hero__glow--2" />
        <div className="auth-page__orb auth-page__orb--1" />
        <div className="auth-page__orb auth-page__orb--2" />
        <div className="auth-page__orb auth-page__orb--3" />
      </div>

      {/* Mobile tab switcher */}
      <div className="auth-page__tabs">
        <button
          className={`auth-page__tab ${activePanel === 'login' ? 'auth-page__tab--active' : ''}`}
          onClick={() => setActivePanel('login')}
        >
          Login
        </button>
        <button
          className={`auth-page__tab ${activePanel === 'register' ? 'auth-page__tab--active' : ''}`}
          onClick={() => setActivePanel('register')}
        >
          Register
        </button>
      </div>

      <div className="auth-page__container">
        {/* Login Panel */}
        <div className={`auth-page__panel auth-page__panel--login ${activePanel === 'login' ? 'auth-page__panel--active' : ''}`}>
          <LoginForm />
        </div>

        {/* Divider */}
        <div className="auth-page__divider" aria-hidden="true">
          <div className="auth-page__divider-line" />
          <span className="auth-page__divider-text">or</span>
          <div className="auth-page__divider-line" />
        </div>

        {/* Register Panel */}
        <div className={`auth-page__panel auth-page__panel--register ${activePanel === 'register' ? 'auth-page__panel--active' : ''}`}>
          <RegisterForm />
        </div>
      </div>

      {/* Back to home */}
      <a href="/" className="auth-page__back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Home
      </a>
    </div>
  )
}

export default AuthPage
