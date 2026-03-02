import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

const Dashboard = () => {
  const { user, logout } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="dashboard">
      <div className="dashboard__card">
        <h1 className="dashboard__title">Welcome, {user.name}!</h1>
        <p className="dashboard__info">Email: {user.email}</p>
        <p className="dashboard__info">Role: {user.role}</p>
        <button className="dashboard__logout" onClick={logout}>
          Log Out
        </button>
      </div>
    </div>
  )
}

export default Dashboard
