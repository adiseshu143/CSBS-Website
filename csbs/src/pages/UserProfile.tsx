import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EditProfileModal from '../components/EditProfileModal'
import type { UserProfile as UserProfileType } from '../api/authApi'

const UserProfile = () => {
  const { user: initialUser, logout } = useAuth()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserProfileType | null>(
    initialUser ? {
      uid: initialUser.id,
      name: initialUser.name,
      email: initialUser.email,
      rollNumber: initialUser.rollNumber,
      department: initialUser.department,
      role: initialUser.role,
      createdAt: new Date().toISOString(),
    } : null
  )
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleProfileUpdate = (updatedUser: UserProfileType) => {
    setUser(updatedUser)
    setIsEditModalOpen(false)
  }

  const initials = user.name
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
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero__pattern" />
        <div className="profile-hero__content">
          <button className="profile-hero__back" onClick={() => navigate('/')} type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Home
          </button>

          <div className="profile-hero__avatar-section">
            <div className="profile-hero__avatar-wrapper">
              <div className="profile-hero__avatar">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="profile-hero__avatar-img" />
                ) : (
                  <span className="profile-hero__initials">{initials}</span>
                )}
                <span className="profile-hero__status" />
              </div>
              <button
                className="profile-hero__edit-btn"
                onClick={() => setIsEditModalOpen(true)}
                title="Edit profile"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
            <div className="profile-hero__identity">
              <h1 className="profile-hero__name">{user.name}</h1>
              {user.username && <p className="profile-hero__username">@{user.username}</p>}
              <div className="profile-hero__badges">
                <span className="profile-hero__badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                  Student
                </span>
              </div>
              {user.bio && <p className="profile-hero__bio">{user.bio}</p>}
              <p className="profile-hero__meta">Member since {joinDate}</p>
              <button
                className="profile-hero__edit-link"
                onClick={() => setIsEditModalOpen(true)}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        user={user}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleProfileUpdate}
      />      <div className="profile-body">
        {/* Info Cards */}
        <div className="profile-info-grid">
          <div className="profile-info-card">
            <div className="profile-info-card__icon" style={{ background: 'linear-gradient(135deg, #EB4D28, #D8431F)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="profile-info-card__text">
              <span className="profile-info-card__label">Email Address</span>
              <span className="profile-info-card__value">{user.email}</span>
            </div>
          </div>

          <div className="profile-info-card">
            <div className="profile-info-card__icon" style={{ background: 'linear-gradient(135deg, #2E3190, #1B1E63)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
              </svg>
            </div>
            <div className="profile-info-card__text">
              <span className="profile-info-card__label">Roll Number</span>
              <span className="profile-info-card__value">{user.rollNumber || '—'}</span>
            </div>
          </div>

          <div className="profile-info-card">
            <div className="profile-info-card__icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
              </svg>
            </div>
            <div className="profile-info-card__text">
              <span className="profile-info-card__label">Department</span>
              <span className="profile-info-card__value">{user.department || 'CSBS'}</span>
            </div>
          </div>

          <div className="profile-info-card">
            <div className="profile-info-card__icon" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="profile-info-card__text">
              <span className="profile-info-card__label">Status</span>
              <span className="profile-info-card__value profile-info-card__value--active">
                <span className="profile-info-card__dot" /> Active
              </span>
            </div>
          </div>
        </div>

        {/* Resume Section */}
        {user.resumeURL && (
          <div className="profile-section">
            <h3 className="profile-section__title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V10z" />
                <polyline points="14 2 14 10 22 10" />
              </svg>
              Resume
            </h3>
            <div className="profile-resume-card">
              <div className="profile-resume-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V10z" />
                  <polyline points="14 2 14 10 22 10" />
                </svg>
              </div>
              <div className="profile-resume-card__content">
                <p className="profile-resume-card__name">{user.resumeName || 'Resume.pdf'}</p>
                <p className="profile-resume-card__desc">PDF Document</p>
              </div>
              <a
                href={user.resumeURL}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-resume-card__btn"
                download
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </a>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="profile-section">
          <h3 className="profile-section__title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Activity Summary
          </h3>
          <div className="profile-stat-grid">
            <div className="profile-stat-card">
              <div className="profile-stat-card__icon" style={{ background: 'linear-gradient(135deg, #2E3190, #1B1E63)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span className="profile-stat-card__number">0</span>
              <span className="profile-stat-card__label">Registered Events</span>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-card__icon" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="profile-stat-card__number">0</span>
              <span className="profile-stat-card__label">Upcoming Events</span>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-card__icon" style={{ background: 'linear-gradient(135deg, #EB4D28, #D8431F)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="8" r="7" />
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
              </div>
              <span className="profile-stat-card__number">0</span>
              <span className="profile-stat-card__label">Certificates</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="profile-section">
          <h3 className="profile-section__title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Quick Actions
          </h3>
          <div className="profile-actions-grid">
            <button className="profile-action-card" type="button" onClick={() => navigate('/')}>
              <div className="profile-action-card__icon" style={{ background: 'linear-gradient(135deg, #EB4D28, #D8431F)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span className="profile-action-card__title">Browse Events</span>
              <span className="profile-action-card__desc">Discover & register</span>
              <svg className="profile-action-card__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="profile-action-card" type="button" onClick={() => navigate('/')}>
              <div className="profile-action-card__icon" style={{ background: 'linear-gradient(135deg, #2E3190, #1B1E63)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="profile-action-card__title">Home Page</span>
              <span className="profile-action-card__desc">Back to website</span>
              <svg className="profile-action-card__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="profile-logout-section">
          <button className="profile-logout-btn" type="button" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
