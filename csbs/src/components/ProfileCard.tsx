interface ProfileCardProps {
  name: string
  email: string
  rollNumber?: string
  department?: string
  role: 'user' | 'admin'
  designation?: string
}

const ProfileCard = ({ name, email, rollNumber, department, role, designation }: ProfileCardProps) => {
  // Generate initials for avatar
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={`profile-card ${role === 'admin' ? 'profile-card--admin' : ''}`}>
      {/* Decorative top bar */}
      <div className="profile-card__accent" />

      <div className="profile-card__content">
        {/* Avatar */}
        <div className="profile-card__avatar-wrap">
          <div className={`profile-card__avatar ${role === 'admin' ? 'profile-card__avatar--admin' : ''}`}>
            <span className="profile-card__initials">{initials}</span>
          </div>
          {/* Online indicator */}
          <span className="profile-card__online" />
        </div>

        {/* Info */}
        <div className="profile-card__info">
          <h2 className="profile-card__name">{name}</h2>
          <span className={`profile-card__badge ${role === 'admin' ? 'profile-card__badge--admin' : ''}`}>
            {role === 'admin' ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Admin
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                Student
              </>
            )}
          </span>
          {designation && <p className="profile-card__designation">{designation}</p>}
        </div>

        {/* Details grid */}
        <div className="profile-card__details">
          <div className="profile-card__detail">
            <span className="profile-card__detail-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <div className="profile-card__detail-text">
              <span className="profile-card__detail-label">Email</span>
              <span className="profile-card__detail-value">{email}</span>
            </div>
          </div>

          {rollNumber && (
            <div className="profile-card__detail">
              <span className="profile-card__detail-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                </svg>
              </span>
              <div className="profile-card__detail-text">
                <span className="profile-card__detail-label">Roll Number</span>
                <span className="profile-card__detail-value">{rollNumber}</span>
              </div>
            </div>
          )}

          {department && (
            <div className="profile-card__detail">
              <span className="profile-card__detail-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                </svg>
              </span>
              <div className="profile-card__detail-text">
                <span className="profile-card__detail-label">Department</span>
                <span className="profile-card__detail-value">{department}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileCard
