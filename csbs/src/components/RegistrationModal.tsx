/**
 * Enhanced Registration Modal — Professional Event Registration Form
 *
 * Features:
 * - Dynamic team member fields based on team size
 * - Complete member details: name, email, phone, branch
 * - Comprehensive validation with inline error messages
 * - Google Apps Script integration for spreadsheet storage
 * - Success confirmation modal
 * - Loading states and error handling
 * - Responsive mobile-first design
 * - Professional UI with smooth transitions
 */

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { submitEventRegistration } from '../api/registrationApi'
import type { EventData, EventRegistration } from '../types/event'

interface TeamMember {
  name: string
  email: string
  phone: string
  branch: string
}

interface FieldError {
  field: string
  message: string
}

interface Props {
  event: EventData
  userId: string
  onClose: () => void
  onSuccess: (reg: EventRegistration) => void
}

const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CSBS', 'AIML', 'AIDS']

const RegistrationModal = ({ event, userId, onClose, onSuccess }: Props) => {
  const { user } = useAuth()

  // ─── Form State ────────────────────────────────────────
  const [teamName, setTeamName] = useState('')
  const [teamSize, setTeamSize] = useState(event.teamSizeMin)
  const [members, setMembers] = useState<TeamMember[]>(
    Array(event.teamSizeMin).fill(null).map(() => ({
      name: '',
      email: '',
      phone: '',
      branch: '',
    }))
  )
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registrationResult, setRegistrationResult] = useState<EventRegistration | null>(null)
  const [appsScriptError, setAppsScriptError] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // ─── Lifecycle ──────────────────────────────────────────
  useEffect(() => {
    firstInputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !showSuccessModal) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, submitting, showSuccessModal])

  // ─── Click Outside to Close ──────────────────────────────
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  // ─── Validation Helpers ─────────────────────────────────
  const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const isValidPhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 10
  }

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors.find(e => e.field === field)?.message
  }

  const addFieldError = (field: string, message: string) => {
    setFieldErrors(prev => [
      ...prev.filter(e => e.field !== field),
      { field, message }
    ])
  }

  const removeFieldError = (field: string) => {
    setFieldErrors(prev => prev.filter(e => e.field !== field))
  }

  // ─── Team Size Change ───────────────────────────────────
  const handleTeamSizeChange = (newSize: number) => {
    setTeamSize(newSize)
    const currentMembers = [...members]

    if (newSize > currentMembers.length) {
      // Add new members
      const newMembers = Array(newSize - currentMembers.length)
        .fill(null)
        .map(() => ({ name: '', email: '', phone: '', branch: '' }))
      setMembers([...currentMembers, ...newMembers])
    } else if (newSize < currentMembers.length) {
      // Remove excess members
      setMembers(currentMembers.slice(0, newSize))
    }
  }

  // ─── Member Field Update ────────────────────────────────
  const updateMember = (
    idx: number,
    field: keyof TeamMember,
    value: string
  ) => {
    const updated = [...members]
    updated[idx][field] = value
    setMembers(updated)

    // Clear error on change
    removeFieldError(`members.${idx}.${field}`)
  }

  // ─── Validation ──────────────────────────────────────────
  const validateForm = (): boolean => {
    const errors: FieldError[] = []

    // Team Name
    if (!teamName.trim()) {
      errors.push({ field: 'teamName', message: 'Team name is required' })
    } else if (teamName.trim().length < 2) {
      errors.push({ field: 'teamName', message: 'Team name must be at least 2 characters' })
    }

    // Team Size
    if (teamSize < event.teamSizeMin || teamSize > event.teamSizeMax) {
      errors.push({
        field: 'teamSize',
        message: `Team size must be between ${event.teamSizeMin} and ${event.teamSizeMax}`
      })
    }

    // Members
    members.forEach((member, idx) => {
      // In individual mode, name comes from teamName — skip separate validation
      if (!isIndividual) {
        // Name
        if (!member.name.trim()) {
          errors.push({
            field: `members.${idx}.name`,
            message: `Member ${idx + 1} name is required`
          })
        }
      }

      // Email
      if (!member.email.trim()) {
        errors.push({
          field: `members.${idx}.email`,
          message: `Member ${idx + 1} email is required`
        })
      } else if (!isValidEmail(member.email)) {
        errors.push({
          field: `members.${idx}.email`,
          message: `Member ${idx + 1} email is invalid`
        })
      }

      // Phone
      if (!member.phone.trim()) {
        errors.push({
          field: `members.${idx}.phone`,
          message: `Member ${idx + 1} phone is required`
        })
      } else if (!isValidPhone(member.phone)) {
        errors.push({
          field: `members.${idx}.phone`,
          message: `Member ${idx + 1} phone must be at least 10 digits`
        })
      }

      // Branch
      if (!member.branch) {
        errors.push({
          field: `members.${idx}.branch`,
          message: `Member ${idx + 1} branch is required`
        })
      }
    })

    setFieldErrors(errors)
    return errors.length === 0
  }

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      // Scroll to first error
      const errorElement = document.querySelector('[data-error-field]')
      errorElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return
    }

    setSubmitting(true)
    setAppsScriptError(false)

    try {
      // For individual events, copy the name into members[0]
      const finalMembers = [...members]
      if (isIndividual && finalMembers.length > 0) {
        finalMembers[0] = { ...finalMembers[0], name: teamName.trim() }
      }

      // Submit registration (Firestore + Apps Script)
      const registration = await submitEventRegistration(
        event,
        userId,
        teamName,
        teamSize,
        finalMembers,
        user?.email
      )

      setRegistrationResult(registration)
      setShowSuccessModal(true)
      // Do NOT auto-close - let user manually close or continue
    } catch (err) {
      const error = err as Error
      console.error('Registration error:', error)

      // Check if error is Apps Script related
      if (error.message.includes('Apps Script') || error.message.includes('spreadsheet')) {
        setAppsScriptError(true)
        // Still show success since Firestore saved
        if (registrationResult) {
          addFieldError('submit', 'Registration saved, but spreadsheet sync failed. Click retry to sync.')
        } else {
          addFieldError('submit', error.message)
        }
      } else {
        addFieldError('submit', error.message || 'Registration failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isIndividual = event.teamSizeMax === 1
  const submitError = getFieldError('submit')

  // ─── Success Modal ──────────────────────────────────────
  if (showSuccessModal && registrationResult) {
    return (
      <div className="ed-modal-overlay ed-modal-overlay--success">
        <div className="ed-modal ed-modal--success" role="dialog" aria-modal="true">
          <div className="ed-modal-success__content">
            {/* Success Icon with Animation */}
            <div className="ed-modal-success__icon-wrapper">
              <div className="ed-modal-success__icon">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>

            {/* Title & Message */}
            <h2 className="ed-modal-success__title">Registration Successful! 🎉</h2>
            <p className="ed-modal-success__message">
              {isIndividual 
                ? `You're all set for ${event.title}` 
                : `Congratulations! Your team "${registrationResult.teamName}" is registered`}
            </p>

            {/* Professional Ticket Card */}
            <div className="ed-modal-success__ticket-card">
              <div className="ed-modal-success__ticket-header">
                <span className="ed-modal-success__ticket-label">Registration Ticket</span>
                <span className="ed-modal-success__ticket-status">✓ Confirmed</span>
              </div>

              {/* Ticket Details Grid */}
              <div className="ed-modal-success__details">
                <div className="ed-modal-success__detail-item">
                  <p className="ed-modal-success__detail-label">Event</p>
                  <p className="ed-modal-success__detail-value">{event.title}</p>
                </div>
                
                <div className="ed-modal-success__detail-item">
                  <p className="ed-modal-success__detail-label">Registration ID</p>
                  <p className="ed-modal-success__detail-value ed-modal-success__detail-value--code">{registrationResult.id}</p>
                </div>

                {!isIndividual && (
                  <div className="ed-modal-success__detail-item">
                    <p className="ed-modal-success__detail-label">Team Name</p>
                    <p className="ed-modal-success__detail-value">{registrationResult.teamName}</p>
                  </div>
                )}

                {!isIndividual && (
                  <div className="ed-modal-success__detail-item">
                    <p className="ed-modal-success__detail-label">Team Size</p>
                    <p className="ed-modal-success__detail-value">{registrationResult.teamMembers.length} members</p>
                  </div>
                )}

                <div className="ed-modal-success__detail-item">
                  <p className="ed-modal-success__detail-label">Registered At</p>
                  <p className="ed-modal-success__detail-value">
                    {new Date(registrationResult.registeredAt).toLocaleString()}
                  </p>
                </div>

                {registrationResult.ticketNumber && (
                  <div className="ed-modal-success__detail-item">
                    <p className="ed-modal-success__detail-label">Ticket Number</p>
                    <p className="ed-modal-success__detail-value ed-modal-success__detail-value--code">{registrationResult.ticketNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Messages */}
            <div className="ed-modal-success__status-section">
              {!appsScriptError && (
                <div className="ed-modal-success__status ed-modal-success__status--success">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Data saved to Firestore and Google Spreadsheet</span>
                </div>
              )}

              {appsScriptError && (
                <div className="ed-modal-success__status ed-modal-success__status--warning">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Data saved to Firestore (Sheet sync is processing)</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="ed-modal-success__actions">
              <button
                className="ed-modal-success__btn ed-modal-success__btn--secondary"
                onClick={() => {
                  // Copy registration ID to clipboard
                  navigator.clipboard.writeText(registrationResult.id || '')
                  alert('Registration ID copied to clipboard!')
                }}
                title="Copy Registration ID"
              >
                📋 Copy Registration ID
              </button>
              <button
                className="ed-modal-success__btn ed-modal-success__btn--primary"
                onClick={() => {
                  setShowSuccessModal(false)
                  onSuccess(registrationResult)
                }}
              >
                Close & Continue
              </button>
            </div>

            {/* Extra Info */}
            <p className="ed-modal-success__footer-text">
              📧 A confirmation email has been sent to all team members
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ed-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="ed-modal ed-modal--enhanced" role="dialog" aria-modal="true" aria-labelledby="reg-title">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="ed-modal__header">
          <div>
            <h2 className="ed-modal__title" id="reg-title">
              {isIndividual ? 'Register' : 'Team Registration'}
            </h2>
            <p className="ed-modal__subtitle">{event.title}</p>
          </div>
          <button
            className="ed-modal__close"
            onClick={onClose}
            aria-label="Close"
            disabled={submitting}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Form ──────────────────────────────────────────── */}
        <form className="ed-modal__form" onSubmit={handleSubmit}>
          {/* Team Name */}
          <div className="ed-modal__field">
            <label className="ed-modal__label" htmlFor="reg-team">
              {isIndividual ? 'Your Name' : 'Team Name'} <span className="ed-modal__req">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="reg-team"
              type="text"
              className={`ed-modal__input ${getFieldError('teamName') ? 'ed-modal__input--error' : ''}`}
              placeholder={isIndividual ? 'John Doe' : 'e.g. Code Warriors'}
              value={teamName}
              onChange={e => {
                setTeamName(e.target.value)
                removeFieldError('teamName')
              }}
              maxLength={100}
              disabled={submitting}
              data-error-field={getFieldError('teamName') ? 'true' : undefined}
            />
            {getFieldError('teamName') && (
              <p className="ed-modal__error-text">{getFieldError('teamName')}</p>
            )}
          </div>

          {/* Team Size (only for team events) */}
          {!isIndividual && (
            <div className="ed-modal__field">
              <label className="ed-modal__label" htmlFor="reg-size">
                Team Size <span className="ed-modal__req">*</span>
              </label>
              <div className="ed-modal__team-size">
                <select
                  id="reg-size"
                  className={`ed-modal__select ${getFieldError('teamSize') ? 'ed-modal__select--error' : ''}`}
                  value={teamSize}
                  onChange={e => {
                    handleTeamSizeChange(parseInt(e.target.value))
                    removeFieldError('teamSize')
                  }}
                  disabled={submitting}
                >
                  {Array.from(
                    { length: event.teamSizeMax - event.teamSizeMin + 1 },
                    (_, i) => event.teamSizeMin + i
                  ).map(size => (
                    <option key={size} value={size}>
                      {size} {size === 1 ? 'member' : 'members'}
                    </option>
                  ))}
                </select>
                <p className="ed-modal__hint">
                  Including team lead
                </p>
              </div>
              {getFieldError('teamSize') && (
                <p className="ed-modal__error-text">{getFieldError('teamSize')}</p>
              )}
            </div>
          )}

          {/* Team Members */}
          {!isIndividual && members.length > 0 && (
            <div className="ed-modal__members-section">
              <div className="ed-modal__members-header">
                <h3 className="ed-modal__section-title">Team Members ({members.length})</h3>
                <p className="ed-modal__section-hint">
                  Include yourself as Member 1
                </p>
              </div>

              <div className="ed-modal__members-list">
                {members.map((member, idx) => (
                  <div key={idx} className="ed-modal__member-card">
                    <p className="ed-modal__member-label">Member {idx + 1}</p>

                    {/* Member Name */}
                    <div className="ed-modal__member-field">
                      <label className="ed-modal__member-input-label">
                        Name <span className="ed-modal__req">*</span>
                      </label>
                      <input
                        type="text"
                        className={`ed-modal__member-input ${
                          getFieldError(`members.${idx}.name`) ? 'ed-modal__member-input--error' : ''
                        }`}
                        placeholder="Full name"
                        value={member.name}
                        onChange={e => updateMember(idx, 'name', e.target.value)}
                        disabled={submitting}
                        data-error-field={getFieldError(`members.${idx}.name`) ? 'true' : undefined}
                      />
                      {getFieldError(`members.${idx}.name`) && (
                        <p className="ed-modal__error-text">{getFieldError(`members.${idx}.name`)}</p>
                      )}
                    </div>

                    {/* Member Email */}
                    <div className="ed-modal__member-field">
                      <label className="ed-modal__member-input-label">
                        Email <span className="ed-modal__req">*</span>
                      </label>
                      <input
                        type="email"
                        className={`ed-modal__member-input ${
                          getFieldError(`members.${idx}.email`) ? 'ed-modal__member-input--error' : ''
                        }`}
                        placeholder="name@example.com"
                        value={member.email}
                        onChange={e => updateMember(idx, 'email', e.target.value)}
                        disabled={submitting}
                        data-error-field={getFieldError(`members.${idx}.email`) ? 'true' : undefined}
                      />
                      {getFieldError(`members.${idx}.email`) && (
                        <p className="ed-modal__error-text">{getFieldError(`members.${idx}.email`)}</p>
                      )}
                    </div>

                    {/* Member Phone */}
                    <div className="ed-modal__member-field">
                      <label className="ed-modal__member-input-label">
                        Phone <span className="ed-modal__req">*</span>
                      </label>
                      <input
                        type="tel"
                        className={`ed-modal__member-input ${
                          getFieldError(`members.${idx}.phone`) ? 'ed-modal__member-input--error' : ''
                        }`}
                        placeholder="+91 98765 43210"
                        value={member.phone}
                        onChange={e => updateMember(idx, 'phone', e.target.value)}
                        disabled={submitting}
                        data-error-field={getFieldError(`members.${idx}.phone`) ? 'true' : undefined}
                      />
                      {getFieldError(`members.${idx}.phone`) && (
                        <p className="ed-modal__error-text">{getFieldError(`members.${idx}.phone`)}</p>
                      )}
                    </div>

                    {/* Member Branch */}
                    <div className="ed-modal__member-field">
                      <label className="ed-modal__member-input-label">
                        Branch / Department <span className="ed-modal__req">*</span>
                      </label>
                      <select
                        className={`ed-modal__member-input ed-modal__member-select ${
                          getFieldError(`members.${idx}.branch`) ? 'ed-modal__member-input--error' : ''
                        }`}
                        value={member.branch}
                        onChange={e => updateMember(idx, 'branch', e.target.value)}
                        disabled={submitting}
                        data-error-field={getFieldError(`members.${idx}.branch`) ? 'true' : undefined}
                      >
                        <option value="" disabled hidden>Select branch</option>
                        {BRANCHES.map(branch => (
                          <option key={branch} value={branch}>
                            {branch}
                          </option>
                        ))}
                      </select>
                      {getFieldError(`members.${idx}.branch`) && (
                        <p className="ed-modal__error-text">{getFieldError(`members.${idx}.branch`)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Registration - Phone & Branch */}
          {isIndividual && (
            <>
              {/* Phone */}
              <div className="ed-modal__field">
                <label className="ed-modal__label" htmlFor="reg-phone">
                  Phone Number <span className="ed-modal__req">*</span>
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  className={`ed-modal__input ${getFieldError('members.0.phone') ? 'ed-modal__input--error' : ''}`}
                  placeholder="+91 98765 43210"
                  value={members[0]?.phone || ''}
                  onChange={e => updateMember(0, 'phone', e.target.value)}
                  disabled={submitting}
                  data-error-field={getFieldError('members.0.phone') ? 'true' : undefined}
                />
                {getFieldError('members.0.phone') && (
                  <p className="ed-modal__error-text">{getFieldError('members.0.phone')}</p>
                )}
              </div>

              {/* Email */}
              <div className="ed-modal__field">
                <label className="ed-modal__label" htmlFor="reg-email">
                  Email <span className="ed-modal__req">*</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className={`ed-modal__input ${getFieldError('members.0.email') ? 'ed-modal__input--error' : ''}`}
                  placeholder="name@example.com"
                  value={members[0]?.email || ''}
                  onChange={e => updateMember(0, 'email', e.target.value)}
                  disabled={submitting}
                  data-error-field={getFieldError('members.0.email') ? 'true' : undefined}
                />
                {getFieldError('members.0.email') && (
                  <p className="ed-modal__error-text">{getFieldError('members.0.email')}</p>
                )}
              </div>

              {/* Branch */}
              <div className="ed-modal__field">
                <label className="ed-modal__label" htmlFor="reg-branch">
                  Branch / Department <span className="ed-modal__req">*</span>
                </label>
                <select
                  id="reg-branch"
                  className={`ed-modal__select ${getFieldError('members.0.branch') ? 'ed-modal__select--error' : ''}`}
                  value={members[0]?.branch || ''}
                  onChange={e => updateMember(0, 'branch', e.target.value)}
                  disabled={submitting}
                  data-error-field={getFieldError('members.0.branch') ? 'true' : undefined}
                >
                  <option value="" disabled hidden>Select branch</option>
                  {BRANCHES.map(branch => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
                {getFieldError('members.0.branch') && (
                  <p className="ed-modal__error-text">{getFieldError('members.0.branch')}</p>
                )}
              </div>
            </>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="ed-modal__error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="ed-modal__actions">
            <button
              type="button"
              className="ed-modal__btn ed-modal__btn--cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ed-modal__btn ed-modal__btn--submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="ed-spinner ed-spinner--sm" /> Registering…
                </>
              ) : (
                'Confirm Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegistrationModal
