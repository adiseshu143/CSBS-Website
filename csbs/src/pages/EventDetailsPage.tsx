/**
 * EventDetailsPage — Full event detail view with registration
 * Route: /events/:eventId
 *
 * Fetches event from Firestore (falls back to DEMO_EVENTS),
 * checks registration status, and handles registration via modal.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { getEventRegistrationCount } from '../api/eventApi'
import RegistrationModal from '../components/RegistrationModal'
import type { EventData, EventRegistration } from '../types/event'
import { DEMO_EVENTS } from '../types/event'

/* ── Helpers ───────────────────────────────────────────── */

/** Format ISO date → "March 15, 2026" */
const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Days remaining until a date */
const daysUntil = (iso: string): number => {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

/** Is the deadline passed? */
const isDeadlinePassed = (iso: string): boolean => new Date(iso).getTime() < Date.now()

/* ── Skeleton Loader ───────────────────────────────────── */
const EventSkeleton = () => (
  <div className="ed-page">
    <div className="ed-hero ed-hero--skeleton">
      <div className="ed-hero__shimmer" />
    </div>
    <div className="ed-layout">
      <div className="ed-main">
        {[1, 2, 3].map(i => (
          <div className="ed-card ed-card--skeleton" key={i}>
            <div className="ed-skel-line ed-skel-line--title" />
            <div className="ed-skel-line ed-skel-line--text" />
            <div className="ed-skel-line ed-skel-line--text ed-skel-line--short" />
          </div>
        ))}
      </div>
      <aside className="ed-sidebar">
        <div className="ed-card ed-card--skeleton">
          <div className="ed-skel-line ed-skel-line--title" />
          <div className="ed-skel-line ed-skel-line--text" />
          <div className="ed-skel-line ed-skel-line--btn" />
        </div>
      </aside>
    </div>
  </div>
)

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const EventDetailsPage = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated, openAuthModal } = useAuth()
  const isAdmin = user?.role === 'admin'

  // ── State ──────────────────────────────────────────────
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [teamCount, setTeamCount] = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  
  // Track if user clicked register button before login
  const wantsToRegister = useRef(false)
  const previousAuthState = useRef(isAuthenticated)

  // ── Fetch event by ID ──────────────────────────────────
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) { setError('Event not found'); setLoading(false); return }

      try {
        // 1. Try Firestore first
        const snap = await getDoc(doc(db, 'events', eventId))
        if (snap.exists()) {
          setEvent({ id: snap.id, ...snap.data() } as EventData)
        } else {
          // 2. Fall back to static demo data
          const demo = DEMO_EVENTS.find(e => e.id === eventId)
          if (demo) { setEvent(demo) }
          else { setError('Event not found') }
        }
      } catch {
        // Firestore may not be configured yet — fall back to demo
        const demo = DEMO_EVENTS.find(e => e.id === eventId)
        if (demo) { setEvent(demo) }
        else { setError('Failed to load event details') }
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  // ── Fetch real registration count ──────────────────────
  useEffect(() => {
    if (!eventId) return
    
    const fetchRegistrationCount = async () => {
      try {
        const stats = await getEventRegistrationCount(eventId)
        setTeamCount(stats.teamCount)
        setMemberCount(stats.memberCount)
      } catch (err) {
        console.error('Failed to fetch registration count:', err)
        setTeamCount(0)
        setMemberCount(0)
      }
    }

    fetchRegistrationCount()
    
    // Refresh registration count every 5 seconds
    const interval = setInterval(fetchRegistrationCount, 5000)
    return () => clearInterval(interval)
  }, [eventId])
  useEffect(() => {
    const checkRegistration = async () => {
      if (!user || !eventId) return
      setRegistrationLoading(true)
      try {
        const q = query(
          collection(db, 'eventRegistrations'),
          where('userId', '==', user.id),
          where('eventId', '==', eventId),
        )
        const snap = await getDocs(q)
        setIsRegistered(!snap.empty)
      } catch {
        // Silently fail — just don't show "already registered"
      } finally {
        setRegistrationLoading(false)
      }
    }

    checkRegistration()
  }, [user, eventId])

  // ── Registration success handler ───────────────────────
  const handleRegistrationSuccess = useCallback((_reg: EventRegistration) => {
    setIsRegistered(true)
    setShowModal(false)
    setToast('🎉 Registration successful! You\'re all set.')
    // Increment counts
    setTeamCount(prev => prev + 1)
    const newMembers = _reg.teamMembers?.length || 1
    setMemberCount(prev => prev + newMembers)
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ── Register button click handler ──────────────────────
  const handleRegisterClick = () => {
    if (!isAuthenticated) {
      // Mark that user wants to register after login
      wantsToRegister.current = true
      // Pass the current page URL as the intended route
      openAuthModal(window.location.pathname)
      return
    }
    setShowModal(true)
  }
  
  // ── Auto-open modal after successful login ─────────────
  useEffect(() => {
    // Check if user just logged in (was not authenticated, now is)
    const justLoggedIn = !previousAuthState.current && isAuthenticated
    previousAuthState.current = isAuthenticated
    
    if (justLoggedIn && wantsToRegister.current && !isRegistered) {
      // Small delay to ensure everything is settled
      setTimeout(() => {
        setShowModal(true)
        wantsToRegister.current = false
      }, 300)
    }
  }, [isAuthenticated, isRegistered])

  // ── Scroll to top on mount ─────────────────────────────
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [eventId])

  /* ── LOADING STATE ─────────────────────────────────────── */
  if (loading) return <EventSkeleton />

  /* ── ERROR STATE ───────────────────────────────────────── */
  if (error || !event) {
    return (
      <div className="ed-page">
        <div className="ed-error">
          <span className="ed-error__icon">😞</span>
          <h2 className="ed-error__title">{error || 'Event Not Found'}</h2>
          <p className="ed-error__desc">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <button className="ed-error__btn" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
    )
  }

  /* ── DERIVED VALUES ─────────────────────────────────────── */
  const deadlinePassed = isDeadlinePassed(event.registrationDeadline)
  const daysLeft = daysUntil(event.registrationDeadline)
  const slotsLeft = event.totalSlots
    ? event.totalSlots - teamCount
    : null
  const progressPct = event.totalSlots
    ? Math.min(100, (teamCount / event.totalSlots) * 100)
    : 0

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="ed-page">

      {/* ── Toast ─────────────────────────────────────── */}
      {toast && (
        <div className="ed-toast">
          <span>{toast}</span>
          <button className="ed-toast__close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
         SECTION 1 — Hero Banner
         ═══════════════════════════════════════════════════ */}
      <section className="ed-hero">
        {event.bannerImage ? (
          <img
            src={event.bannerImage}
            alt={event.title}
            className="ed-hero__img"
            loading="eager"
          />
        ) : (
          <div className="ed-hero__img ed-hero__img--placeholder" />
        )}
        <div className="ed-hero__overlay" />

        {/* Back button */}
        <Link to="/" className="ed-hero__back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Link>

        <div className="ed-hero__content">
          <span className="ed-hero__tag">{event.tag}</span>
          <h1 className="ed-hero__title">{event.title}</h1>
          <div className="ed-hero__meta">
            <span className="ed-hero__meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatDate(event.date)}
              {event.endDate && ` – ${formatDate(event.endDate)}`}
            </span>
            <span className="ed-hero__meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {event.location}
            </span>
          </div>
          {!deadlinePassed && (
            <span className="ed-hero__deadline-badge">
              ⏳ {daysLeft} day{daysLeft !== 1 ? 's' : ''} left to register
            </span>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
         TWO-COLUMN LAYOUT
         ═══════════════════════════════════════════════════ */}
      <div className="ed-layout">

        {/* ── Left: Details ──────────────────────────────── */}
        <main className="ed-main">

          {/* Section 2 — About Event */}
          <div className="ed-card">
            <div className="ed-card__header">
              <span className="ed-card__icon">📋</span>
              <h2 className="ed-card__title">About This Event</h2>
            </div>
            <p className="ed-card__text">{event.description}</p>
            <div className="ed-card__info-row">
              <div className="ed-card__info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{event.time}</span>
              </div>
              <div className="ed-card__info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                <span>Organized by {event.organizedBy}</span>
              </div>
            </div>
          </div>

          {/* Section 3 — Problem Statement */}
          {event.problemStatement && (
            <div className="ed-card">
              <div className="ed-card__header">
                <span className="ed-card__icon">🎯</span>
                <h2 className="ed-card__title">Problem Statement</h2>
              </div>
              <p className="ed-card__text">{event.problemStatement}</p>
              {event.problemBullets && event.problemBullets.length > 0 && (
                <ul className="ed-card__bullets">
                  {event.problemBullets.map((b, i) => (
                    <li className="ed-card__bullet" key={i}>
                      <span className="ed-card__bullet-dot" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Section 4 — Constraints */}
          {event.constraints && event.constraints.length > 0 && (
            <div className="ed-card">
              <div className="ed-card__header">
                <span className="ed-card__icon">📐</span>
                <h2 className="ed-card__title">Rules & Constraints</h2>
              </div>
              <div className="ed-constraints">
                {event.constraints.map((c, i) => (
                  <div className="ed-constraint" key={i}>
                    <span className="ed-constraint__icon">{c.icon}</span>
                    <div>
                      <span className="ed-constraint__label">{c.label}</span>
                      <span className="ed-constraint__value">{c.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5 — Participation Details */}
          <div className="ed-card">
            <div className="ed-card__header">
              <span className="ed-card__icon">👥</span>
              <h2 className="ed-card__title">Participation Details</h2>
            </div>
            <div className="ed-details-grid">
              <div className="ed-detail">
                <span className="ed-detail__icon">👨‍👩‍👧‍👦</span>
                <span className="ed-detail__label">Team Size</span>
                <span className="ed-detail__value">
                  {event.teamSizeMin === event.teamSizeMax
                    ? `${event.teamSizeMin} member${event.teamSizeMin > 1 ? 's' : ''}`
                    : `${event.teamSizeMin} – ${event.teamSizeMax} members`}
                </span>
              </div>
              <div className="ed-detail">
                <span className="ed-detail__icon">🎓</span>
                <span className="ed-detail__label">Eligibility</span>
                <span className="ed-detail__value">{event.eligibility}</span>
              </div>
              <div className="ed-detail">
                <span className="ed-detail__icon">📅</span>
                <span className="ed-detail__label">Registration Deadline</span>
                <span className="ed-detail__value">{formatDate(event.registrationDeadline)}</span>
              </div>
              {event.prizePool && (
                <div className="ed-detail">
                  <span className="ed-detail__icon">🏆</span>
                  <span className="ed-detail__label">Prize Pool</span>
                  <span className="ed-detail__value ed-detail__value--prize">{event.prizePool}</span>
                </div>
              )}
              <div className="ed-detail">
                <span className="ed-detail__icon">📧</span>
                <span className="ed-detail__label">Contact</span>
                <span className="ed-detail__value">
                  {event.contactName}
                  <br />
                  <a href={`mailto:${event.contactEmail}`} className="ed-detail__link">{event.contactEmail}</a>
                  {event.contactPhone && (
                    <>
                      <br />
                      <a href={`tel:${event.contactPhone}`} className="ed-detail__link">{event.contactPhone}</a>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* ── Right: Sticky Sidebar — Role-based ──────── */}
        <aside className="ed-sidebar">

          {isAdmin ? (
            /* ═══════════════════════════════════════════════
               ADMIN SIDEBAR — Management Panel
               ═══════════════════════════════════════════════ */
            <div className="ed-admin-panel">
              {/* Admin badge header */}
              <div className="ed-admin-panel__header">
                <div className="ed-admin-panel__badge-row">
                  <span className="ed-admin-panel__badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Admin Panel
                  </span>
                </div>
                <h3 className="ed-admin-panel__title">Event Overview</h3>
              </div>

              {/* Event quick stats */}
              <div className="ed-admin-panel__stats">
                <div className="ed-admin-panel__stat">
                  <span className="ed-admin-panel__stat-icon">👥</span>
                  <div>
                    <span className="ed-admin-panel__stat-num">{teamCount}</span>
                    <span className="ed-admin-panel__stat-label">Teams</span>
                  </div>
                </div>
                <div className="ed-admin-panel__stat">
                  <span className="ed-admin-panel__stat-icon">👤</span>
                  <div>
                    <span className="ed-admin-panel__stat-num">{memberCount}</span>
                    <span className="ed-admin-panel__stat-label">Members</span>
                  </div>
                </div>
                <div className="ed-admin-panel__stat">
                  <span className="ed-admin-panel__stat-icon">🎯</span>
                  <div>
                    <span className="ed-admin-panel__stat-num">{event.totalSlots || '∞'}</span>
                    <span className="ed-admin-panel__stat-label">Total Slots</span>
                  </div>
                </div>
                <div className="ed-admin-panel__stat">
                  <span className="ed-admin-panel__stat-icon">⏳</span>
                  <div>
                    <span className="ed-admin-panel__stat-num">{daysLeft > 0 ? daysLeft : 0}</span>
                    <span className="ed-admin-panel__stat-label">Days Left</span>
                  </div>
                </div>
              </div>

              {/* Capacity bar */}
              {event.totalSlots ? (
                <div className="ed-admin-panel__capacity">
                  <div className="ed-admin-panel__capacity-header">
                    <span>Capacity Filled</span>
                    <span className="ed-admin-panel__capacity-pct">{Math.round(progressPct)}%</span>
                  </div>
                  <div className="ed-admin-panel__capacity-bar">
                    <div
                      className={`ed-admin-panel__capacity-fill ${progressPct > 80 ? 'ed-admin-panel__capacity-fill--high' : ''}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="ed-admin-panel__capacity-text">
                    {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} remaining out of {event.totalSlots}
                  </span>
                </div>
              ) : null}

              {/* Event info */}
              <div className="ed-admin-panel__info">
                <div className="ed-admin-panel__info-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="ed-admin-panel__info-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Deadline: {formatDate(event.registrationDeadline)}</span>
                </div>
                <div className="ed-admin-panel__info-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{event.location?.split(',')[0] || event.location}</span>
                </div>
              </div>

              {/* Admin notice */}
              <div className="ed-admin-panel__notice">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Admins are not eligible to register for events.</span>
              </div>

              {/* Admin action buttons */}
              <div className="ed-admin-panel__actions">
                <button
                  className="ed-admin-panel__btn ed-admin-panel__btn--create"
                  onClick={() => navigate('/admin/create-event')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create New Event
                </button>
                <button
                  className="ed-admin-panel__btn ed-admin-panel__btn--dashboard"
                  onClick={() => navigate('/admin/dashboard')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Admin Dashboard
                </button>
              </div>

              {event.prizePool && (
                <div className="ed-admin-panel__prize">
                  <span>🏆</span>
                  <div>
                    <span className="ed-admin-panel__prize-label">Prize Pool</span>
                    <span className="ed-admin-panel__prize-value">{event.prizePool}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ═══════════════════════════════════════════════
               USER SIDEBAR — Registration Panel
               ═══════════════════════════════════════════════ */
            <div className="ed-reg-panel">
              <h3 className="ed-reg-panel__title">{event.title}</h3>

              <div className="ed-reg-panel__info">
                <div className="ed-reg-panel__row">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="ed-reg-panel__row">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Deadline: {formatDate(event.registrationDeadline)}</span>
                </div>
                <div className="ed-reg-panel__row">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  <span>Team: {event.teamSizeMin}–{event.teamSizeMax} members</span>
                </div>
              </div>

              {/* Slots progress */}
              {slotsLeft !== null && (
                <div className="ed-reg-panel__slots">
                  <div className="ed-reg-panel__slots-bar">
                    <div className="ed-reg-panel__slots-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <span className="ed-reg-panel__slots-text">
                    {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} remaining
                  </span>
                </div>
              )}

              {/* Registration button */}
              {registrationLoading ? (
                <div className="ed-reg-panel__btn ed-reg-panel__btn--loading">
                  <div className="ed-spinner" /> Checking…
                </div>
              ) : deadlinePassed ? (
                <div className="ed-reg-panel__btn ed-reg-panel__btn--closed">
                  🚫 Registration Closed
                </div>
              ) : isRegistered ? (
                <div className="ed-reg-panel__btn ed-reg-panel__btn--registered">
                  ✅ Already Registered
                </div>
              ) : (
                <button className="ed-reg-panel__btn ed-reg-panel__btn--register" onClick={handleRegisterClick}>
                  Register for Event
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}

              {event.prizePool && (
                <div className="ed-reg-panel__prize">
                  <span className="ed-reg-panel__prize-icon">🏆</span>
                  <div>
                    <span className="ed-reg-panel__prize-label">Prize Pool</span>
                    <span className="ed-reg-panel__prize-value">{event.prizePool}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── Registration Modal ────────────────────────────── */}
      {showModal && event && user && (
        <RegistrationModal
          event={event}
          userId={user.id}
          onClose={() => setShowModal(false)}
          onSuccess={handleRegistrationSuccess}
        />
      )}
    </div>
  )
}

export default EventDetailsPage
