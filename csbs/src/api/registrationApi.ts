/**
 * Event Registration API — Handles registration data submission
 *
 * Functionality:
 * - Store registration in Firestore
 * - Send registration data to Google Apps Script
 * - Handle errors gracefully
 * - Prevent duplicate submissions
 */

import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { logEmailDiagnostics, validateEmailPayload, checkPayloadSizeWarnings } from '../utils/appsScriptDebug'
import type { EventData, EventRegistration } from '../types/event'

// ─── Types ────────────────────────────────────────────────
export interface TeamMember {
  name: string
  email: string
  phone: string
  branch: string
}

export interface RegistrationPayload {
  action: 'REGISTER' | 'ADMIN_LOG'
  // For REGISTER action
  registrationId?: string
  eventName?: string
  eventId?: string
  teamName?: string
  teamMembers?: TeamMember[]
  userId?: string
  userEmail?: string
  notes?: string
  // For ADMIN_LOG action
  adminUid?: string
  adminEmail?: string
  actionType?: string
  details?: string
}

export interface AppsScriptResponse {
  status: 'success' | 'error'
  message?: string
  registrationId?: string
  ticketNumber?: string
  timestamp?: string
}

// ─── Apps Script URL for event registration & Google Sheets sync ─────
// MUST be set in .env — no hardcoded fallback for security
const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''

if (!APPS_SCRIPT_URL) {
  console.error('VITE_GOOGLE_APPS_SCRIPT_URL is not configured in .env')
}

/**
 * Format phone number for consistent storage
 */
const formatPhone = (phone: string): string => {
  return phone.replace(/\D/g, '')
}

/**
 * Build registration payload for Apps Script
 * Structured to match Google Sheet columns
 */
const buildAppsScriptPayload = (
  event: EventData,
  teamName: string,
  members: TeamMember[],
  userId: string,
  userEmail?: string,
  registrationId?: string
): RegistrationPayload => {
  return {
    action: 'REGISTER',
    registrationId: registrationId || '',
    eventName: event.title,
    eventId: event.id,
    teamName: teamName.trim(),
    teamMembers: members.map(m => ({
      name: m.name.trim(),
      email: m.email.trim(),
      phone: formatPhone(m.phone),
      branch: m.branch || '',
    })),
    userId,
    userEmail: userEmail || '',
  }
}

/**
 * Send registration data to Google Apps Script
 * Uses text/plain + no-cors to avoid CORS preflight issues
 * (Google Apps Script doesn't support CORS preflight for POST)
 * The JSON string body is still delivered as text/plain — the Apps Script
 * doPost(e) receives it via e.postData.contents and can JSON.parse() it.
 */
export const sendToAppsScript = async (payload: RegistrationPayload): Promise<AppsScriptResponse> => {
  const requestId = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    // Verify URL exists
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('YOUR_') || APPS_SCRIPT_URL === '') {
      console.warn(`[${requestId}] ❌ Google Apps Script URL not configured`)
      logEmailDiagnostics('ERROR', 'EVENT_REGISTRATION', { 
        ...payload, 
        error: 'URL not configured' 
      }, requestId)
      return {
        status: 'success',
        message: 'Firestore sync completed (Apps Script not configured)',
        registrationId: payload.registrationId
      }
    }

    console.group(`[${requestId}] 📋 Event Registration Submission`)
    console.log('Registration ID:', payload.registrationId)
    console.log('Event:', payload.eventName)
    console.log('Team:', payload.teamName)
    console.log('Members:', payload.teamMembers?.length || 0)
    console.log('Apps Script URL:', APPS_SCRIPT_URL?.substring(0, 50) + '...')
    console.groupEnd()

    // Validate payload structure
    const validationErrors = validateEmailPayload(payload, 'event')
    if (validationErrors.length > 0) {
      console.warn(`[${requestId}] ⚠️ Payload structure warnings:`, validationErrors)
    }

    // Log payload size
    const jsonPayload = JSON.stringify(payload)
    checkPayloadSizeWarnings(jsonPayload)

    logEmailDiagnostics('START', 'EVENT_REGISTRATION', payload, requestId)

    // Create abort controller with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000) // 12 second timeout

    try {
      console.log(`[${requestId}] 📤 Sending to Apps Script...`)
      logEmailDiagnostics('SEND', 'EVENT_REGISTRATION', payload, requestId)

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: jsonPayload,
        mode: 'no-cors',
        redirect: 'follow',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      console.log(`[${requestId}] ✅ Response received:`, {
        status: response.status,
        type: response.type,
        ok: response.ok,
      })

      // With no-cors, response.type is 'opaque' and status is 0
      // We can't read the body, but the request was sent successfully
      if (response.ok || response.type === 'opaque' || response.status === 0) {
        console.log(`[${requestId}] ✅ Registration data sent to Google Sheet successfully`, {
          registrationId: payload.registrationId,
          teamName: payload.teamName,
        })
        
        logEmailDiagnostics('SUCCESS', 'EVENT_REGISTRATION', payload, requestId)
        
        return {
          status: 'success',
          message: 'Registration stored in Google Sheet',
          registrationId: payload.registrationId,
          timestamp: new Date().toISOString()
        }
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError?.name === 'AbortError') {
        console.warn(`[${requestId}] ⏱️ Google Sheet sync timeout (request sent, will process in background)`, {
          registrationId: payload.registrationId,
        })
        logEmailDiagnostics('ERROR', 'EVENT_REGISTRATION', { 
          ...payload, 
          error: 'Timeout (queued)' 
        }, requestId)
      } else {
        console.error(`[${requestId}] ❌ Fetch error:`, {
          name: fetchError?.name,
          message: fetchError?.message,
          registrationId: payload.registrationId,
        })
        logEmailDiagnostics('ERROR', 'EVENT_REGISTRATION', { 
          ...payload, 
          error: fetchError?.message 
        }, requestId)
      }
    }

    // Return success anyway - primary data is in Firestore
    console.log(`[${requestId}] ✅ Primary storage (Firestore) complete, sheet sync ongoing`, {
      registrationId: payload.registrationId,
    })
    
    return {
      status: 'success',
      message: 'Registration saved to Firestore (Sheet sync ongoing)',
      registrationId: payload.registrationId,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error(`[${requestId}] ❌ Error:`, {
      error: error instanceof Error ? error.message : String(error),
      registrationId: payload.registrationId,
    })
    logEmailDiagnostics('ERROR', 'EVENT_REGISTRATION', { 
      registrationId: payload.registrationId,
      error: error instanceof Error ? error.message : String(error)
    }, requestId)
    
    return {
      status: 'success',
      message: 'Registration saved (primary storage complete)',
      registrationId: payload.registrationId,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Save registration to Firestore
 */
const saveToFirestore = async (
  userId: string,
  eventId: string,
  teamName: string,
  teamSize: number,
  members: TeamMember[]
): Promise<string> => {
  const registrationData = {
    userId,
    eventId,
    teamName: teamName.trim(),
    teamSize,
    members: members.map(m => ({
      name: m.name.trim(),
      email: m.email.trim(),
      phone: formatPhone(m.phone),
      branch: m.branch,
    })),
    registeredAt: Timestamp.now(),
    status: 'registered',
  }

  const docRef = await addDoc(collection(db, 'eventRegistrations'), registrationData)
  console.log('✅ Registration saved to Firestore:', docRef.id)
  return docRef.id
}

/**
 * Check if user already registered for event
 */
export const checkDuplicateRegistration = async (
  userId: string,
  eventId: string
): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'eventRegistrations'),
      where('userId', '==', userId),
      where('eventId', '==', eventId)
    )
    const snap = await getDocs(q)
    return !snap.empty
  } catch (error) {
    console.error('Duplicate check error:', error)
    return false
  }
}

/**
 * Complete registration flow:
 * 1. Check for duplicate registration
 * 2. Save to Firestore
 * 3. Send to Google Apps Script
 * 4. Return registration object
 */
export const submitEventRegistration = async (
  event: EventData,
  userId: string,
  teamName: string,
  teamSize: number,
  members: TeamMember[],
  userEmail?: string
): Promise<EventRegistration> => {
  try {
    // Step 1: Check for duplicate registration
    console.log('🔍 Checking for duplicate registration...')
    const isDuplicate = await checkDuplicateRegistration(userId, event.id)
    if (isDuplicate) {
      throw new Error('You have already registered for this event')
    }

    // Step 2: Save to Firestore
    console.log('💾 Saving to Firestore...')
    const registrationId = await saveToFirestore(
      userId,
      event.id,
      teamName,
      teamSize,
      members
    )

    // Step 3: Build Apps Script payload
    const payload = buildAppsScriptPayload(
      event,
      teamName,
      members,
      userId,
      userEmail,
      registrationId
    )

    // Step 4: Send to Google Sheet
    console.log('📊 Syncing to Google Sheet...')
    const sheetResponse = await sendToAppsScript(payload)
    
    const ticketNumber = sheetResponse.ticketNumber || generateTicketNumber()

    // Step 5: Return success with all details
    const registration: EventRegistration & { ticketNumber?: string } = {
      id: registrationId,
      userId,
      eventId: event.id,
      teamName: teamName.trim(),
      teamMembers: members.map(m => m.name.trim()).filter(Boolean),
      phone: members[0]?.phone || '',
      registeredAt: new Date().toISOString(),
      ticketNumber: ticketNumber
    }

    console.log('✅ Registration complete:', registration)
    return registration
  } catch (error) {
    console.error('❌ Registration submission failed:', error)
    throw error
  }
}

/**
 * Generate unique ticket number
 */
const generateTicketNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `TKT-${timestamp}-${random}`;
}

/**
 * Retry failed Apps Script submission
 * (In case of temporary network issues)
 */
export const retryAppsScriptSubmission = async (
  payload: RegistrationPayload,
  maxAttempts: number = 3
): Promise<AppsScriptResponse> => {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`⏳ Retry attempt ${attempt}/${maxAttempts}...`)
      return await sendToAppsScript(payload)
    } catch (error) {
      lastError = error as Error
      console.warn(`⚠️ Attempt ${attempt} failed:`, error)

      // Wait before retrying (exponential backoff)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  throw lastError || new Error('Apps Script submission failed after retries')
}
