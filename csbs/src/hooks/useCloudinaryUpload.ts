/**
 * useCloudinaryUpload — Reusable React hook for Cloudinary uploads
 *
 * Manages upload state: progress, loading, error, result.
 * Works for images and videos.
 *
 * Usage:
 *   const { upload, uploading, progress, error, result, reset } = useCloudinaryUpload()
 *   const res = await upload(file, { folder: 'events/banners' })
 */

import { useState, useCallback } from 'react'
import {
  uploadToCloudinary,
  type CloudinaryUploadResult,
  type UploadOptions,
} from '../utils/cloudinaryUpload'

interface UseCloudinaryUploadReturn {
  /** Trigger an upload */
  upload: (file: File, options?: UploadOptions) => Promise<CloudinaryUploadResult | null>
  /** Whether an upload is in progress */
  uploading: boolean
  /** Upload progress 0–100 */
  progress: number
  /** Error message if upload failed */
  error: string | null
  /** Last successful upload result */
  result: CloudinaryUploadResult | null
  /** Reset all state */
  reset: () => void
}

export function useCloudinaryUpload(): UseCloudinaryUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CloudinaryUploadResult | null>(null)

  const reset = useCallback(() => {
    setUploading(false)
    setProgress(0)
    setError(null)
    setResult(null)
  }, [])

  const upload = useCallback(async (
    file: File,
    options: UploadOptions = {},
  ): Promise<CloudinaryUploadResult | null> => {
    setUploading(true)
    setProgress(0)
    setError(null)
    setResult(null)

    try {
      const res = await uploadToCloudinary(file, {
        ...options,
        onProgress: (pct) => {
          setProgress(pct)
          options.onProgress?.(pct)
        },
      })
      setResult(res)
      setProgress(100)
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  return { upload, uploading, progress, error, result, reset }
}
