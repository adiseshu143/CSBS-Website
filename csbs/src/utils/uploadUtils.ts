/**
 * Upload Utilities for Cloudinary
 * Handles profile images and resume uploads
 * Uses unsigned upload preset for both images and PDFs
 */

interface CloudinaryResponse {
  secure_url: string
  public_id: string
  format?: string
  width?: number
  height?: number
  size?: number
}

interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

// Cloudinary configuration — Read from environment variables
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'REDACTED_CLOUDINARY_CLOUD_NAME'
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'csbs_unsigned'

/**
 * Upload profile image to Cloudinary
 * Supports: jpg, png, webp
 * Max size: 5MB
 * Uses /auto/upload endpoint for resource type detection
 */
export const uploadProfileImage = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryResponse> => {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Supported: JPG, PNG, WebP')
  }

  // Validate file size (5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'csbs/profiles')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent,
          })
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        resolve({
          secure_url: response.secure_url,
          public_id: response.public_id,
          format: response.format,
          width: response.width,
          height: response.height,
        })
      } else {
        const errorResponse = xhr.responseText ? JSON.parse(xhr.responseText) : {}
        const errorMsg = errorResponse.error?.message || `Upload failed with status ${xhr.status}`
        console.error('Cloudinary Upload Error:', errorMsg, errorResponse)
        reject(new Error(errorMsg))
      }
    })

    xhr.addEventListener('error', () => {
      console.error('Cloudinary Upload Network Error')
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      console.warn('Cloudinary Upload Aborted')
      reject(new Error('Upload was cancelled'))
    })

    // Use /auto/upload endpoint for automatic resource type detection
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`
    xhr.open('POST', uploadUrl)
    xhr.send(formData)
  })
}

/**
 * Upload resume PDF to Cloudinary
 * Supports: PDF only
 * Max size: 10MB
 * Uses /auto/upload endpoint for resource type detection
 */
export const uploadResume = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryResponse> => {
  // Validate file type (PDF only)
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are supported')
  }

  // Validate file size (10MB for PDFs)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'csbs/resumes')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent,
          })
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        resolve({
          secure_url: response.secure_url,
          public_id: response.public_id,
          format: response.format,
          size: response.bytes,
        })
      } else {
        const errorResponse = xhr.responseText ? JSON.parse(xhr.responseText) : {}
        const errorMsg = errorResponse.error?.message || `Upload failed with status ${xhr.status}`
        console.error('Cloudinary Upload Error:', errorMsg, errorResponse)
        reject(new Error(errorMsg))
      }
    })

    xhr.addEventListener('error', () => {
      console.error('Cloudinary Upload Network Error')
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      console.warn('Cloudinary Upload Aborted')
      reject(new Error('Upload was cancelled'))
    })

    // Use /auto/upload endpoint for automatic resource type detection
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`
    xhr.open('POST', uploadUrl)
    xhr.send(formData)
  })
}

/**
 * Delete file from Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    // Note: Deletion requires server-side implementation with API key
    // This is a placeholder - implement on your backend
    console.log('Delete file from Cloudinary:', publicId)
  } catch (error) {
    console.error('Error deleting file:', error)
  }
}
