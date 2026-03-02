/**
 * ParticipationSection — Team size, eligibility, deadline, prizes, slots, contact info
 */

import type { EventFormData, FieldErrors } from './types'

interface Props {
  data: EventFormData
  errors: FieldErrors
  onChange: (field: keyof EventFormData, value: string | number) => void
}

const ParticipationSection = ({ data, errors, onChange }: Props) => {
  /** Safely parse numeric input — returns '' for empty, number otherwise */
  const handleNumeric = (field: keyof EventFormData, val: string) => {
    if (val === '') {
      onChange(field, '')
      return
    }
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 0) onChange(field, n)
  }

  return (
    <section className="aef-section" id="participation">
      <div className="aef-section__header">
        <span className="aef-section__number">04</span>
        <div>
          <h2 className="aef-section__title">Participation Details</h2>
          <p className="aef-section__subtitle">Configure registration settings and contact information</p>
        </div>
      </div>

      <div className="aef-section__body">
        {/* ── Team Size ────────────────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-teamMin">
            👥 Min Team Size <span className="aef-required">*</span>
          </label>
          <input
            id="aef-teamMin"
            type="number"
            min={1}
            className={`aef-input ${errors.teamSizeMin ? 'aef-input--error' : ''}`}
            placeholder="e.g. 1"
            value={data.teamSizeMin}
            onChange={e => handleNumeric('teamSizeMin', e.target.value)}
          />
          {errors.teamSizeMin && <span className="aef-error">{errors.teamSizeMin}</span>}
        </div>

        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-teamMax">
            👥 Max Team Size <span className="aef-required">*</span>
          </label>
          <input
            id="aef-teamMax"
            type="number"
            min={1}
            className={`aef-input ${errors.teamSizeMax ? 'aef-input--error' : ''}`}
            placeholder="e.g. 4"
            value={data.teamSizeMax}
            onChange={e => handleNumeric('teamSizeMax', e.target.value)}
          />
          {errors.teamSizeMax && <span className="aef-error">{errors.teamSizeMax}</span>}
        </div>

        {/* ── Eligibility ──────────────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label" htmlFor="aef-eligibility">
            🎓 Eligibility <span className="aef-required">*</span>
          </label>
          <input
            id="aef-eligibility"
            type="text"
            className={`aef-input ${errors.eligibility ? 'aef-input--error' : ''}`}
            placeholder="e.g. All B.Tech students (any branch, any year)"
            value={data.eligibility}
            onChange={e => onChange('eligibility', e.target.value)}
          />
          {errors.eligibility && <span className="aef-error">{errors.eligibility}</span>}
        </div>

        {/* ── Registration Deadline ────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-deadline">
            📅 Registration Deadline <span className="aef-required">*</span>
          </label>
          <input
            id="aef-deadline"
            type="date"
            className={`aef-input ${errors.registrationDeadline ? 'aef-input--error' : ''}`}
            value={data.registrationDeadline}
            onChange={e => onChange('registrationDeadline', e.target.value)}
          />
          {errors.registrationDeadline && <span className="aef-error">{errors.registrationDeadline}</span>}
        </div>

        {/* ── Prize Pool ───────────────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-prize">
            🏆 Prize Pool (₹)
          </label>
          <input
            id="aef-prize"
            type="number"
            min={0}
            className="aef-input"
            placeholder="e.g. 50000"
            value={data.prizePool}
            onChange={e => handleNumeric('prizePool', e.target.value)}
          />
        </div>

        {/* ── Slots Available ──────────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-slots">
            🎫 Slots Available
          </label>
          <input
            id="aef-slots"
            type="number"
            min={1}
            className="aef-input"
            placeholder="e.g. 200"
            value={data.totalSlots}
            onChange={e => handleNumeric('totalSlots', e.target.value)}
          />
        </div>

        {/* ── Spacer for grid alignment ────────────────── */}
        <div className="aef-field aef-field--half" />

        {/* ── Contact Separator ────────────────────────── */}
        <div className="aef-field aef-field--full">
          <div className="aef-divider">
            <span className="aef-divider__text">Contact Information</span>
          </div>
        </div>

        {/* ── Contact Name ─────────────────────────────── */}
        <div className="aef-field aef-field--third">
          <label className="aef-label" htmlFor="aef-contactName">
            Contact Name <span className="aef-required">*</span>
          </label>
          <input
            id="aef-contactName"
            type="text"
            className={`aef-input ${errors.contactName ? 'aef-input--error' : ''}`}
            placeholder="e.g. Mr. Aravind K"
            value={data.contactName}
            onChange={e => onChange('contactName', e.target.value)}
          />
          {errors.contactName && <span className="aef-error">{errors.contactName}</span>}
        </div>

        {/* ── Contact Email ────────────────────────────── */}
        <div className="aef-field aef-field--third">
          <label className="aef-label" htmlFor="aef-contactEmail">
            Contact Email <span className="aef-required">*</span>
          </label>
          <input
            id="aef-contactEmail"
            type="email"
            className={`aef-input ${errors.contactEmail ? 'aef-input--error' : ''}`}
            placeholder="e.g. csbs.vitb@gmail.com"
            value={data.contactEmail}
            onChange={e => onChange('contactEmail', e.target.value)}
          />
          {errors.contactEmail && <span className="aef-error">{errors.contactEmail}</span>}
        </div>

        {/* ── Contact Phone ────────────────────────────── */}
        <div className="aef-field aef-field--third">
          <label className="aef-label" htmlFor="aef-contactPhone">
            Contact Phone
          </label>
          <input
            id="aef-contactPhone"
            type="tel"
            className={`aef-input ${errors.contactPhone ? 'aef-input--error' : ''}`}
            placeholder="e.g. +91 98765 43210"
            value={data.contactPhone}
            onChange={e => onChange('contactPhone', e.target.value)}
          />
          {errors.contactPhone && <span className="aef-error">{errors.contactPhone}</span>}
        </div>
      </div>
    </section>
  )
}

export default ParticipationSection
