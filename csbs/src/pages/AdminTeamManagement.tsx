import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember } from '../api/teamApi'
import type { TeamMember } from '../api/teamApi'
import '../components/AdminResetModal.css'

/**
 * AdminTeamManagement — Manage faculty/team members
 * Route: /admin/team (ProtectedAdminRoute)
 */
const AdminTeamManagement = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<TeamMember>({
    name: '',
    role: '',
    initials: '',
    color: '#2E3190',
    linkedinUrl: '',
    githubUrl: '',
    email: '',
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  if (!user) return null

  // ── Fetch team members ──
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true)
        const data = await getTeamMembers()
        setTeamMembers(data)
      } catch (err) {
        console.error('Error fetching team:', err)
        setMessage('Failed to load team members')
        setMessageType('error')
      } finally {
        setLoading(false)
      }
    }

    fetchTeam()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.role || !formData.initials) {
      setMessage('Please fill in all required fields (Name, Role, Initials)')
      setMessageType('error')
      return
    }

    try {
      if (editingId) {
        await updateTeamMember(editingId, formData)
        setMessage('Team member updated successfully!')
      } else {
        await addTeamMember(formData)
        setMessage('Team member added successfully!')
      }
      setMessageType('success')

      // Refresh team list
      const data = await getTeamMembers()
      setTeamMembers(data)

      // Reset form
      setFormData({
        name: '',
        role: '',
        initials: '',
        color: '#2E3190',
        linkedinUrl: '',
        githubUrl: '',
        email: '',
      })
      setShowForm(false)
      setEditingId(null)
    } catch (err) {
      console.error('Error saving team member:', err)
      setMessage('Failed to save team member')
      setMessageType('error')
    }

    // Clear message after 3 seconds
    setTimeout(() => setMessage(''), 3000)
  }

  const handleEdit = (member: TeamMember) => {
    setFormData(member)
    setEditingId(member.id || null)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return

    try {
      await deleteTeamMember(id)
      setMessage('Team member deleted successfully!')
      setMessageType('success')

      // Refresh team list
      const data = await getTeamMembers()
      setTeamMembers(data)
    } catch (err) {
      console.error('Error deleting team member:', err)
      setMessage('Failed to delete team member')
      setMessageType('error')
    }

    setTimeout(() => setMessage(''), 3000)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '',
      role: '',
      initials: '',
      color: '#2E3190',
      linkedinUrl: '',
      githubUrl: '',
      email: '',
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
      {/* ── Header ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 10px', fontSize: '32px', fontWeight: 700, color: '#1a1f2e' }}>Team Management</h1>
          <p style={{ margin: 0, color: 'rgba(26, 31, 46, 0.7)' }}>Manage faculty and team members</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: '#E31B23',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}>
          Sign Out
        </button>
      </div>

      {/* ── Message ── */}
      {message && (
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto 20px',
            padding: '12px 16px',
            background: messageType === 'success' ? '#ecfdf5' : '#fef2f2',
            color: messageType === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${messageType === 'success' ? '#a7f3d0' : '#fecaca'}`,
            borderRadius: '8px',
            fontSize: '14px',
          }}>
          {message}
        </div>
      )}

      {/* ── Add New Button ── */}
      {!showForm && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 30px' }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '10px 20px',
              background: '#2E3190',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
            }}>
            + Add New Team Member
          </button>
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto 30px',
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid rgba(46, 49, 144, 0.1)',
            boxShadow: '0 4px 12px rgba(46, 49, 144, 0.08)',
          }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>
            {editingId ? 'Edit Team Member' : 'Add New Team Member'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#1a1f2e' }}>
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Dr. Ramesh Kumar"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(46, 49, 144, 0.2)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#1a1f2e' }}>
                  Role *
                </label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  placeholder="e.g., Head of Department"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(46, 49, 144, 0.2)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#1a1f2e' }}>
                  Initials (2 chars) *
                </label>
                <input
                  type="text"
                  name="initials"
                  value={formData.initials}
                  onChange={handleFormChange}
                  placeholder="e.g., RK"
                  maxLength={2}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(46, 49, 144, 0.2)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#1a1f2e' }}>
                  Avatar Color
                </label>
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid rgba(46, 49, 144, 0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#1a1f2e' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="e.g., ramesh@vit.edu"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(46, 49, 144, 0.2)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#1a1f2e' }}>
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  name="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={handleFormChange}
                  placeholder="https://linkedin.com/in/..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(46, 49, 144, 0.2)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#1a1f2e' }}>
                  GitHub URL
                </label>
                <input
                  type="url"
                  name="githubUrl"
                  value={formData.githubUrl}
                  onChange={handleFormChange}
                  placeholder="https://github.com/..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(46, 49, 144, 0.2)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  background: '#2E3190',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}>
                {editingId ? 'Update' : 'Add'} Member
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#1a1f2e',
                  border: '1px solid rgba(46, 49, 144, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Team Members List ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700, color: '#1a1f2e' }}>
          Team Members ({teamMembers.length})
        </h2>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(26, 31, 46, 0.7)' }}>Loading team members...</p>
        ) : teamMembers.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(26, 31, 46, 0.7)' }}>
            No team members yet. Add one to get started!
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {teamMembers.map((member) => (
              <div
                key={member.id}
                style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(46, 49, 144, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${member.color}, ${member.color}cc)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '16px',
                    }}>
                    {member.initials}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1a1f2e' }}>
                      {member.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(26, 31, 46, 0.6)' }}>
                      {member.role}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(member)}
                    style={{
                      padding: '6px 12px',
                      background: '#2E3190',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                    Edit
                  </button>
                  <button
                    onClick={() => member.id && handleDelete(member.id)}
                    style={{
                      padding: '6px 12px',
                      background: '#E31B23',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminTeamManagement
