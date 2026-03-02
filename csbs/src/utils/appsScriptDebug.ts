/**
 * Apps Script Debugging & Diagnostics Utility
 * Helps track and debug Apps Script email delivery issues
 */

/**
 * Generate unique request ID for tracking
 */
const generateRequestId = (): string => {
  return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Log detailed email sending diagnostics
 */
export const logEmailDiagnostics = (
  action: 'START' | 'SEND' | 'SUCCESS' | 'ERROR',
  context: 'ACCESS_CODE' | 'EVENT_REGISTRATION',
  data: any,
  requestId?: string
): string => {
  const id = requestId || generateRequestId()
  const timestamp = new Date().toISOString()

  const logEntry = {
    action,
    context,
    requestId: id,
    timestamp,
    data: {
      email: data?.email || 'N/A',
      hasAccessCode: !!data?.accessCode,
      hasEventName: !!data?.eventName,
      payloadKeys: Object.keys(data || {}),
      dataSize: JSON.stringify(data).length,
    },
  }

  console.group(`[APPS_SCRIPT_DEBUG] ${action} - ${context}`)
  console.table(logEntry.data)
  console.log('Complete Log:', logEntry)
  console.groupEnd()

  // Store in sessionStorage for debugging
  try {
    const logs = JSON.parse(sessionStorage.getItem('appsScriptLogs') || '[]')
    logs.push(logEntry)
    // Keep last 50 logs
    sessionStorage.setItem('appsScriptLogs', JSON.stringify(logs.slice(-50)))
  } catch (e) {
    console.warn('Failed to store debug log:', e)
  }

  return id
}

/**
 * Verify Apps Script payload structure
 */
export const validateEmailPayload = (payload: any, type: 'admin' | 'event'): string[] => {
  const errors: string[] = []

  if (type === 'admin') {
    if (!payload.email) errors.push('Missing email')
    if (!payload.accessCode) errors.push('Missing accessCode')
    if (!payload.name) errors.push('Missing name')
    if (typeof payload.isFirstTime !== 'boolean') errors.push('isFirstTime must be boolean')
  } else if (type === 'event') {
    if (!payload.eventName) errors.push('Missing eventName')
    if (!payload.teamName) errors.push('Missing teamName')
    if (!Array.isArray(payload.teamMembers)) errors.push('teamMembers must be array')
  }

  return errors
}

/**
 * Get stored debug logs from session
 */
export const getStoredDebugLogs = (): any[] => {
  try {
    return JSON.parse(sessionStorage.getItem('appsScriptLogs') || '[]')
  } catch {
    return []
  }
}

/**
 * Clear debug logs
 */
export const clearDebugLogs = (): void => {
  try {
    sessionStorage.removeItem('appsScriptLogs')
    console.log('✅ Debug logs cleared')
  } catch (e) {
    console.warn('Failed to clear debug logs:', e)
  }
}

/**
 * Simulate Apps Script response handling
 * (useful for testing)
 */
export const mockAppsScriptResponse = (success: boolean, message: string): Response => {
  return new Response(
    JSON.stringify({
      success,
      message,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Format debug report as text
 */
export const formatDebugReport = (): string => {
  const logs = getStoredDebugLogs()
  const now = new Date().toISOString()

  let report = `\n${'='.repeat(70)}\n`
  report += `APPS SCRIPT DEBUG REPORT - ${now}\n`
  report += `${'='.repeat(70)}\n\n`

  report += `Total Events: ${logs.length}\n\n`

  // Count by action
  const actionCounts = logs.reduce(
    (acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  report += `Events by Action:\n`
  Object.entries(actionCounts).forEach(([action, count]) => {
    report += `  ${action}: ${count}\n`
  })

  report += `\nLast 5 Events:\n`
  report += `-`.repeat(70) + `\n`

  logs.slice(-5).forEach((log) => {
    report += `\n[${log.timestamp}] ${log.action} - ${log.context}\n`
    report += `  Request ID: ${log.requestId}\n`
    report += `  Email: ${log.data.email}\n`
    report += `  Payload Size: ${log.data.dataSize} bytes\n`
  })

  report += `\n` + `=`.repeat(70) + `\n`

  return report
}

/**
 * Log payload size warnings
 */
export const checkPayloadSizeWarnings = (payload: string): void => {
  const size = new Blob([payload]).size
  const sizeKB = (size / 1024).toFixed(2)

  if (size > 100 * 1024) {
    console.warn(`⚠️ Large payload detected: ${sizeKB} KB (>100KB)`)
  } else if (size > 50 * 1024) {
    console.warn(`⚠️ Medium payload: ${sizeKB} KB (>50KB)`)
  } else {
    console.log(`✅ Payload size OK: ${sizeKB} KB`)
  }
}
