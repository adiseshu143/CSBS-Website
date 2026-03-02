/**
 * Cloudinary Configuration
 *
 * Centralized config for Cloudinary integration.
 * Uses UNSIGNED upload preset — no API secret needed on frontend.
 *
 * Setup:
 *   1. Go to Cloudinary Dashboard → Settings → Upload → Upload presets
 *   2. Create a new preset with "Unsigned" signing mode
 *   3. Name it to match VITE_CLOUDINARY_UPLOAD_PRESET in .env
 */

export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
  get uploadUrl() {
    return `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`
  },
  /** Generate optimized delivery URL */
  optimizedUrl(publicId: string, opts?: { width?: number; quality?: string; format?: string }) {
    const w = opts?.width ? `w_${opts.width},` : ''
    const q = opts?.quality || 'auto'
    const f = opts?.format || 'auto'
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${w}q_${q},f_${f}/${publicId}`
  },
  /** Generate optimized video URL */
  optimizedVideoUrl(publicId: string, opts?: { width?: number; quality?: string }) {
    const w = opts?.width ? `w_${opts.width},` : ''
    const q = opts?.quality || 'auto'
    return `https://res.cloudinary.com/${this.cloudName}/video/upload/${w}q_${q}/${publicId}`
  },
} as const

/** Check if Cloudinary is configured */
export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CONFIG.cloudName && CLOUDINARY_CONFIG.uploadPreset)
}
