import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { uploadProfileImage } from '../utils/uploadUtils'

const AdminProfile = () => {
  const { user, logout, updateUserProfileImage, updateUserDesignation, updateUserCustomRole } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editingDesignation, setEditingDesignation] = useState(false)
  const [designationValue, setDesignationValue] = useState('')
  const [savingDesignation, setSavingDesignation] = useState(false)
  const designationInputRef = useRef<HTMLInputElement>(null)
  const [editingRole, setEditingRole] = useState(false)
  const [roleValue, setRoleValue] = useState('')
  const [savingRole, setSavingRole] = useState(false)
  const roleInputRef = useRef<HTMLInputElement>(null)
  if (!user) return null

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setUploadProgress(0)
    try {
      const result = await uploadProfileImage(file, (progress) => {
        setUploadProgress(progress.percent)
      })

      // Save to Firestore
      await updateDoc(doc(db, 'users', user.id), {
        profileImage: result.secure_url,
        profileImagePublicId: result.public_id,
      })

      // Update local state
      updateUserProfileImage(result.secure_url)
    } catch (err) {
      console.error('Image upload failed:', err)
      alert(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const startEditDesignation = () => {
    setDesignationValue(user.designation || '')
    setEditingDesignation(true)
    setTimeout(() => designationInputRef.current?.focus(), 50)
  }

  const cancelEditDesignation = () => {
    setEditingDesignation(false)
    setDesignationValue('')
  }

  const saveDesignation = async () => {
    const trimmed = designationValue.trim()
    if (!trimmed) return cancelEditDesignation()

    setSavingDesignation(true)
    try {
      await updateDoc(doc(db, 'users', user.id), { designation: trimmed })
      updateUserDesignation(trimmed)
      setEditingDesignation(false)
    } catch (err) {
      console.error('Failed to save designation:', err)
      alert('Failed to save designation')
    } finally {
      setSavingDesignation(false)
    }
  }

  const handleDesignationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveDesignation()
    if (e.key === 'Escape') cancelEditDesignation()
  }

  const startEditRole = () => {
    setRoleValue(user.customRole || 'System Administrator')
    setEditingRole(true)
    setTimeout(() => roleInputRef.current?.focus(), 50)
  }

  const cancelEditRole = () => {
    setEditingRole(false)
    setRoleValue('')
  }

  const saveRole = async () => {
    const trimmed = roleValue.trim()
    if (!trimmed) return cancelEditRole()

    setSavingRole(true)
    try {
      await updateDoc(doc(db, 'users', user.id), { customRole: trimmed })
      updateUserCustomRole(trimmed)
      setEditingRole(false)
    } catch (err) {
      console.error('Failed to save role:', err)
      alert('Failed to save role')
    } finally {
      setSavingRole(false)
    }
  }

  const handleRoleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveRole()
    if (e.key === 'Escape') cancelEditRole()
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
              <div className="profile-hero__avatar profile-hero__avatar--admin">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="profile-hero__avatar-img" />
                ) : (
                  <span className="profile-hero__initials">{initials}</span>
                )}
                <span className="profile-hero__status" />
                {uploading && (
                  <div className="profile-hero__upload-overlay">
                    <svg className="profile-hero__upload-spinner" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    <span className="profile-hero__upload-percent">{uploadProgress}%</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <button
                className="profile-hero__edit-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Change profile photo"
                type="button"
                disabled={uploading}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>
            </div>
            <div className="profile-hero__identity">
              <h1 className="profile-hero__name">{user.name}</h1>

              {/* Editable Designation */}
              <div className="profile-hero__designation-row">
                {editingDesignation ? (
                  <div className="profile-hero__designation-edit">
                    <input
                      ref={designationInputRef}
                      type="text"
                      className="profile-hero__designation-input"
                      value={designationValue}
                      onChange={(e) => setDesignationValue(e.target.value)}
                      onKeyDown={handleDesignationKeyDown}
                      placeholder="e.g. Head of Department, Professor..."
                      maxLength={60}
                      disabled={savingDesignation}
                    />
                    <button
                      className="profile-hero__designation-save"
                      onClick={saveDesignation}
                      disabled={savingDesignation}
                      type="button"
                      title="Save"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      className="profile-hero__designation-cancel"
                      onClick={cancelEditDesignation}
                      disabled={savingDesignation}
                      type="button"
                      title="Cancel"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    className="profile-hero__designation-display"
                    onClick={startEditDesignation}
                    type="button"
                    title="Click to edit designation"
                  >
                    <span className="profile-hero__designation-text">
                      {user.designation || 'Add your designation'}
                    </span>
                    <svg className="profile-hero__designation-pen" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="profile-hero__badges">
                <span className="profile-hero__badge profile-hero__badge--admin">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Administrator
                </span>
                <span className="profile-hero__badge profile-hero__badge--verified">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Verified
                </span>
              </div>
              <p className="profile-hero__meta">Member since {joinDate}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-body">
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

          <div className="profile-info-card profile-info-card--editable" onClick={!editingRole ? startEditRole : undefined}>
            <div className="profile-info-card__icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="profile-info-card__text">
              <span className="profile-info-card__label">Role</span>
              {editingRole ? (
                <div className="profile-info-card__edit-row" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={roleInputRef}
                    type="text"
                    className="profile-info-card__edit-input"
                    value={roleValue}
                    onChange={(e) => setRoleValue(e.target.value)}
                    onKeyDown={handleRoleKeyDown}
                    placeholder="e.g. System Administrator"
                    maxLength={40}
                    disabled={savingRole}
                  />
                  <button className="profile-info-card__edit-save" onClick={saveRole} disabled={savingRole} type="button" title="Save">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button className="profile-info-card__edit-cancel" onClick={cancelEditRole} disabled={savingRole} type="button" title="Cancel">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <span className="profile-info-card__value profile-info-card__value--editable">
                  {user.customRole || 'System Administrator'}
                  <svg className="profile-info-card__edit-pen" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </span>
              )}
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

        {/* Statistics */}
        <div className="profile-section">
          <h3 className="profile-section__title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Platform Overview
          </h3>
          <div className="profile-stat-grid profile-stat-grid--4">
            <div className="profile-stat-card">
              <div className="profile-stat-card__icon" style={{ background: 'linear-gradient(135deg, #EB4D28, #D8431F)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span className="profile-stat-card__number">0</span>
              <span className="profile-stat-card__label">Total Events</span>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-card__icon" style={{ background: 'linear-gradient(135deg, #2E3190, #1B1E63)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              </div>
              <span className="profile-stat-card__number">0</span>
              <span className="profile-stat-card__label">Registrations</span>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-card__icon" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <span className="profile-stat-card__number">0</span>
              <span className="profile-stat-card__label">Active Users</span>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-card__icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span className="profile-stat-card__number">—</span>
              <span className="profile-stat-card__label">Analytics</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="profile-section">
          <h3 className="profile-section__title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Quick Actions
          </h3>
          <div className="profile-actions-grid">
            <button className="profile-action-card" type="button" onClick={() => navigate('/admin/dashboard')}>
              <div className="profile-action-card__icon" style={{ background: 'linear-gradient(135deg, #EB4D28, #D8431F)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <span className="profile-action-card__title">Dashboard</span>
              <span className="profile-action-card__desc">Manage events & users</span>
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
              <span className="profile-action-card__desc">View the website</span>
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

export default AdminProfile
