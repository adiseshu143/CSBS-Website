/**
 * useEvents — Real-time Firestore event listener hook
 *
 * Uses onSnapshot for live updates.
 * Falls back to DEMO_EVENTS if Firestore has no events yet.
 * Provides loading, error, and events state.
 */

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { EventData } from '../types/event'
import { DEMO_EVENTS } from '../types/event'

interface UseEventsReturn {
  events: EventData[]
  loading: boolean
  error: string | null
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Build query: order by createdAt descending (newest first)
    const eventsRef = collection(db, 'events')
    const q = query(eventsRef, orderBy('createdAt', 'desc'))

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const firestoreEvents: EventData[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EventData[]

        if (firestoreEvents.length > 0) {
          setEvents(firestoreEvents)
        } else {
          // No Firestore events yet → show demo events
          setEvents(DEMO_EVENTS)
        }
        setLoading(false)
        setError(null)
      },
      (err) => {
        // Silently handle transient Firestore listener errors (stream reconnects automatically)
        // Only log non-transport errors that indicate actual problems
        if (!err.message?.includes('transport') && !err.message?.includes('WebChannel')) {
          console.warn('Firestore events listener error:', err.message)
        }
        // Fall back to demo events on error
        setEvents(DEMO_EVENTS)
        setLoading(false)
        setError(null) // Don't show error to user — graceful fallback
      },
    )

    return () => unsubscribe()
  }, [])

  return { events, loading, error }
}
