/**
 * AdminEventForm — Complete professional event creation form
 *
 * Intended for admin use only (routing protection to be added later).
 * Manages all form state, validation, and section orchestration.
 *
 * Sections:
 *   01. BasicDetailsSection  — title, tag, descriptions, banner, dates, location
 *   02. ProblemStatementSection — problem title, description, dynamic bullets
 *   03. RulesSection — time limit, tech stack, submission, judging
 *   04. ParticipationSection — team size, eligibility, deadline, prizes, contact
 */

import { useState, useCallback, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createEvent } from '../../api/eventApi'
import BasicDetailsSection from './BasicDetailsSection'
import ProblemStatementSection from './ProblemStatementSection'
import RulesSection from './RulesSection'
import ParticipationSection from './ParticipationSection'
import { INITIAL_FORM_DATA, type EventFormData, type FieldErrors } from './types'

/* ── SVG Icons ─────────────────────────────────────────── */
const CheckCircleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const RocketIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="aef-spinner-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
)

/* ── Sidebar navigation items ──────────────────────────── */
const NAV_ITEMS = [
  { id: 'basic-details', label: 'Basic Details', icon: '📋', number: '01' },
  { id: 'problem-statement', label: 'Problem Statement', icon: '🎯', number: '02' },
  { id: 'rules-constraints', label: 'Rules & Constraints', icon: '📐', number: '03' },
  { id: 'participation', label: 'Participation', icon: '👥', number: '04' },
]

