/**
 * RulesSection — Time limit, tech stack, submission details, judging criteria
 */

import type { EventFormData, FieldErrors } from './types'

interface Props {
  data: EventFormData
  errors: FieldErrors
  onChange: (field: keyof EventFormData, value: string) => void
}

const RulesSection = ({ data, errors, onChange }: Props) => {
  return (
    <section className="aef-section" id="rules-constraints">
      <div className="aef-section__header">
        <span className="aef-section__number">03</span>
        <div>
          <h2 className="aef-section__title">Rules & Constraints</h2>
          <p className="aef-section__subtitle">Set the boundaries and evaluation criteria</p>
        </div>
      </div>

      <div className="aef-section__body">
        {/* ── Time Limit ───────────────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-timeLimit">
            ⏱️ Time Limit
          </label>
          <input
            id="aef-timeLimit"
            type="text"
            className={`aef-input ${errors.timeLimit ? 'aef-input--error' : ''}`}
            placeholder="e.g. 24 hours"
            value={data.timeLimit}
            onChange={e => onChange('timeLimit', e.target.value)}
          />
          {errors.timeLimit && <span className="aef-error">{errors.timeLimit}</span>}
        </div>

        {/* ── Tech Stack ───────────────────────────────── */}
        <div className="aef-field aef-field--half">
          <label className="aef-label" htmlFor="aef-techStack">
            💻 Tech Stack Allowed
          </label>
          <input
            id="aef-techStack"
            type="text"
            className={`aef-input ${errors.techStack ? 'aef-input--error' : ''}`}
            placeholder="e.g. Any modern framework"
            value={data.techStack}
            onChange={e => onChange('techStack', e.target.value)}
          />
          {errors.techStack && <span className="aef-error">{errors.techStack}</span>}
        </div>

        {/* ── Submission Details ────────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label" htmlFor="aef-submission">
            📄 Submission Details
          </label>
          <input
            id="aef-submission"
            type="text"
            className={`aef-input ${errors.submission ? 'aef-input--error' : ''}`}
            placeholder="e.g. GitHub repo + live demo + PPT"
            value={data.submission}
            onChange={e => onChange('submission', e.target.value)}
          />
          {errors.submission && <span className="aef-error">{errors.submission}</span>}
        </div>

        {/* ── Judging Criteria ─────────────────────────── */}
        <div className="aef-field aef-field--full">
          <label className="aef-label" htmlFor="aef-judging">
            ⚖️ Judging Criteria
          </label>
          <input
            id="aef-judging"
            type="text"
            className={`aef-input ${errors.judgingCriteria ? 'aef-input--error' : ''}`}
            placeholder="e.g. Innovation, Feasibility, Design, Presentation"
            value={data.judgingCriteria}
            onChange={e => onChange('judgingCriteria', e.target.value)}
          />
          {errors.judgingCriteria && <span className="aef-error">{errors.judgingCriteria}</span>}
        </div>
      </div>
    </section>
  )
}

export default RulesSection
