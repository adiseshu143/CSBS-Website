/**
 * ProblemStatementSection — Problem title, description, and dynamic bullet points
 */

import type { EventFormData, FieldErrors } from './types'

interface Props {
  data: EventFormData
  errors: FieldErrors
  onChange: (field: keyof EventFormData, value: string) => void
  onBulletChange: (index: number, value: string) => void
  onAddBullet: () => void
  onRemoveBullet: (index: number) => void
}

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const ProblemStatementSection = ({ data, errors, onChange, onBulletChange, onAddBullet, onRemoveBullet }: Props) => {
  return (
    <section className="aef-section" id="problem-statement">
      <div className="aef-section__header">
        <span className="aef-section__number">02</span>
        <div>
          <h2 className="aef-section__title">Problem Statement</h2>
          <p className="aef-section__subtitle">Define the challenge participants will tackle</p>
        </div>
      </div>

      <div className="aef-section__body">
        {/* ── Problem Title ────────────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label" htmlFor="aef-problemTitle">
            Problem Statement Title
          </label>
          <input
            id="aef-problemTitle"
            type="text"
            className={`aef-input ${errors.problemTitle ? 'aef-input--error' : ''}`}
            placeholder="e.g. Build an Innovative Business Solution"
            value={data.problemTitle}
            onChange={e => onChange('problemTitle', e.target.value)}
          />
          {errors.problemTitle && <span className="aef-error">{errors.problemTitle}</span>}
        </div>

        {/* ── Problem Description ──────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label" htmlFor="aef-problemDesc">
            Problem Description
          </label>
          <textarea
            id="aef-problemDesc"
            className="aef-textarea"
            placeholder="Describe the problem statement or challenge in detail"
            value={data.problemDescription}
            onChange={e => onChange('problemDescription', e.target.value)}
            rows={4}
          />
        </div>

        {/* ── Dynamic Bullet Points ────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label">Key Points / Requirements</label>
          <div className="aef-bullets">
            {data.problemBullets.map((bullet, idx) => (
              <div className="aef-bullet-row" key={idx}>
                <span className="aef-bullet-row__dot">{idx + 1}</span>
                <input
                  type="text"
                  className="aef-input aef-bullet-row__input"
                  placeholder={`Point ${idx + 1}`}
                  value={bullet}
                  onChange={e => onBulletChange(idx, e.target.value)}
                />
                {data.problemBullets.length > 1 && (
                  <button
                    type="button"
                    className="aef-bullet-row__remove"
                    onClick={() => onRemoveBullet(idx)}
                    title="Remove this point"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="aef-add-btn" onClick={onAddBullet}>
            <PlusIcon /> Add Point
          </button>
        </div>
      </div>
    </section>
  )
}

export default ProblemStatementSection
