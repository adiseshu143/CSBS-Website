/**
 * BasicDetailsSection — Event title, tag, descriptions, banner, dates, time, location, organizer
 * Now uses Cloudinary for real-time banner upload with progress tracking.
 */

import { useRef } from 'react'
import type { EventFormData, FieldErrors } from './types'
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload'

interface Props {
  data: EventFormData
  errors: FieldErrors
  onChange: (field: keyof EventFormData, value: string | File | null) => void
}

/* ── Inline SVG icons ─────────────────────────────────── */
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

const MapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

const ImageIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const BasicDetailsSection = ({ data, errors, onChange }: Props) => {
  const { upload, uploading, progress, error: uploadError } = useCloudinaryUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) return
    // Validate size (5 MB max)
    if (file.size > 5 * 1024 * 1024) return

    // Show preview immediately
    onChange('bannerImage', file)
    const reader = new FileReader()
    reader.onload = () => onChange('bannerPreview', reader.result as string)
    reader.readAsDataURL(file)

    // Upload to Cloudinary in background
    const result = await upload(file, { folder: 'csbs/event-banners', tags: ['event', 'banner'] })
    if (result) {
      onChange('bannerCloudinaryUrl', result.secure_url)
      onChange('bannerPublicId', result.public_id)
    }
  }

  const removeBanner = () => {
    onChange('bannerImage', null)
    onChange('bannerPreview', '')
    onChange('bannerCloudinaryUrl', '')
    onChange('bannerPublicId', '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <section className="aef-section" id="basic-details">
      <div className="aef-section__header">
        <span className="aef-section__number">01</span>
        <div>
          <h2 className="aef-section__title">Basic Event Details</h2>
          <p className="aef-section__subtitle">Set up the core information about your event</p>
        </div>
      </div>

      <div className="aef-section__body">
        {/* ── Event Title ──────────────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label" htmlFor="aef-title">
            Event Title <span className="aef-required">*</span>
          </label>
          <input
            id="aef-title"
            type="text"
            className={`aef-input ${errors.title ? 'aef-input--error' : ''}`}
            placeholder="e.g. Tech Symposium 2026"
            value={data.title}
            onChange={e => onChange('title', e.target.value)}
            maxLength={120}
          />
          {errors.title && <span className="aef-error">{errors.title}</span>}
        </div>

        {/* ── Event Tag ────────────────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-tag">
            Event Tag <span className="aef-required">*</span>
          </label>
          <input
            id="aef-tag"
            type="text"
            className={`aef-input ${errors.tag ? 'aef-input--error' : ''}`}
            placeholder="e.g. SYMPOSIUM, HACKATHON"
            value={data.tag}
            onChange={e => onChange('tag', e.target.value)}
            maxLength={30}
          />
          {errors.tag && <span className="aef-error">{errors.tag}</span>}
        </div>

        {/* ── Organizer ────────────────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-organizer">
            <UserIcon /> Organizer Name <span className="aef-required">*</span>
          </label>
          <input
            id="aef-organizer"
            type="text"
            className={`aef-input ${errors.organizer ? 'aef-input--error' : ''}`}
            placeholder="e.g. Department of CSBS, VIT Bhimavaram"
            value={data.organizer}
            onChange={e => onChange('organizer', e.target.value)}
          />
          {errors.organizer && <span className="aef-error">{errors.organizer}</span>}
        </div>

        {/* ── Short Description ────────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label" htmlFor="aef-shortDesc">
            Short Description <span className="aef-required">*</span>
          </label>
          <textarea
            id="aef-shortDesc"
            className={`aef-textarea aef-textarea--sm ${errors.shortDescription ? 'aef-input--error' : ''}`}
            placeholder="A brief one-liner for event cards (max 200 characters)"
            value={data.shortDescription}
            onChange={e => onChange('shortDescription', e.target.value)}
            maxLength={200}
            rows={2}
          />
          <div className="aef-char-count">
            {data.shortDescription.length}/200
          </div>
          {errors.shortDescription && <span className="aef-error">{errors.shortDescription}</span>}
        </div>

        {/* ── Full Description ─────────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label" htmlFor="aef-fullDesc">
            Full Description <span className="aef-required">*</span>
          </label>
          <textarea
            id="aef-fullDesc"
            className={`aef-textarea ${errors.fullDescription ? 'aef-input--error' : ''}`}
            placeholder="Detailed event description shown on the event details page"
            value={data.fullDescription}
            onChange={e => onChange('fullDescription', e.target.value)}
            rows={5}
          />
          {errors.fullDescription && <span className="aef-error">{errors.fullDescription}</span>}
        </div>

        {/* ── Banner Upload ────────────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label">Event Banner Image</label>
          {data.bannerPreview ? (
            <div className="aef-banner-preview">
              <img src={data.bannerPreview} alt="Banner preview" className="aef-banner-preview__img" />
              {/* Upload progress overlay */}
              {uploading && (
                <div className="aef-banner-preview__progress-overlay">
                  <div className="aef-banner-preview__progress-bar">
                    <div className="aef-banner-preview__progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="aef-banner-preview__progress-text">Uploading… {progress}%</span>
                </div>
              )}
              {/* Upload success indicator */}
              {data.bannerCloudinaryUrl && !uploading && (
                <div className="aef-banner-preview__status aef-banner-preview__status--success">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Uploaded to cloud
                </div>
              )}
              {/* Upload error */}
              {uploadError && (
                <div className="aef-banner-preview__status aef-banner-preview__status--error">
                  ⚠️ {uploadError}
                </div>
              )}
              <button type="button" className="aef-banner-preview__remove" onClick={removeBanner} title="Remove banner" disabled={uploading}>
                ✕
              </button>
            </div>
          ) : (
            <label className="aef-upload-zone" htmlFor="aef-banner-input">
              <ImageIcon />
              <span className="aef-upload-zone__text">
                Click to upload or drag & drop
              </span>
              <span className="aef-upload-zone__hint">
                PNG, JPG, WEBP — max 5 MB • Uploaded to Cloudinary
              </span>
              <input
                id="aef-banner-input"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="aef-upload-zone__input"
                onChange={handleBannerChange}
              />
            </label>
          )}
        </div>

        {/* ── Dates row ────────────────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-startDate">
            <CalendarIcon /> Start Date <span className="aef-required">*</span>
          </label>
          <input
            id="aef-startDate"
            type="date"
            className={`aef-input ${errors.startDate ? 'aef-input--error' : ''}`}
            value={data.startDate}
            onChange={e => onChange('startDate', e.target.value)}
          />
          {errors.startDate && <span className="aef-error">{errors.startDate}</span>}
        </div>

        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-endDate">
            <CalendarIcon /> End Date
          </label>
          <input
            id="aef-endDate"
            type="date"
            className={`aef-input ${errors.endDate ? 'aef-input--error' : ''}`}
            value={data.endDate}
            onChange={e => onChange('endDate', e.target.value)}
          />
          {errors.endDate && <span className="aef-error">{errors.endDate}</span>}
        </div>

        {/* ── Times row ────────────────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-startTime">
            <ClockIcon /> Start Time <span className="aef-required">*</span>
          </label>
          <input
            id="aef-startTime"
            type="time"
            className={`aef-input ${errors.startTime ? 'aef-input--error' : ''}`}
            value={data.startTime}
            onChange={e => onChange('startTime', e.target.value)}
          />
          {errors.startTime && <span className="aef-error">{errors.startTime}</span>}
        </div>

        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-endTime">
            <ClockIcon /> End Time <span className="aef-required">*</span>
          </label>
          <input
            id="aef-endTime"
            type="time"
            className={`aef-input ${errors.endTime ? 'aef-input--error' : ''}`}
            value={data.endTime}
            onChange={e => onChange('endTime', e.target.value)}
          />
          {errors.endTime && <span className="aef-error">{errors.endTime}</span>}
        </div>

        {/* ── Location ─────────────────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label" htmlFor="aef-location">
            <MapIcon /> Event Location <span className="aef-required">*</span>
          </label>
          <input
            id="aef-location"
            type="text"
            className={`aef-input ${errors.location ? 'aef-input--error' : ''}`}
            placeholder="e.g. Main Auditorium, VIT Bhimavaram"
            value={data.location}
            onChange={e => onChange('location', e.target.value)}
          />
          {errors.location && <span className="aef-error">{errors.location}</span>}
        </div>
      </div>
    </section>
  )
}

export default BasicDetailsSection
