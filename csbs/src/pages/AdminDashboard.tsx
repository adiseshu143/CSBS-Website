import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEvents } from '../hooks/useEvents'
import { getEventRegistrationCount } from '../api/eventApi'

/**
 * AdminDashboard — Professional admin dashboard with live data
 * Route: /admin/dashboard (ProtectedAdminRoute)
 */
const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { events } = useEvents()
  const [registrationStats, setRegistrationStats] = useState<Record<string, { teamCount: number; memberCount: number }>>({})

  if (!user) return null

  // ── Fetch registration counts for all events ──
  useEffect(() => {
    const fetchCounts = async () => {
      const stats: Record<string, { teamCount: number; memberCount: number }> = {}
      for (const event of events) {
        try {
          const stat = await getEventRegistrationCount(event.id)
          stats[event.id] = stat
        } catch (err) {
          console.error(`Failed to fetch count for ${event.id}:`, err)
          stats[event.id] = { teamCount: 0, memberCount: 0 }
        }
      }
      setRegistrationStats(stats)
    }

    if (events.length > 0) {
      fetchCounts()
      // Refresh every 5 seconds
      const interval = setInterval(fetchCounts, 5000)
      return () => clearInterval(interval)
    }
  }, [events])

  /* ── Derived stats ── */
  const totalEvents = events.length
  const upcomingCount = events.filter((e) => e.status === 'upcoming').length
  const totalTeams = Object.values(registrationStats).reduce((sum, stat) => sum + stat.teamCount, 0)
  const totalMembers = Object.values(registrationStats).reduce((sum, stat) => sum + stat.memberCount, 0)

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="adm-dash">
      <div className="adm-dash__container">

        {/* ── Top Bar ── */}
        <div className="adm-dash__topbar">
          <button className="adm-dash__back" onClick={() => navigate('/')} type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Home
          </button>
          <div className="adm-dash__topbar-right">
            <span className="adm-dash__topbar-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Admin Panel
            </span>
          </div>
        </div>

        {/* ── Profile Card ── */}
        <div className="adm-dash__profile">
          <div className="adm-dash__profile-left">
            <div className="adm-dash__avatar">
              <span className="adm-dash__avatar-text">{initials}</span>
              <span className="adm-dash__avatar-status" />
            </div>
            <div className="adm-dash__profile-info">
              <h1 className="adm-dash__name">{user.name}</h1>
              <div className="adm-dash__role-row">
                <span className="adm-dash__role-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Administrator
                </span>
                <span className="adm-dash__divider-dot">·</span>
                <span className="adm-dash__designation">Web Developer</span>
              </div>
              <div className="adm-dash__email">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {user.email}
              </div>
            </div>
          </div>
          <button className="adm-dash__logout-btn" onClick={handleLogout} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>

        {/* ── Statistics ── */}
        <section className="adm-dash__section">
          <h2 className="adm-dash__section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Platform Statistics
          </h2>
          <div className="adm-dash__stats-grid">
            <div className="adm-dash__stat-card">
              <div className="adm-dash__stat-icon" style={{ background: 'linear-gradient(135deg, #EB4D28, #D8431F)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="adm-dash__stat-text">
                <span className="adm-dash__stat-num">{totalEvents}</span>
                <span className="adm-dash__stat-label">Total Events</span>
              </div>
              <div className="adm-dash__stat-bar">
                <div className="adm-dash__stat-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #EB4D28, #D8431F)' }} />
              </div>
            </div>

            <div className="adm-dash__stat-card">
              <div className="adm-dash__stat-icon" style={{ background: 'linear-gradient(135deg, #2E3190, #1B1E63)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              </div>
              <div className="adm-dash__stat-text">
                <span className="adm-dash__stat-num">{totalTeams} | {totalMembers}</span>
                <span className="adm-dash__stat-label">Teams | Members</span>
              </div>
              <div className="adm-dash__stat-bar">
                <div className="adm-dash__stat-fill" style={{ width: totalEvents > 0 ? '60%' : '0%', background: 'linear-gradient(90deg, #2E3190, #1B1E63)' }} />
              </div>
            </div>

            <div className="adm-dash__stat-card">
              <div className="adm-dash__stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="adm-dash__stat-text">
                <span className="adm-dash__stat-num">{upcomingCount}</span>
                <span className="adm-dash__stat-label">Upcoming Events</span>
              </div>
              <div className="adm-dash__stat-bar">
                <div className="adm-dash__stat-fill" style={{ width: totalEvents > 0 ? `${(upcomingCount / totalEvents) * 100}%` : '0%', background: 'linear-gradient(90deg, #10B981, #34D399)' }} />
              </div>
            </div>

            <div className="adm-dash__stat-card">
              <div className="adm-dash__stat-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="adm-dash__stat-text">
                <span className="adm-dash__stat-num">—</span>
                <span className="adm-dash__stat-label">Analytics</span>
              </div>
              <div className="adm-dash__stat-bar">
                <div className="adm-dash__stat-fill" style={{ width: '0%', background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Admin Controls ── */}
        <section className="adm-dash__section">
          <h2 className="adm-dash__section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Admin Controls
          </h2>
          <div className="adm-dash__controls-grid">
            <button className="adm-dash__ctrl" onClick={() => navigate('/admin/create-event')} type="button">
              <div className="adm-dash__ctrl-icon" style={{ '--ctrl-clr': '#EB4D28' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="12" y1="14" x2="12" y2="18" />
                  <line x1="10" y1="16" x2="14" y2="16" />
                </svg>
              </div>
              <div className="adm-dash__ctrl-text">
                <span className="adm-dash__ctrl-title">Create Event</span>
                <span className="adm-dash__ctrl-desc">Create and publish new events</span>
              </div>
              <svg className="adm-dash__ctrl-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="adm-dash__ctrl" onClick={() => navigate('/#events')} type="button">
              <div className="adm-dash__ctrl-icon" style={{ '--ctrl-clr': '#2E3190' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div className="adm-dash__ctrl-text">
                <span className="adm-dash__ctrl-title">Manage Events</span>
                <span className="adm-dash__ctrl-desc">Edit, update, or delete events</span>
              </div>
              <svg className="adm-dash__ctrl-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="adm-dash__ctrl" onClick={() => navigate('/admin/team')} type="button">
              <div className="adm-dash__ctrl-icon" style={{ '--ctrl-clr': '#10B981' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              </div>
              <div className="adm-dash__ctrl-text">
                <span className="adm-dash__ctrl-title">Manage Team</span>
                <span className="adm-dash__ctrl-desc">Add, edit, or delete faculty members</span>
              </div>
              <svg className="adm-dash__ctrl-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="adm-dash__ctrl" type="button">
              <div className="adm-dash__ctrl-icon" style={{ '--ctrl-clr': '#8B5CF6' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className="adm-dash__ctrl-text">
                <span className="adm-dash__ctrl-title">Analytics Overview</span>
                <span className="adm-dash__ctrl-desc">Track engagement and performance</span>
              </div>
              <svg className="adm-dash__ctrl-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button className="adm-dash__ctrl" type="button">
              <div className="adm-dash__ctrl-icon" style={{ '--ctrl-clr': '#EF4444' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="adm-dash__ctrl-text">
                <span className="adm-dash__ctrl-title">Manage Users</span>
                <span className="adm-dash__ctrl-desc">View, approve, or manage members</span>
              </div>
              <svg className="adm-dash__ctrl-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}

export default AdminDashboard
