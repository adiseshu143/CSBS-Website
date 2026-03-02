/**
 * AdminEventForm — Form data types
 * Mirrors the Firestore EventData shape for seamless backend integration later.
 */

export interface ConstraintFormItem {
  icon: string
  label: string
  value: string
}

export interface EventFormData {
  /* ── Basic Details ─────────────────────────────────── */
  title: string
  tag: string
  shortDescription: string
  fullDescription: string
  bannerImage: File | null
  bannerPreview: string
  /** Cloudinary secure_url after upload */
  bannerCloudinaryUrl: string
  /** Cloudinary public_id after upload */
  bannerPublicId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  location: string
  organizer: string

  /* ── Problem Statement ─────────────────────────────── */
  problemTitle: string
  problemDescription: string
  problemBullets: string[]

  /* ── Rules & Constraints ───────────────────────────── */
  timeLimit: string
  techStack: string
  submission: string
  judgingCriteria: string

  /* ── Participation Details ─────────────────────────── */
  teamSizeMin: number | ''
  teamSizeMax: number | ''
  eligibility: string
  registrationDeadline: string
  prizePool: number | ''
  totalSlots: number | ''
  contactName: string
  contactEmail: string
  contactPhone: string
}

export interface FieldErrors {
  [key: string]: string
}

/** Initial empty form state */
export const INITIAL_FORM_DATA: EventFormData = {
  title: '',
  tag: '',
  shortDescription: '',
  fullDescription: '',
  bannerImage: null,
  bannerPreview: '',
  bannerCloudinaryUrl: '',
  bannerPublicId: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  location: '',
  organizer: '',

  problemTitle: '',
  problemDescription: '',
  problemBullets: [''],

  timeLimit: '',
  techStack: '',
  submission: '',
  judgingCriteria: '',

  teamSizeMin: '',
  teamSizeMax: '',
  eligibility: '',
  registrationDeadline: '',
  prizePool: '',
  totalSlots: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
}
