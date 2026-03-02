/**
 * Connectivity Check Utility
 * Monitors network status and Apps Script availability
 * Provides real-time feedback for better UX
 */

interface ConnectivityStatus {
  isOnline: boolean
  appsScriptUrl: string
  appsScriptReachable: boolean
  firebaseReachable: boolean
  lastChecked: Date
}

let connectivityStatus: ConnectivityStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  appsScriptUrl: import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '',
  appsScriptReachable: true,
  firebaseReachable: true,
  lastChecked: new Date(),
}

/**
 * Check if Apps Script is reachable
 * Uses a HEAD request to avoid sending data
 */
export const checkAppsScriptConnectivity = async (): Promise<boolean> => {
  try {
    if (!connectivityStatus.appsScriptUrl) {
      console.warn('⚠️ Apps Script URL not configured')
      return false
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      // Use mode: 'no-cors' to avoid CORS preflight
      await fetch(connectivityStatus.appsScriptUrl, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      // With no-cors, we just check if the request was sent successfully
      console.log('✅ Apps Script is reachable')
      connectivityStatus.appsScriptReachable = true
      connectivityStatus.lastChecked = new Date()
      return true
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      // Silently handle — these are expected during initial connectivity check
      if (error?.name !== 'AbortError') {
        console.debug('[Connectivity] Apps Script check failed:', error?.message)
      }
      
      connectivityStatus.appsScriptReachable = false
      connectivityStatus.lastChecked = new Date()
      return false
    }
  } catch (error) {
    console.error('❌ Connectivity check error:', error)
    return false
  }
}

/**
 * Get current connectivity status
 */
export const getConnectivityStatus = (): ConnectivityStatus => {
  return {
    ...connectivityStatus,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  }
}

/**
 * Monitor network status changes
 */
export const initializeConnectivityMonitoring = (): void => {
  if (typeof window === 'undefined') return

  window.addEventListener('online', () => {
    console.log('📡 Network connection restored')
    connectivityStatus.isOnline = true
    // Recheck Apps Script availability
    checkAppsScriptConnectivity()
  })

  window.addEventListener('offline', () => {
    console.log('📡 Network connection lost')
    connectivityStatus.isOnline = false
  })

  // Initial check
  setTimeout(() => {
    checkAppsScriptConnectivity()
  }, 2000)
}

/**
 * Get user-friendly error message based on connectivity
 */
export const getConnectivityErrorMessage = (context: 'registration' | 'email' | 'auth'): string => {
  const status = getConnectivityStatus()

  if (!status.isOnline) {
    return 'No internet connection. Please check your network and try again.'
  }

  if (!status.appsScriptReachable) {
    switch (context) {
      case 'registration':
        return 'Event registration is temporarily unavailable. Your data will be saved locally and synced when the service is available.'
      case 'email':
        return 'Email delivery service is temporarily unavailable. Your request is queued and will be processed shortly.'
      case 'auth':
        return 'Authentication service is temporarily unavailable. Please try again in a moment.'
      default:
        return 'Service is temporarily unavailable.'
    }
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Format error message with connectivity context
 */
export const formatErrorWithConnectivity = (error: Error, context: 'registration' | 'email' | 'auth'): string => {
  const message = error?.message || 'Unknown error'
  const connectivityMsg = getConnectivityErrorMessage(context)

  // If error is network-related, use connectivity message
  if (
    message.includes('Failed to fetch') ||
    message.includes('Network') ||
    message.includes('timeout') ||
    message.includes('CORS')
  ) {
    return connectivityMsg
  }

  return message
}
