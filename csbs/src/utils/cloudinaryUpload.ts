/**
 * cloudinaryUpload — Reusable Cloudinary upload utility
 *
 * Features:
 *   • Unsigned upload (no API secret needed)
 *   • Supports images + videos
 *   • File validation (type + size)
 *   • Upload progress callback
 *   • Returns { secure_url, public_id, resource_type }
 *
 * Usage:
 *   import { uploadToCloudinary } from '@/utils/cloudinaryUpload'
 *   const result = await uploadToCloudinary(file, { onProgress: (pct) => ... })
 */

import { CLOUDINARY_CONFIG, isCloudinaryConfigured } from './cloudinaryConfig'

/* ── Types ─────────────────────────────────────────────── */

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  resource_type: 'image' | 'video' | 'raw'
  format: string
  width?: number
  height?: number
  bytes: number
  original_filename: string
}

export interface UploadOptions {
  /** Folder path in Cloudinary (e.g. 'events/banners') */
  folder?: string
  /** Callback for upload progress 0–100 */
  onProgress?: (percent: number) => void
  /** Max file size in bytes (default 10MB for images, 50MB for videos) */
  maxSize?: number
  /** Custom tags for organization */
  tags?: string[]
}

/* ── Validation ────────────────────────────────────────── */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024  // 50 MB

export function getResourceType(file: File): 'image' | 'video' {
  if (file.type.startsWith('video/')) return 'video'
  return 'image'
}

export function validateFile(file: File, maxSize?: number): string | null {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

  if (!isImage && !isVideo) {
    return `Unsupported file type: ${file.type}. Allowed: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV`
  }

  const limit = maxSize ?? (isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE)
  if (file.size > limit) {
    const limitMB = Math.round(limit / (1024 * 1024))
    return `File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max: ${limitMB} MB`
  }

  return null
}

/* ── Upload Function ───────────────────────────────────── */

/**
 * Upload a single file to Cloudinary using unsigned upload preset.
 *
 * @param file - The file to upload (image or video)
 * @param options - Upload options (folder, progress callback, etc.)
 * @returns CloudinaryUploadResult with secure_url, public_id, resource_type
 * @throws Error if Cloudinary is not configured, validation fails, or upload fails
 */
export async function uploadToCloudinary(
  file: File,
  options: UploadOptions = {},
): Promise<CloudinaryUploadResult> {
  // 1. Check config
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.',
    )
  }

  // 2. Validate
  const validationError = validateFile(file, options.maxSize)
  if (validationError) {
    throw new Error(validationError)
  }

  // 3. Build FormData
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset)

  if (options.folder) {
    formData.append('folder', options.folder)
  }
  if (options.tags?.length) {
    formData.append('tags', options.tags.join(','))
  }

  // 4. Upload with progress tracking via XMLHttpRequest
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', CLOUDINARY_CONFIG.uploadUrl, true)

    // Progress tracking
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && options.onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100)
        options.onProgress(percent)
      }
    })

    // Success
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve({
            secure_url: data.secure_url,
            public_id: data.public_id,
            resource_type: data.resource_type,
            format: data.format,
            width: data.width,
            height: data.height,
            bytes: data.bytes,
            original_filename: data.original_filename,
          })
        } catch {
          reject(new Error('Failed to parse Cloudinary response'))
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText)
          reject(new Error(errData?.error?.message || `Upload failed (HTTP ${xhr.status})`))
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    })

    // Network error
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload. Please check your connection.'))
    })

    // Timeout
    xhr.timeout = 120_000 // 2 minutes
    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out. Please try again with a smaller file.'))
    })

    xhr.send(formData)
  })
}

/**
 * Upload multiple files to Cloudinary sequentially.
 * Returns array of results for successful uploads.
 */
export async function uploadMultipleToCloudinary(
  files: File[],
  options: UploadOptions & { onFileProgress?: (fileIndex: number, percent: number) => void } = {},
): Promise<CloudinaryUploadResult[]> {
  const results: CloudinaryUploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const result = await uploadToCloudinary(files[i], {
      ...options,
      onProgress: (pct) => options.onFileProgress?.(i, pct),
    })
    results.push(result)
  }

  return results
}
