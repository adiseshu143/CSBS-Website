import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { uploadProfileImage } from '../utils/uploadUtils'
import EditProfileModal from '../components/EditProfileModal'
import type { UserProfile as UserProfileType } from '../api/authApi'
import './UserProfile.css'

const UserProfile = () => {
  const { user: authUser, logout, updateUserProfileImage } = useAuth()
  const navigate = useNavigate()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const [profileUser, setProfileUser] = useState<UserProfileType | null>(
    authUser
      ? {
          uid: authUser.id,
          name: authUser.name,
          email: authUser.email,
          rollNumber: authUser.rollNumber,
          department: authUser.department,
          role: authUser.role,
          createdAt: new Date().toISOString(),
          profileImage: authUser.profileImage,
          designation: authUser.designation,
          customRole: authUser.customRole,
        }
      : null
  )

  if (!authUser || !profileUser) {
    navigate('/auth')
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleProfileUpdate = (updatedUser: UserProfileType) => {
    setProfileUser(updatedUser)
    setIsEditModalOpen(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profileUser) return

    setAvatarUploading(true)
    setAvatarProgress(0)
    try {
      const result = await uploadProfileImage(file, (progress) => {
        setAvatarProgress(progress.percent)
      })

      await updateDoc(doc(db, 'users', profileUser.uid), {
        profileImage: result.secure_url,
        profileImagePublicId: result.public_id,
      })

      setProfileUser((prev) =>
        prev ? { ...prev, profileImage: result.secure_url } : null
      )
      updateUserProfileImage(result.secure_url)
    } catch (err) {
      console.error('Image upload failed:', err)
      alert(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setAvatarUploading(false)
      setAvatarProgress(0)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const initials = profileUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const joinDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="up">
      {/* ── Cover Banner ── */}
      <div className="up-cover">
        <div className="up-cover__gradient" />
        <div className="up-cover__mesh" />
        <div className="up-cover__dots" />
        <button className="up-cover__back" onClick={() => navigate('/')} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back to Home</span>
        </button>
      </div>

      {/* ── Profile Card (overlaps cover) ── */}
      <div className="up-card">
        <div className="up-card__header">
          {/* Avatar */}
          <div className="up-avatar">
            <div className="up-avatar__ring">
              <div className="up-avatar__circle">
                {profileUser.profileImage ? (
                  <img src={profileUser.profileImage} alt="Profile" className="up-avatar__img" width={128} height={128} loading="eager" decoding="async" />
                ) : (
                  <span className="up-avatar__initials">{initials}</span>
                )}
                {avatarUploading && (
                  <div className="up-avatar__uploading">
                    <svg className="up-avatar__spinner" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    <span className="up-avatar__percent">{avatarProgress}%</span>
                  </div>
                )}
              </div>
              <span className="up-avatar__online" />
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
            <button
              className="up-avatar__camera"
              onClick={() => avatarInputRef.current?.click()}
              title="Change photo"
              type="button"
              disabled={avatarUploading}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>

          {/* Identity */}
          <div className="up-identity">
            <h1 className="up-identity__name">{profileUser.name}</h1>
            {profileUser.username && (
              <p className="up-identity__handle">@{profileUser.username}</p>
            )}
            <div className="up-identity__tags">
              <span className="up-tag up-tag--role">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                Student
              </span>
              <span className="up-tag up-tag--dept">
                {profileUser.department || 'CSBS'}
              </span>
              <span className="up-tag up-tag--active">
                <span className="up-tag__dot" />
                Active
              </span>
            </div>
            {profileUser.bio && (
              <p className="up-identity__bio">{profileUser.bio}</p>
            )}
            <p className="up-identity__joined">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Member since {joinDate}
            </p>
          </div>

          {/* Edit Button */}
          <button
            className="up-edit-btn"
            onClick={() => setIsEditModalOpen(true)}
            type="button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Profile
          </button>
        </div>

        {/* ── Details Grid ── */}
        <div className="up-details">
          <div className="up-details__item">
            <div className="up-details__icon up-details__icon--orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="up-details__text">
              <span className="up-details__label">Email</span>
              <span className="up-details__value">{profileUser.email}</span>
            </div>
          </div>

          <div className="up-details__item">
            <div className="up-details__icon up-details__icon--navy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
              </svg>
            </div>
            <div className="up-details__text">
              <span className="up-details__label">Roll Number</span>
              <span className="up-details__value">{profileUser.rollNumber || '\u2014'}</span>
            </div>
          </div>

          <div className="up-details__item">
            <div className="up-details__icon up-details__icon--purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
              </svg>
            </div>
            <div className="up-details__text">
              <span className="up-details__label">Department</span>
              <span className="up-details__value">{profileUser.department || 'CSBS'}</span>
            </div>
          </div>

          <div className="up-details__item">
            <div className="up-details__icon up-details__icon--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="up-details__text">
              <span className="up-details__label">Account Status</span>
              <span className="up-details__value up-details__value--active">
                <span className="up-details__pulse" /> Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body Sections ── */}
      <div className="up-body">
        {/* Resume */}
        {profileUser.resumeURL && (
          <section className="up-section">
            <h3 className="up-section__title">
              <span className="up-section__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V10z" />
                  <polyline points="14 2 14 10 22 10" />
                </svg>
              </span>
              Resume
            </h3>
            <div className="up-resume">
              <div className="up-resume__file-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V10z" />
                  <polyline points="14 2 14 10 22 10" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="up-resume__info">
                <p className="up-resume__name">{profileUser.resumeName || 'Resume.pdf'}</p>
                <p className="up-resume__type">PDF Document</p>
              </div>
              <a
                href={profileUser.resumeURL}
                target="_blank"
                rel="noopener noreferrer"
                className="up-resume__download"
                download
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </a>
            </div>
          </section>
        )}

        {/* Activity Stats */}
        <section className="up-section">
          <h3 className="up-section__title">
            <span className="up-section__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            Activity Summary
          </h3>
          <div className="up-stats">
            <div className="up-stats__card">
              <div className="up-stats__icon up-stats__icon--navy">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span className="up-stats__number">0</span>
              <span className="up-stats__label">Events Registered</span>
            </div>
            <div className="up-stats__card">
              <div className="up-stats__icon up-stats__icon--green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="up-stats__number">0</span>
              <span className="up-stats__label">Upcoming</span>
            </div>
            <div className="up-stats__card">
              <div className="up-stats__icon up-stats__icon--orange">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="7" />
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
              </div>
              <span className="up-stats__number">0</span>
              <span className="up-stats__label">Certificates</span>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="up-section">
          <h3 className="up-section__title">
            <span className="up-section__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </span>
            Quick Actions
          </h3>
          <div className="up-actions">
            <button className="up-actions__btn" type="button" onClick={() => navigate('/')}>
              <span className="up-actions__btn-icon up-actions__btn-icon--orange">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <span className="up-actions__btn-text">
                <strong>Browse Events</strong>
                <small>Discover &amp; register for events</small>
              </span>
              <svg className="up-actions__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button className="up-actions__btn" type="button" onClick={() => navigate('/')}>
              <span className="up-actions__btn-icon up-actions__btn-icon--navy">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span className="up-actions__btn-text">
                <strong>Home Page</strong>
                <small>Back to the main website</small>
              </span>
              <svg className="up-actions__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </section>

        {/* Sign Out */}
        <div className="up-signout">
          <button className="up-signout__btn" type="button" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      <EditProfileModal
        user={profileUser}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleProfileUpdate}
      />
    </div>
  )
}

export default UserProfile
