/**
 * Edit Profile Modal — Professional User Profile Editor
 * LinkedIn-style profile editing with image and resume upload
 *
 * Features:
 * - Edit name, username, bio
 * - Profile image upload with preview
 * - Resume PDF upload with download option
 * - Real-time character count
 * - Form validation
 * - Loading states
 */

import { useState, useRef, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { uploadProfileImage, uploadResume } from '../utils/uploadUtils'
import type { UserProfile } from '../api/authApi'

interface Props {
  user: UserProfile
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedUser: UserProfile) => void
}

interface FormState {
  name: string
  username: string
  bio: string
  profileImage: string | null
  profileImageFile: File | null
  resumeURL: string | null
  resumeFile: File | null
  resumeName: string | null
}

const EditProfileModal = ({ user, isOpen, onClose, onSuccess }: Props) => {
  const [form, setForm] = useState<FormState>({
    name: user.name,
    username: user.username || '',
    bio: user.bio || '',
    profileImage: user.profileImage || null,
    profileImageFile: null,
    resumeURL: user.resumeURL || null,
    resumeFile: null,
    resumeName: user.resumeName || null,
  })

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const imageInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  // Handle text input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  // Handle profile image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Invalid image format. Supported: JPG, PNG, WebP')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setForm(prev => ({
        ...prev,
        profileImage: event.target?.result as string,
        profileImageFile: file,
      }))
      setError('')
    }
    reader.readAsDataURL(file)
  }

  // Handle resume selection
  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate PDF only
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Resume size exceeds 10MB limit')
      return
    }

    setForm(prev => ({
      ...prev,
      resumeFile: file,
      resumeName: file.name,
    }))
    setError('')
  }

  // Remove profile image
  const handleRemoveImage = () => {
    setForm(prev => ({
      ...prev,
      profileImage: null,
      profileImageFile: null,
    }))
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  // Remove resume
  const handleRemoveResume = () => {
    setForm(prev => ({
      ...prev,
      resumeURL: null,
      resumeFile: null,
      resumeName: null,
    }))
    if (resumeInputRef.current) {
      resumeInputRef.current.value = ''
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      setError('Name is required')
      return false
    }

    if (form.name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return false
    }

    if (form.username && form.username.length > 30) {
      setError('Username must not exceed 30 characters')
      return false
    }

    if (form.bio && form.bio.length > 500) {
      setError('Bio must not exceed 500 characters')
      return false
    }

    return true
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const updates: Partial<UserProfile> = {
        name: form.name.trim(),
      }

      // Only add optional fields if they have values
      if (form.username.trim()) {
        updates.username = form.username.trim()
      }

      if (form.bio.trim()) {
        updates.bio = form.bio.trim()
      }

      // Upload profile image if selected
      if (form.profileImageFile) {
        const imageResponse = await uploadProfileImage(form.profileImageFile)
        updates.profileImage = imageResponse.secure_url
        updates.profileImagePublicId = imageResponse.public_id
      }

      // Upload resume if selected
      if (form.resumeFile) {
        const resumeResponse = await uploadResume(form.resumeFile)
        updates.resumeURL = resumeResponse.secure_url
        updates.resumePublicId = resumeResponse.public_id
        updates.resumeName = form.resumeFile.name
      }

      // Update Firestore
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, updates)

      // Update local state
      const updatedUser: UserProfile = {
        ...user,
        ...updates,
      }

      setSuccess('Profile updated successfully!')
      setTimeout(() => {
        onSuccess(updatedUser)
        onClose()
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  const bioLength = form.bio.length

  return (
    <div className="edit-profile-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="edit-profile-modal">
        {/* Header */}
        <div className="edit-profile__header">
          <h2 className="edit-profile__title">Edit Profile</h2>
          <button
            className="edit-profile__close"
            onClick={onClose}
            type="button"
            aria-label="Close"
            disabled={uploading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="edit-profile__form" onSubmit={handleSubmit}>
          {/* Profile Image Upload */}
          <div className="edit-profile__section">
            <h3 className="edit-profile__section-title">Profile Picture</h3>
            <div className="edit-profile__image-section">
              <div className="edit-profile__image-preview">
                {form.profileImage ? (
                  <img src={form.profileImage} alt="Profile preview" className="edit-profile__image-img" />
                ) : (
                  <div className="edit-profile__image-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
                <button
                  type="button"
                  className="edit-profile__image-edit-btn"
                  onClick={() => imageInputRef.current?.click()}
                  title="Change profile picture"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>

              <div className="edit-profile__image-info">
                <p className="edit-profile__label">Recommended: Square image, JPG/PNG/WebP</p>
                <p className="edit-profile__hint">Max size: 5MB</p>
                <button
                  type="button"
                  className="edit-profile__upload-btn"
                  onClick={() => imageInputRef.current?.click()}
                >
                  Choose Image
                </button>
                {form.profileImage && (
                  <button
                    type="button"
                    className="edit-profile__remove-btn"
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="edit-profile__file-input"
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="edit-profile__section">
            <label htmlFor="name" className="edit-profile__label">
              Full Name <span className="edit-profile__required">*</span>
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              maxLength={100}
              disabled={uploading}
              className="edit-profile__input"
              placeholder="Enter your full name"
            />
          </div>

          {/* Username */}
          <div className="edit-profile__section">
            <label htmlFor="username" className="edit-profile__label">
              Username <span className="edit-profile__optional">(Optional)</span>
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={form.username}
              onChange={handleInputChange}
              maxLength={30}
              disabled={uploading}
              className="edit-profile__input"
              placeholder="Create a unique username"
            />
            <p className="edit-profile__hint">{form.username.length}/30 characters</p>
          </div>

          {/* Bio */}
          <div className="edit-profile__section">
            <label htmlFor="bio" className="edit-profile__label">
              Bio <span className="edit-profile__optional">(Optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleInputChange}
              maxLength={500}
              disabled={uploading}
              className="edit-profile__textarea"
              placeholder="Tell us about yourself (LinkedIn style)"
              rows={4}
            />
            <p className="edit-profile__hint">{bioLength}/500 characters</p>
          </div>

          {/* Resume Upload */}
          <div className="edit-profile__section">
            <h3 className="edit-profile__section-title">Resume</h3>
            <div className="edit-profile__resume-section">
              {form.resumeName ? (
                <div className="edit-profile__resume-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V10z" />
                    <polyline points="14 2 14 10 22 10" />
                  </svg>
                  <div className="edit-profile__resume-info">
                    <p className="edit-profile__resume-name">{form.resumeName}</p>
                    <p className="edit-profile__hint">PDF • {Math.round((form.resumeFile?.size || 0) / 1024)} KB</p>
                  </div>
                  <button
                    type="button"
                    className="edit-profile__remove-btn"
                    onClick={handleRemoveResume}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  className="edit-profile__resume-upload"
                  onClick={() => resumeInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      resumeInputRef.current?.click()
                    }
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="edit-profile__resume-text">Click to upload resume</p>
                  <p className="edit-profile__hint">PDF only • Max 10MB</p>
                </div>
              )}
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleResumeSelect}
                className="edit-profile__file-input"
                disabled={uploading}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="edit-profile__error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="edit-profile__success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="edit-profile__actions">
            <button
              type="button"
              className="edit-profile__btn edit-profile__btn--cancel"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-profile__btn edit-profile__btn--submit"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="edit-profile__spinner" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProfileModal
