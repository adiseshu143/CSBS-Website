/**
 * eventApi.ts — Firestore + Cloudinary operations for events
 *
 * Handles:
 *   • Banner image upload via Cloudinary (unsigned preset)
 *   • Event document creation in Firestore `events` collection
 *   • Maps form data → Firestore document shape (EventData)
 *   • Fetch real registration count from eventRegistrations collection
 *
 * Security:
 *   • Only authenticated admins can create events (enforced by Firestore rules)
 *   • Cloudinary uses unsigned upload preset (no API secret in frontend)
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { db, auth } from '../firebase/config'
import { uploadToCloudinary } from '../utils/cloudinaryUpload'
import type { EventFormData } from '../components/AdminEventForm/types'

/* ── Types ─────────────────────────────────────────────── */

/** The shape written to Firestore `events/{id}` */
export interface FirestoreEventDoc {
  title: string
  tag: string
  shortDescription: string
  description: string
  bannerImage: string
  bannerPublicId: string
  date: string
  endDate: string
  time: string
  location: string
  organizedBy: string

  problemStatement: string
  problemBullets: string[]

  constraints: { icon: string; label: string; value: string }[]

  teamSizeMin: number
  teamSizeMax: number
  eligibility: string
  registrationDeadline: string
  prizePool: string
  totalSlots: number
  contactName: string
  contactEmail: string
  contactPhone: string

  registeredCount: number
  status: 'upcoming' | 'ongoing' | 'completed'

  createdAt: ReturnType<typeof serverTimestamp>
  createdBy: string
}

/* ── Helpers ───────────────────────────────────────────── */

/** Convert 24h "HH:MM" → "9:00 AM" */
function formatTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}

/** Build the time string "9:00 AM – 5:00 PM" */
function buildTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

/* ═══════════════════════════════════════════════════════════
   uploadEventBanner — Upload image to Cloudinary
   ═══════════════════════════════════════════════════════════ */
