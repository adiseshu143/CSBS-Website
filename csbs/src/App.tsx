import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useAuth } from './context/AuthContext'
import { initializeConnectivityMonitoring } from './utils/connectivityCheck'
import './App.css'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AuthModal from './components/AuthModal'
import { Achievements, Events, Team, Gallery, About, Footer, FAQ } from './components/Sections'
import ProtectedRoute from './routes/ProtectedRoute'
import ProtectedAdminRoute from './routes/ProtectedAdminRoute'

/* ── Lazy-loaded pages (code-split for smaller initial bundle) ── */
const UserProfile = lazy(() => import('./pages/UserProfile'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminProfile = lazy(() => import('./pages/AdminProfile'))
const AdminTeamManagement = lazy(() => import('./pages/AdminTeamManagement'))
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage'))
const AdminCreateEvent = lazy(() => import('./pages/AdminCreateEvent'))

/* ── Loading fallback for lazy routes ── */
const PageLoader = () => (
	<div className="protected-loading">
		<div className="protected-loading__spinner" />
		<p className="protected-loading__text">Loading...</p>
	</div>
)

/* ── Modern Premium Background Layer ──────────────────── */
const Background = () => (
	<div className="page__fixed-bg" aria-hidden="true">
		{/* Soft gradient background */}
		<div className="bg__gradient" />
		{/* Subtle accent blob (very light) */}
		<div className="bg__accent-blob" />
	</div>
)

/* ── Home page (Hero + Sections) ──────────────────────── */
const HomePage = () => {
	useEffect(() => {
		// Disable browser scroll restoration so page always starts at top
		if ('scrollRestoration' in history) {
			history.scrollRestoration = 'manual'
		}
		window.scrollTo(0, 0)

		// Lock scroll during hero entrance animation, then unlock
		document.body.style.overflow = 'hidden'
		const timer = setTimeout(() => {
			document.body.style.overflow = ''
		}, 1200) // matches longest hero animation delay + duration

		return () => {
			clearTimeout(timer)
			document.body.style.overflow = ''
		}
	}, [])

	return (
		<>
			<Hero />
			<AuthModal />
			<main id="main-content">
				<About />
				<Team />
				<Gallery />
				<Events />
				<Achievements />
				<FAQ />
			</main>
			<Footer />
		</>
	)
}

/* ── /profile redirect based on role ──────────────────── */
const ProfileRedirect = () => {
	const { user, isAuthenticated, isLoading } = useAuth()
	const navigate = useNavigate()

	// Use effect to navigate only once when state settles
	useEffect(() => {
		if (isLoading) return // Still loading, wait for it to finish

		// After loading is done, navigate based on auth state
		if (!isAuthenticated || !user) {
			navigate('/', { replace: true })
		} else if (user.role === 'admin') {
			navigate('/admin/profile', { replace: true })
		} else {
			navigate('/user-profile', { replace: true })
		}
	}, [isLoading, isAuthenticated, user, navigate])

	if (isLoading) {
		return (
			<div className="protected-loading">
				<div className="protected-loading__spinner" />
				<p className="protected-loading__text">Loading...</p>
			</div>
		)
	}

	// After useEffect handles navigation, return null
	// (React Router will handle the actual navigation)
	return null
}

function App() {
	const location = useLocation()

	// Initialize connectivity monitoring on app startup
	useEffect(() => {
		if (location.pathname === '/') {
			initializeConnectivityMonitoring()
		}
	}, [location.pathname])

	return (
		<div className="page">
			{/* Permanent fixed background — orange curve, skyline bars, particles */}
			<Background />
			<Navbar />
			<Suspense fallback={<PageLoader />}>
			<Routes>
				<Route path="/" element={<HomePage />} />

				{/* Auto-redirect based on role */}
				<Route path="/profile" element={<ProfileRedirect />} />

				{/* User profile — only "user" role */}
				<Route
					path="/user-profile"
					element={
						<ProtectedRoute allowedRole="user">
							<UserProfile />
						</ProtectedRoute>
					}
				/>

				{/* Admin login — public route for admin authentication */}
				<Route path="/admin" element={<AdminLogin />} />

				{/* Admin profile — only "admin" role with verified access code */}
				<Route
					path="/admin/profile"
					element={
						<ProtectedAdminRoute>
							<AdminProfile />
						</ProtectedAdminRoute>
					}
				/>

			{/* Admin: Team Management — admin only */}
			<Route
				path="/admin/team"
				element={
					<ProtectedAdminRoute>
						<AdminTeamManagement />
					</ProtectedAdminRoute>
				}
			/>

			{/* Admin: Create Event form — admin role required */}
				<Route
					path="/admin/create-event"
					element={
						<ProtectedRoute allowedRole="admin">
							<AdminCreateEvent />
						</ProtectedRoute>
					}
				/>

				{/* Event detail page */}
				<Route path="/events/:eventId" element={<EventDetailsPage />} />

				{/* Catch-all → home */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
			</Suspense>
		</div>
	)
}

export default App