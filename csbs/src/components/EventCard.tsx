/**
 * EventCard — Reusable event card with role-based rendering
 *
 * Admin: Shows management-focused card with stats, registrations, quick actions
 * User: Shows registration-focused card with "Register Now"
 * Handles missing banner images gracefully with gradient fallback.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deleteEvent } from '../api/eventApi'
import type { EventData } from '../types/event'

interface EventCardProps {
  event: EventData
  teamCount?: number
  memberCount?: number
}

/** Format ISO date → "Mar 15" */
const formatShortDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

/** Days remaining until a date */
const daysUntil = (iso: string): number => {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

/** Status badge color map */
const statusConfig: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'ec2-status--upcoming' },
  ongoing: { label: 'Live Now', className: 'ec2-status--ongoing' },
  completed: { label: 'Completed', className: 'ec2-status--completed' },
}

/** Tag → gradient map for fallback banners */
const tagGradients: Record<string, string> = {
  hackathon: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  workshop: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  symposium: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  seminar: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  competition: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
}

const getTagGradient = (tag: string): string => {
  const key = tag?.toLowerCase() || ''
  return tagGradients[key] || 'linear-gradient(135deg, #EB4D28 0%, #2E3190 100%)'
}

const EventCard = ({ event, teamCount = 0, memberCount = 0 }: EventCardProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [imgError, setImgError] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const daysLeft = daysUntil(event.registrationDeadline)
  const slotsLeft = event.totalSlots
    ? event.totalSlots - teamCount
    : null
  const progressPct = event.totalSlots
    ? Math.min(100, (teamCount / event.totalSlots) * 100)
    : 0
  const status = statusConfig[event.status] || statusConfig.upcoming
  const hasBanner = event.bannerImage && !imgError

  // Handle event deletion — Firestore onSnapshot listener auto-removes the card
  const handleDeleteEvent = async () => {
    setDeleting(true)
    try {
      await deleteEvent(event.id, true) // true = also delete registrations
      setShowDeleteConfirm(false)
      // No reload needed — useEvents() real-time listener picks up the deletion automatically
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete event. Please try again.')
      setDeleting(false)
    }
  }

  /* ═══════════════════════════════════════════════════════
     ADMIN CARD — Management focused
     ═══════════════════════════════════════════════════════ */
  if (isAdmin) {
    return (
      <div className="adm-card">
        {/* Banner with gradient fallback */}
        <div
          className="adm-card__banner"
          style={!hasBanner ? { background: getTagGradient(event.tag) } : undefined}
        >
          {hasBanner ? (
            <img
              src={event.bannerImage}
              alt={event.title}
              className="adm-card__banner-img"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="adm-card__banner-fallback">
              <span className="adm-card__banner-fallback-icon">
                {event.tag === 'Hackathon' ? '💻' : event.tag === 'Workshop' ? '🔧' : event.tag === 'Symposium' ? '🎤' : '🚀'}
              </span>
            </div>
          )}
          <div className="adm-card__banner-overlay" />

          {/* Status badge */}
          <span className={`adm-card__status ${status.className.replace('ec2-', 'adm-')}`}>
            {event.status === 'ongoing' && <span className="adm-card__status-dot" />}
            {status.label}
          </span>

          {/* Tag pill */}
          <span className="adm-card__tag-badge">{event.tag}</span>
        </div>

        <div className="adm-card__body">
          {/* Title */}
          <h3 className="adm-card__title">{event.title}</h3>

          {/* Event meta info */}
          <div className="adm-card__meta">
            <span className="adm-card__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatShortDate(event.date)}, {new Date(event.date).getFullYear()}
            </span>
            <span className="adm-card__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {event.location?.split(',')[0] || 'TBD'}
            </span>
          </div>

          {/* Stats row */}
          <div className="adm-card__stats">
            <div className="adm-card__stat">
              <span className="adm-card__stat-num">{teamCount}</span>
              <span className="adm-card__stat-label">Teams</span>
            </div>
            <div className="adm-card__stat-divider" />
            <div className="adm-card__stat">
              <span className="adm-card__stat-num">{memberCount}</span>
              <span className="adm-card__stat-label">Members</span>
            </div>
            <div className="adm-card__stat-divider" />
            <div className="adm-card__stat">
              <span className="adm-card__stat-num adm-card__stat-num--deadline">{daysLeft > 0 ? `${daysLeft}d` : 'Closed'}</span>
              <span className="adm-card__stat-label">Deadline</span>
            </div>
          </div>

          {/* Capacity bar */}
          {event.totalSlots ? (
            <div className="adm-card__capacity">
              <div className="adm-card__capacity-header">
                <span className="adm-card__capacity-label">Registration Capacity</span>
                <span className="adm-card__capacity-pct">{Math.round(progressPct)}%</span>
              </div>
              <div className="adm-card__capacity-bar">
                <div
                  className={`adm-card__capacity-fill ${progressPct > 80 ? 'adm-card__capacity-fill--high' : ''}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Admin actions */}
          <div className="adm-card__actions">
            <button
              className="adm-card__btn adm-card__btn--primary"
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}`) }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View Details
            </button>
            <button
              className="adm-card__btn adm-card__btn--secondary"
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate('/admin/dashboard') }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
              Dashboard
            </button>
            <button
              className="adm-card__btn adm-card__btn--danger"
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
              disabled={deleting}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>

          {/* Delete confirmation modal */}
          {showDeleteConfirm && (
            <div className="adm-card__modal-overlay" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false) }}>
              <div className="adm-card__modal" onClick={(e) => e.stopPropagation()}>
                <div className="adm-card__modal-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className="adm-card__modal-title">Delete Event</h3>
                <p className="adm-card__modal-text">
                  Are you sure you want to delete <strong>{event.title}</strong>?
                  This will also delete all {teamCount} registration(s). This action cannot be undone.
                </p>
                <div className="adm-card__modal-actions">
                  <button
                    className="adm-card__modal-btn adm-card__modal-btn--cancel"
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="adm-card__modal-btn adm-card__modal-btn--delete"
                    type="button"
                    onClick={handleDeleteEvent}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete Event'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════
     USER CARD — Registration focused
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="ec2-card" onClick={() => navigate(`/events/${event.id}`)}>
      {/* Banner image with gradient fallback */}
      <div
        className="ec2-card__banner"
        style={!hasBanner ? { background: getTagGradient(event.tag) } : undefined}
      >
        {hasBanner ? (
          <img
            src={event.bannerImage}
            alt={event.title}
            className="ec2-card__banner-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="ec2-card__banner-fallback">
            <span className="ec2-card__banner-fallback-icon">
              {event.tag === 'Hackathon' ? '💻' : event.tag === 'Workshop' ? '🔧' : event.tag === 'Symposium' ? '🎤' : '🚀'}
            </span>
            <span className="ec2-card__banner-fallback-text">{event.tag || 'Event'}</span>
          </div>
        )}
        <div className="ec2-card__banner-overlay" />

        {/* Status badge */}
        {event.status !== 'upcoming' && (
          <span className={`ec2-status ${status.className}`}>
            {event.status === 'ongoing' && <span className="ec2-status__pulse" />}
            {status.label}
          </span>
        )}

        {/* Date badge */}
        <div className="ec2-card__date-badge">
          <span className="ec2-card__date-day">{formatShortDate(event.date)}</span>
          <span className="ec2-card__date-year">{new Date(event.date).getFullYear()}</span>
        </div>
      </div>

      {/* Card body */}
      <div className="ec2-card__body">
        <div className="ec2-card__meta">
          <span className="ec2-card__tag">{event.tag}</span>
          {daysLeft > 0 && event.status !== 'completed' && (
            <span className="ec2-card__countdown">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {daysLeft}d left
            </span>
          )}
        </div>

        <h3 className="ec2-card__title">{event.title}</h3>

        <p className="ec2-card__desc">
          {(() => {
            const text = event.shortDescription || event.description || event.title
            return text.length > 110 ? text.slice(0, 110) + '…' : text
          })()}
        </p>

        {/* Info chips */}
        <div className="ec2-card__chips">
          <span className="ec2-card__chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {event.location?.split(',')[0] || 'TBD'}
          </span>
          <span className="ec2-card__chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {event.teamSizeMin === event.teamSizeMax
              ? `${event.teamSizeMin} member${event.teamSizeMin > 1 ? 's' : ''}`
              : `${event.teamSizeMin}–${event.teamSizeMax}`}
          </span>
          {event.prizePool && (
            <span className="ec2-card__chip ec2-card__chip--prize">
              🏆 {event.prizePool}
            </span>
          )}
        </div>

        {/* Slots progress bar */}
        {slotsLeft !== null && (
          <div className="ec2-card__slots">
            <div className="ec2-card__slots-bar">
              <div
                className="ec2-card__slots-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="ec2-card__slots-text">
              {slotsLeft} / {event.totalSlots} slots open
            </span>
          </div>
        )}

        {/* User action button */}
        <div className="ec2-card__actions">
          <button
            className="ec2-card__btn ec2-card__btn--register"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/events/${event.id}`)
            }}
          >
            Register Now
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default EventCard