export async function uploadEventBanner(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; publicId: string }> {
  const user = auth.currentUser
  if (!user) throw new Error('You must be logged in to upload files.')

  try {
    const result = await uploadToCloudinary(file, {
      folder: 'csbs/event-banners',
      tags: ['event', 'banner', user.uid],
      onProgress,
    })
    return { url: result.secure_url, publicId: result.public_id }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Banner upload failed: ${msg}`)
  }
}

/* ═══════════════════════════════════════════════════════════
   createEvent — Saves event document to Firestore
   ═══════════════════════════════════════════════════════════ */
export async function createEvent(
  formData: EventFormData,
): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('You must be logged in to create events.')

  // 1. Use pre-uploaded Cloudinary URL (uploaded via useCloudinaryUpload hook in the form)
  //    Falls back to uploading here if not pre-uploaded
  let bannerURL = formData.bannerCloudinaryUrl || ''
  let bannerPublicId = formData.bannerPublicId || ''

  if (!bannerURL && formData.bannerImage) {
    try {
      const result = await uploadEventBanner(formData.bannerImage)
      bannerURL = result.url
      bannerPublicId = result.publicId
    } catch (err: unknown) {
      console.warn('Banner upload skipped:', err instanceof Error ? err.message : err)
    }
  }

  // 2. Build constraints array from form fields
  const constraints: { icon: string; label: string; value: string }[] = []
  if (formData.timeLimit.trim()) {
    constraints.push({ icon: '⏱️', label: 'Time Limit', value: formData.timeLimit.trim() })
  }
  if (formData.techStack.trim()) {
    constraints.push({ icon: '💻', label: 'Tech Stack', value: formData.techStack.trim() })
  }
  if (formData.submission.trim()) {
    constraints.push({ icon: '📄', label: 'Submission', value: formData.submission.trim() })
  }
  if (formData.judgingCriteria.trim()) {
    constraints.push({ icon: '⚖️', label: 'Judging', value: formData.judgingCriteria.trim() })
  }

  // 3. Build the Firestore document
  const eventDoc: FirestoreEventDoc = {
    title: formData.title.trim(),
    tag: formData.tag.trim(),
    shortDescription: formData.shortDescription.trim(),
    description: formData.fullDescription.trim(),
    bannerImage: bannerURL,
    bannerPublicId: bannerPublicId,
    date: formData.startDate,
    endDate: formData.endDate || '',
    time: buildTimeRange(formData.startTime, formData.endTime),
    location: formData.location.trim(),
    organizedBy: formData.organizer.trim(),

    problemStatement: formData.problemDescription.trim(),
    problemBullets: formData.problemBullets.map(b => b.trim()).filter(Boolean),

    constraints,

    teamSizeMin: typeof formData.teamSizeMin === 'number' ? formData.teamSizeMin : 1,
    teamSizeMax: typeof formData.teamSizeMax === 'number' ? formData.teamSizeMax : 1,
    eligibility: formData.eligibility.trim(),
    registrationDeadline: formData.registrationDeadline,
    prizePool: formData.prizePool
      ? `₹${Number(formData.prizePool).toLocaleString('en-IN')}`
      : '',
    totalSlots: typeof formData.totalSlots === 'number' ? formData.totalSlots : 0,
    contactName: formData.contactName.trim(),
    contactEmail: formData.contactEmail.trim(),
    contactPhone: formData.contactPhone.trim(),

    registeredCount: 0,
    status: 'upcoming',

    createdAt: serverTimestamp(),
    createdBy: user.uid,
  }

  // 4. Write to Firestore — auto-generate ID
  try {
    const docRef = await addDoc(collection(db, 'events'), eventDoc)
    return docRef.id
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
      throw new Error(
        'Permission denied. Make sure you are logged in as an admin and Firestore rules are deployed. ' +
        'Run: firebase deploy --only firestore:rules'
      )
    }
    throw new Error(`Failed to save event: ${msg}`)
  }
}

/**
 * Fetch registration statistics for an event from Firestore
 * Returns both team count and total members count
 */
export async function getEventRegistrationCount(eventId: string): Promise<{ teamCount: number; memberCount: number }> {
  try {
    // Check if user is authenticated before querying
    if (!auth.currentUser) {
      console.warn('⚠️ User not authenticated - cannot fetch registrations')
      return { teamCount: 0, memberCount: 0 }
    }
    const q = query(
      collection(db, 'eventRegistrations'),
      where('eventId', '==', eventId)
    )
    const snapshot = await getDocs(q)
    
    let totalMembers = 0
    const teamCount = snapshot.size
    
    // Count total members across all teams
    snapshot.forEach((doc) => {
      const data = doc.data()
      const members = data.teamMembers || []
      totalMembers += members.length
    })
    
    return { teamCount, memberCount: totalMembers }
  } catch (error: any) {
    // Permission denied - user likely not authenticated
    if (error?.code === 'permission-denied') {
      console.warn('⚠️ Permission denied reading registrations. User may not be authenticated.')
      return { teamCount: 0, memberCount: 0 }
    }
    console.error('Error fetching registration count:', error)
    return { teamCount: 0, memberCount: 0 }
  }
}

/**
 * Delete an event and optionally its registrations
 * Only admins can delete events
 */
export async function deleteEvent(eventId: string, deleteRegistrations: boolean = true): Promise<void> {
  try {
    // Delete registrations for this event (optional)
    if (deleteRegistrations) {
      const q = query(
        collection(db, 'eventRegistrations'),
        where('eventId', '==', eventId)
      )
      const snapshot = await getDocs(q)
      
      // Delete each registration document
      const deletePromises = snapshot.docs.map(docSnap =>
        deleteDoc(doc(db, 'eventRegistrations', docSnap.id))
      )
      await Promise.all(deletePromises)
    }
    
    // Delete the event document
    await deleteDoc(doc(db, 'events', eventId))
  } catch (error) {
    console.error('Error deleting event:', error)
    throw new Error(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
