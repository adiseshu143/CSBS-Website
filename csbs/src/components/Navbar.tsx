import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGO_URL = 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772522813/grl5bwexpgw8vqzxk6hv.jpg'

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const { openAuthModal, isAuthenticated, isLoading, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Detect active section while scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (location.pathname !== '/') return // Only on home page

      const sections = ['home', 'about', 'team', 'gallery', 'events', 'achievements']
      let current = 'home'

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= 150) {
            current = sectionId
          }
        }
      }

      setActiveSection(current)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  const toggleMenu = () => setMenuOpen(prev => !prev)
  const closeMenu = () => setMenuOpen(false)
  const handleConnect = () => { closeMenu(); openAuthModal() }
  const showProfileControls = !isLoading && isAuthenticated && !!user?.id
  const handleProfile = () => {
    closeMenu()
    if (showProfileControls) {
      navigate('/profile')
    } else {
      openAuthModal('/profile')
    }
  }

  /** Smooth-scroll to a section by id. If not on "/", navigate home first. */
  const scrollToSection = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()
    closeMenu()
    setActiveSection(sectionId)

    const doScroll = () => {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    if (location.pathname !== '/') {
      navigate('/')
      // Wait for home page to mount before scrolling
      setTimeout(doScroll, 350)
    } else {
      doScroll()
    }
  }

  const getLinkClassName = (sectionId: string) => {
    return `navbar__link ${activeSection === sectionId ? 'navbar__link--active' : ''}`
  }

  return (
    <header className="navbar">
      <div className="navbar__container">
        <div className="navbar__brand">
          <div className="navbar__logo">
            <img
              src={LOGO_URL}
              alt="Techie Blazers CSBS Logo"
              className="navbar__logo-img"
              width="40"
              height="40"
            />
          </div>
          <div className="navbar__brand-text">
            <span className="navbar__brand-title">TECHIE BLAZERS</span>
            <span className="navbar__brand-subtitle">Computer Science & Business Systems</span>
          </div>
        </div>

        <nav className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`} aria-label="Primary">
          <a href="/" className={getLinkClassName('home')} onClick={(e) => { e.preventDefault(); closeMenu(); navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveSection('home') }}>Home</a>
          <a href="#about" className={getLinkClassName('about')} onClick={(e) => scrollToSection(e, 'about')}>About</a>
          <a href="#team" className={getLinkClassName('team')} onClick={(e) => scrollToSection(e, 'team')}>Team</a>
          <a href="#gallery" className={getLinkClassName('gallery')} onClick={(e) => scrollToSection(e, 'gallery')}>Gallery</a>
          <a href="#events" className={getLinkClassName('events')} onClick={(e) => scrollToSection(e, 'events')}>Events</a>
          <a href="#achievements" className={getLinkClassName('achievements')} onClick={(e) => scrollToSection(e, 'achievements')}>Achievements</a>



        </nav>

        {showProfileControls ? (
          <div className="navbar__profile-container">
            <button className="navbar__profile-btn" type="button" onClick={handleProfile} aria-label={`Go to profile - ${user?.name}`} title={user?.name}>
              <span className="navbar__profile-avatar">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="navbar__profile-avatar-img" width={40} height={40} loading="eager" decoding="async" />
                ) : (
                  user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                )}
              </span>
            </button>
          </div>
        ) : (
          <button className="navbar__button navbar__button--desktop" type="button" onClick={handleConnect}>Connect</button>
        )}

        <button
          className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--active' : ''}`}
          type="button"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className="navbar__hamburger-line" />
          <span className="navbar__hamburger-line" />
          <span className="navbar__hamburger-line" />
        </button>
      </div>

      {menuOpen && (
        <div className="navbar__mobile-menu" role="presentation">
          <nav className="navbar__mobile-links" aria-label="Mobile navigation">
            <a href="/" className={`navbar__mobile-link ${activeSection === 'home' ? 'navbar__mobile-link--active' : ''}`} onClick={(e) => { e.preventDefault(); closeMenu(); navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveSection('home') }}>Home</a>
            <a href="#about" className={`navbar__mobile-link ${activeSection === 'about' ? 'navbar__mobile-link--active' : ''}`} onClick={(e) => scrollToSection(e, 'about')}>About</a>
            <a href="#team" className={`navbar__mobile-link ${activeSection === 'team' ? 'navbar__mobile-link--active' : ''}`} onClick={(e) => scrollToSection(e, 'team')}>Team</a>
            <a href="#gallery" className={`navbar__mobile-link ${activeSection === 'gallery' ? 'navbar__mobile-link--active' : ''}`} onClick={(e) => scrollToSection(e, 'gallery')}>Gallery</a>
            <a href="#events" className={`navbar__mobile-link ${activeSection === 'events' ? 'navbar__mobile-link--active' : ''}`} onClick={(e) => scrollToSection(e, 'events')}>Events</a>
            <a href="#achievements" className={`navbar__mobile-link ${activeSection === 'achievements' ? 'navbar__mobile-link--active' : ''}`} onClick={(e) => scrollToSection(e, 'achievements')}>Achievements</a>
          </nav>
          {showProfileControls ? (
            <button className="navbar__button navbar__button--mobile" type="button" onClick={handleProfile}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              My Profile
            </button>
          ) : (
            <button className="navbar__button navbar__button--mobile" type="button" onClick={handleConnect}>Connect</button>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