/* ═══════════════════════════════════════════════════════════
   VALIDATION
   ═══════════════════════════════════════════════════════════ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validate = (data: EventFormData): FieldErrors => {
  const e: FieldErrors = {}

  // Basic Details
  if (!data.title.trim()) e.title = 'Event title is required'
  if (!data.tag.trim()) e.tag = 'Event tag is required'
  if (!data.organizer.trim()) e.organizer = 'Organizer name is required'
  if (!data.shortDescription.trim()) e.shortDescription = 'Short description is required'
  if (!data.fullDescription.trim()) e.fullDescription = 'Full description is required'
  if (!data.startDate) e.startDate = 'Start date is required'
  if (!data.startTime) e.startTime = 'Start time is required'
  if (!data.endTime) e.endTime = 'End time is required'
  if (!data.location.trim()) e.location = 'Location is required'

  // Date logic
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    e.endDate = 'End date cannot be before start date'
  }

  // Participation
  if (data.teamSizeMin === '' || data.teamSizeMin < 1) e.teamSizeMin = 'Min team size is required'
  if (data.teamSizeMax === '' || data.teamSizeMax < 1) e.teamSizeMax = 'Max team size is required'
  if (data.teamSizeMin !== '' && data.teamSizeMax !== '' && data.teamSizeMax < data.teamSizeMin) {
    e.teamSizeMax = 'Max cannot be less than min'
  }
  if (!data.eligibility.trim()) e.eligibility = 'Eligibility is required'
  if (!data.registrationDeadline) e.registrationDeadline = 'Registration deadline is required'
  if (!data.contactName.trim()) e.contactName = 'Contact name is required'
  if (!data.contactEmail.trim()) {
    e.contactEmail = 'Contact email is required'
  } else if (!EMAIL_RE.test(data.contactEmail)) {
    e.contactEmail = 'Enter a valid email address'
  }

  return e
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const AdminEventForm = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState<EventFormData>(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [createdEventId, setCreatedEventId] = useState('')
  const [activeSection, setActiveSection] = useState('basic-details')

  /* ── Generic field change handler ────────────────────── */
  const handleChange = useCallback((field: keyof EventFormData, value: string | number | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error on change
    setErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  /* ── Bullet point handlers ──────────────────────────── */
  const handleBulletChange = useCallback((index: number, value: string) => {
    setFormData(prev => {
      const bullets = [...prev.problemBullets]
      bullets[index] = value
      return { ...prev, problemBullets: bullets }
    })
  }, [])

  const addBullet = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      problemBullets: [...prev.problemBullets, ''],
    }))
  }, [])

  const removeBullet = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      problemBullets: prev.problemBullets.filter((_, i) => i !== index),
    }))
  }, [])

  /* ── Sidebar section click ──────────────────────────── */
  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  /* ── Form submit ────────────────────────────────────── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitSuccess(false)
    setSubmitError('')

    const fieldErrors = validate(formData)
    setErrors(fieldErrors)

    if (Object.keys(fieldErrors).length > 0) {
      // Scroll to the first error
      const firstKey = Object.keys(fieldErrors)[0]
      const el = document.getElementById(`aef-${firstKey}`) || document.getElementById('basic-details')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setIsSubmitting(true)

    try {
      // Upload banner + save event to Firestore
      const eventId = await createEvent(formData)
      setCreatedEventId(eventId)
      setSubmitSuccess(true)

      // Reset form after successful creation
      setFormData(INITIAL_FORM_DATA)
      setErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })

      // Auto-dismiss success after 8 seconds
      setTimeout(() => setSubmitSuccess(false), 8000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create event. Please try again.'
      setSubmitError(message)
      // Auto-dismiss error after 6 seconds
      setTimeout(() => setSubmitError(''), 6000)
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Reset form ─────────────────────────────────────── */
  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA)
    setErrors({})
    setSubmitSuccess(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="aef-page">
      {/* ── Diagonal Background ─────────────────────── */}
      <div className="aef-bg" aria-hidden="true">
        <div className="aef-bg__shape aef-bg__shape--orange" />
        <div className="aef-bg__shape aef-bg__shape--blue" />
        <div className="aef-bg__shape aef-bg__shape--dots" />
      </div>

      {/* ── Page Header ─────────────────────────────── */}
      <header className="aef-header">
        <div className="aef-header__content">
          <span className="aef-header__badge">🛡️ {user?.name || 'Admin'}</span>
          <h1 className="aef-header__title">Create New Event</h1>
          <p className="aef-header__subtitle">
            Fill in the details below to create a new event for Techie Blazers
          </p>
        </div>
      </header>

      {/* ── Success Toast ───────────────────────────── */}
      {submitSuccess && (
        <div className="aef-toast aef-toast--success">
          <CheckCircleIcon />
          <span>
            🎉 Event created successfully!{createdEventId && <> ID: <strong>{createdEventId}</strong></>}
          </span>
          <button className="aef-toast__close" onClick={() => setSubmitSuccess(false)}>✕</button>
        </div>
      )}

      {/* ── Error Toast ─────────────────────────────── */}
      {submitError && (
        <div className="aef-toast aef-toast--error">
          <span>❌ {submitError}</span>
          <button className="aef-toast__close" onClick={() => setSubmitError('')}>✕</button>
        </div>
      )}

      {/* ── Layout: Sidebar + Form ──────────────────── */}
      <div className="aef-layout">

        {/* Sticky sidebar navigation */}
        <nav className="aef-sidebar">
          <div className="aef-sidebar__card">
            <h3 className="aef-sidebar__heading">Sections</h3>
            <ul className="aef-sidebar__nav">
              {NAV_ITEMS.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`aef-sidebar__link ${activeSection === item.id ? 'aef-sidebar__link--active' : ''}`}
                    onClick={() => scrollToSection(item.id)}
                  >
                    <span className="aef-sidebar__link-icon">{item.icon}</span>
                    <span className="aef-sidebar__link-text">{item.label}</span>
                    <span className="aef-sidebar__link-num">{item.number}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Quick stats */}
            <div className="aef-sidebar__stats">
              <div className="aef-sidebar__stat">
                <span className="aef-sidebar__stat-val">{Object.keys(errors).length}</span>
                <span className="aef-sidebar__stat-label">Errors</span>
              </div>
              <div className="aef-sidebar__stat">
                <span className="aef-sidebar__stat-val">{data_completeness(formData)}%</span>
                <span className="aef-sidebar__stat-label">Complete</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main form area */}
        <form className="aef-form" onSubmit={handleSubmit} noValidate>
          <BasicDetailsSection
            data={formData}
            errors={errors}
            onChange={handleChange}
          />

          <ProblemStatementSection
            data={formData}
            errors={errors}
            onChange={handleChange}
            onBulletChange={handleBulletChange}
            onAddBullet={addBullet}
            onRemoveBullet={removeBullet}
          />

          <RulesSection
            data={formData}
            errors={errors}
            onChange={handleChange}
          />

          <ParticipationSection
            data={formData}
            errors={errors}
            onChange={handleChange}
          />

          {/* ── Form Actions ────────────────────────── */}
          <div className="aef-actions">
            <button
              type="button"
              className="aef-actions__btn aef-actions__btn--reset"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset Form
            </button>
            <button
              type="submit"
              className="aef-actions__btn aef-actions__btn--submit"
              disabled={isSubmitting || !!formData.bannerImage && !formData.bannerCloudinaryUrl && !!formData.bannerPreview}
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon />
                  Creating Event…
                </>
              ) : (
                <>
                  <RocketIcon />
                  Create Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Completeness helper ───────────────────────────────── */
function data_completeness(d: EventFormData): number {
  const requiredFields: (keyof EventFormData)[] = [
    'title', 'tag', 'organizer', 'shortDescription', 'fullDescription',
    'startDate', 'startTime', 'endTime', 'location',
    'eligibility', 'registrationDeadline', 'contactName', 'contactEmail',
  ]
  const numericRequired: (keyof EventFormData)[] = ['teamSizeMin', 'teamSizeMax']

  let filled = 0
  const total = requiredFields.length + numericRequired.length

  for (const f of requiredFields) {
    if (typeof d[f] === 'string' && (d[f] as string).trim()) filled++
  }
  for (const f of numericRequired) {
    if (d[f] !== '' && d[f] !== 0) filled++
  }

  return Math.round((filled / total) * 100)
}

export default AdminEventForm
