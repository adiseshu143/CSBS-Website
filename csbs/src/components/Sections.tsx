/**
 * Home Page Sections — Achievements, Events, Team, Gallery, About, Footer
 * Each section has a proper `id` for anchor link scrolling from the Navbar.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEvents } from '../hooks/useEvents'
import { getEventRegistrationCount } from '../api/eventApi'
import { getTeamMembers } from '../api/teamApi'
import type { TeamMember } from '../api/teamApi'
import EventCard from './EventCard'

/* ── Data ──────────────────────────────────────────────── */

const achievements = [
  { icon: '🏆', number: '25+', title: 'Hackathon Wins', desc: 'First place victories in national & state-level competitions' },
  { icon: '🎓', number: '95%', title: 'Placement Rate', desc: 'Consistent placement record with top tech companies' },
  { icon: '📄', number: '50+', title: 'Research Papers', desc: 'Published in international journals & conferences' },
  { icon: '💡', number: '100+', title: 'Student Projects', desc: 'Innovative projects solving real-world problems' },
]

const galleryImages = [
  { src: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=400&fit=crop', title: 'Tech Fest 2025' },
  { src: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop', title: 'Annual Day' },
  { src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop', title: 'Coding Workshop' },
  { src: 'https://images.unsplash.com/photo-1559223607-a43c990c692c?w=600&h=400&fit=crop', title: 'Hackathon Winners' },
  { src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop', title: 'Guest Lectures' },
  { src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop', title: 'Team Building' },
  { src: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&h=400&fit=crop', title: 'Seminar Hall' },
  { src: 'https://images.unsplash.com/photo-1560439513-74b037a25d84?w=600&h=400&fit=crop', title: 'Campus Life' },
]

// Fallback team data (if Firebase fails)
const defaultTeamMembers: TeamMember[] = [
  { id: '1', name: 'Dr. M. Venu Gopal', role: 'Principal', initials: 'VG', color: '#EB4D28', cardBg: '#FDF0EC', linkedinUrl: 'https://linkedin.com/in/', email: 'ramesh.kumar@vishnu.edu.in' },
  { id: '2', name: 'M. Sri lakshmi', role: 'Vice Principal', initials: 'SL', color: '#2E3190', cardBg: '#ECEDF8', linkedinUrl: 'https://linkedin.com/in/', email: 'sujatha.m@vishnu.edu.in' },
  { id: '3', name: 'P. Archana', role: 'Faculty Organizer', initials: 'PA', color: '#2E3190', photoUrl: '/team/archana.jpg', cardBg: '#FFB5DA', linkedinUrl: 'https://linkedin.com/in/', email: 'sujatha.m@vishnu.edu.in' },
  { id: '4', name: 'N. Murari', role: 'Organizer', initials: 'NM', color: '#10B981', cardBg: '#ECFDF5', linkedinUrl: 'https://linkedin.com/in/', email: 'aravind.k@vishnu.edu.in' },
  { id: '5', name: 'S. Vijaya Lakshmi', role: 'Co-Organizer', initials: 'VL', color: '#8B5CF6', photoUrl: '/team/vijaya.jpg', cardBg: '#DEBBDC', linkedinUrl: 'https://linkedin.com/in/', email: 'priya.sharma@vishnu.edu.in' },
  { id: '6', name: 'B. Pallavi', role: 'Event Management', initials: 'BP', color: '#EF4444', photoUrl: '/team/pallavi.jpg', cardBg: '#D8FBFF', linkedinUrl: 'https://linkedin.com/in/', email: 'karthik.v@vishnu.edu.in' },
  { id: '7', name: 'T. Hari Teja', role: 'Marketing', initials: 'HT', color: '#EC4899', cardBg: '#FDF2F8', linkedinUrl: 'https://linkedin.com/in/', email: 'deepika.r@vishnu.edu.in' },
  { id: '8', name: 'H. Adiseshu', role: 'Technical Lead', initials: 'HA', color: '#EC4899', photoUrl: '/team/ADISESHU.jpeg', cardBg: '#EFE8D5', linkedinUrl: 'www.linkedin.com/in/adiseshu-hanumanthu', email: '24pa1a5723@vishnu.edu.in' },
  { id: '9', name: 'G. Akhil', role: 'Technical Co-Lead', initials: 'GA', color: '#EC4899', photoUrl: '/team/akhil.jpg', cardBg: '#E4AEC8', linkedinUrl: 'https://linkedin.com/in/', email: '24pa1a5721@vishnu.edu.in' },
  { id: '10', name: 'V. Pranav Sai Bhagath', role: 'Technical Associate', initials: 'PS', color: '#EC4899', photoUrl: '/team/pranav.jpg', cardBg: '#F5EFBF', linkedinUrl: 'https://linkedin.com/in/', email: '24pa1a5762@vishnu.edu.in' },
  { id: '11', name: 'P.Kartheek', role: 'PR Lead', initials: 'PK', color: '#EC4899', cardBg: '#FDF2F8', linkedinUrl: 'https://linkedin.com/in/', email: '24pa1a5762@vishnu.edu.in' },
  { id: '12', name: 'Harshika', role: 'Communication Lead', initials: 'HS', color: '#EC4899', photoUrl: '/team/harshika.jpg', cardBg: '#BAD5EA', linkedinUrl: 'https://linkedin.com/in/', email: '24pa1a5762@vishnu.edu.in' },
]

const faqItems = [
  {
    id: 1,
    question: 'What is the CSBS department?',
    answer: 'CSBS stands for Computer Science and Business Systems. It is an innovative department that bridges the gap between computer science and business fundamentals, preparing students for executive and technical leadership roles in the digital economy.'
  },
  {
    id: 2,
    question: 'What are the admission requirements?',
    answer: 'To join our CSBS program, candidates must have completed their 12th standard with PCM (Physics, Chemistry, Mathematics) and should meet the eligibility criteria set by VIT Bhimavaram. JEE Main scores are typically required for admission.'
  },
  {
    id: 3,
    question: 'What career opportunities are available after CSBS?',
    answer: 'Our graduates pursue careers in software development, business analytics, IT consulting, data science, product management, and entrepreneurship. With a 95% placement rate, our students are hired by leading tech companies including Microsoft, Amazon, Google, and Infosys.'
  },
  {
    id: 4,
    question: 'Does the department offer internship opportunities?',
    answer: 'Yes, we facilitate internships through industry partnerships. Our students work with companies to gain practical experience in software development, business analysis, and consulting during their summer and semester breaks.'
  },
  {
    id: 5,
    question: 'Are there opportunities for research and innovation?',
    answer: 'Absolutely! We encourage students to participate in research projects, hackathons, and innovation challenges. Our department has published 50+ research papers and supports students in pursuing patents and startups.'
  },
  {
    id: 6,
    question: 'What extracurricular activities are available?',
    answer: 'Beyond academics, we organize tech fests, hackathons, coding workshops, guest lectures, and team-building activities. Students can also participate in various clubs and student organizations to enhance their skills and network.'
  },
]

/* ═══════════════════════════════════════════════════════════
   ACHIEVEMENTS
   ═══════════════════════════════════════════════════════════ */
export const Achievements = () => (
  <section id="achievements" className="achievements-section">
    <div className="achievements-section__container">
      <div className="achievements-section__header">
        <span className="achievements-section__badge">
          <span className="achievements-section__badge-dot" />
          <span style={{color: '#2E3190', fontWeight: 700}}>Our Achievements</span>
        </span>
        <h2 className="achievements-section__title">
          Celebrating <span style={{color: '#E31B23', fontWeight: 700}}>Excellence</span>
        </h2>
        <p className="achievements-section__subtitle">
          Our students and faculty have achieved remarkable milestones, setting benchmarks in academics, research, and innovation.
        </p>
      </div>

      <div className="achievements-grid">
        {achievements.map((item, i) => (
          <div className="achievement-card" key={i}>
            <div className="achievement-card__icon">{item.icon}</div>
            <span className="achievement-card__stat-value">{item.number}</span>
            <h3 className="achievement-card__stat-title">{item.title}</h3>
            <p className="achievement-card__stat-description">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

/* ═══════════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════════ */
export const FAQ = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <section id="faq" className="faq-section">
      <div className="faq-section__container">
        <div className="faq-section__header">
          <span className="faq-section__badge">
            <span className="faq-section__badge-dot" />
            <span style={{color: '#2E3190', fontWeight: 700}}>Frequently Asked</span>
          </span>
          <h2 className="faq-section__title">
            Common <span style={{color: '#E31B23', fontWeight: 700}}>Questions</span>
          </h2>
          <p className="faq-section__subtitle">
            Find answers to questions about our department, programs, and opportunities.
          </p>
        </div>

        <div className="faq-section__content">
          <div className="faq-grid">
            {faqItems.map((item) => (
              <div
                key={item.id}
                className={`faq-item ${expandedId === item.id ? 'faq-item--open' : ''}`}
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="faq-item__header">
                  <h3 className="faq-item__question">{item.question}</h3>
                  <svg className="faq-item__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {expandedId === item.id && (
                  <div className="faq-item__body">
                    <p className="faq-item__answer">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   EVENTS
   ═══════════════════════════════════════════════════════════ */
export const Events = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { events, loading } = useEvents()
  const [registrationStats, setRegistrationStats] = useState<Record<string, { teamCount: number; memberCount: number }>>({})
  const isAdmin = user?.role === 'admin'

  // ── Fetch registration counts for all events (only when authenticated) ──
  useEffect(() => {
    // Skip polling entirely if user is not authenticated — avoids console spam
    if (!user) {
      setRegistrationStats({})
      return
    }

    const fetchCounts = async () => {
      const stats: Record<string, { teamCount: number; memberCount: number }> = {}
      for (const event of events) {
        try {
          const stat = await getEventRegistrationCount(event.id)
          stats[event.id] = stat
        } catch {
          stats[event.id] = { teamCount: 0, memberCount: 0 }
        }
      }
      setRegistrationStats(stats)
    }

    if (events.length > 0) {
      fetchCounts()
      // Refresh every 30 seconds (not 5s — reduces Firestore reads)
      const interval = setInterval(fetchCounts, 30000)
      return () => clearInterval(interval)
    }
  }, [events, user])

  /* ── Admin stats ── */
  const totalEvents = events.length
  const upcomingCount = events.filter(e => e.status === 'upcoming').length
  const totalTeams = Object.values(registrationStats).reduce((sum, stat) => sum + stat.teamCount, 0)
  const totalMembers = Object.values(registrationStats).reduce((sum, stat) => sum + stat.memberCount, 0)

  return (
    <section id="events" className={`events-section events-section--${isAdmin ? 'admin-mode' : 'user-mode'}`}>
      <div className="events-section__container">

        {/* ── ADMIN: Full control panel header ── */}
        {isAdmin ? (
          <div className="events-admin-header">
            <div className="events-admin-header__top">
              <div className="events-admin-header__title-area">
                <div className="events-admin-header__badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Admin Panel
                </div>
                <h2 className="events-admin-header__title">Event Management</h2>
                <p className="events-admin-header__description">Create, monitor, and manage all department events</p>
              </div>
              <button
                className="events-admin-header__create-button"
                type="button"
                onClick={() => navigate('/admin/create-event')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Event
              </button>
            </div>

            {/* Quick stats */}
            <div className="events-admin-stats">
              <div className="events-admin-stat">
                <span className="events-admin-stat__number">{totalEvents}</span>
                <span className="events-admin-stat__label">Total Events</span>
              </div>
              <div className="events-admin-stat events-admin-stat--highlight">
                <span className="events-admin-stat__number">{upcomingCount}</span>
                <span className="events-admin-stat__label">Upcoming</span>
              </div>
              <div className="events-admin-stat">
                <span className="events-admin-stat__number">{totalTeams} | {totalMembers}</span>
                <span className="events-admin-stat__label">Teams | Members</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── USER: Normal section header ── */
          <div className="events-section__header">
            <span className="events-section__badge">
              <span className="events-section__badge-dot" />
              Upcoming Events
            </span>
            <h2 className="events-section__title">
              What's <span className="events-section__title-highlight">Happening</span>
            </h2>
            <p className="events-section__subtitle">
              Stay updated with our upcoming events, workshops, hackathons, and symposiums.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="events-grid">
            {[1, 2, 3].map(i => (
              <div className="ec2-card ec2-card--skeleton" key={i}>
                <div className="ec2-card__banner ec2-card__banner--skeleton">
                  <div className="ec2-skel-shimmer" />
                </div>
                <div className="ec2-card__body">
                  <div className="ec2-skel-line ec2-skel-line--tag" />
                  <div className="ec2-skel-line ec2-skel-line--title" />
                  <div className="ec2-skel-line ec2-skel-line--text" />
                  <div className="ec2-skel-line ec2-skel-line--text ec2-skel-line--short" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length > 0 ? (
          /* Dynamic event cards */
          <div className="events-grid">
            {events.map(ev => (
              <EventCard key={ev.id} event={ev} teamCount={registrationStats[ev.id]?.teamCount || 0} memberCount={registrationStats[ev.id]?.memberCount || 0} />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="events-empty-state">
            <span className="events-empty-state__icon">📅</span>
            <h3 className="events-empty-state__title">No Events Yet</h3>
            <p className="events-empty-state__message">
              {isAdmin
                ? 'Get started by creating your first event!'
                : 'Check back soon for upcoming events.'}
            </p>
            {isAdmin && (
              <button
                className="events-admin-header__create-button"
                type="button"
                onClick={() => navigate('/admin/create-event')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create First Event
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   TEAM
   ═══════════════════════════════════════════════════════════ */
export const Team = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(defaultTeamMembers)

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const data = await getTeamMembers()
        // Only update if we got data, otherwise keep defaults
        if (data && data.length > 0) {
          setTeamMembers(data)
        }
      } catch (err) {
        console.error('Error fetching team members (using fallback):', err)
        // Keep default data on error
        setTeamMembers(defaultTeamMembers)
      }
    }

    fetchTeam()
  }, [])

  return (
    <section id="team" className="team-section">
      <div className="team-section__container">
        <div className="team-section__header">
          <span className="team-section__badge">
            <span className="team-section__badge-dot" />
            Our Team
          </span>
          <h2 className="team-section__title">
            Meet our <span className="team-section__title-highlight">Experts</span>
          </h2>
          <p className="team-section__subtitle">
            Dedicated educators and industry experts guiding the next generation of tech innovators.
          </p>
        </div>

        <div className="team-grid">
          {teamMembers.map((m) => (
            <div className={`team-member-card${m.photoUrl ? ' team-member-card--has-photo' : ''}`} key={m.id} style={m.cardBg ? { background: m.cardBg } : undefined}>
              {m.photoUrl ? (
                <div className="team-member-card__photo-wrapper" style={m.cardBg ? { background: m.cardBg } : undefined}>
                  <img src={m.photoUrl} alt={m.name} className="team-member-card__photo" />
                </div>
              ) : (
                <div className="team-member-card__avatar-area" style={{ background: `linear-gradient(135deg, ${m.color}18, ${m.color}08)` }}>
                  <div className="team-member-card__avatar" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)` }}>
                    <span className="team-member-card__initials">{m.initials}</span>
                  </div>
                </div>
              )}
              <h3 className="team-member-card__name">{m.name}</h3>
              <p className="team-member-card__position">{m.role}</p>
              <div className="team-member-card__social-links">
                {m.linkedinUrl && (
                  <a href={m.linkedinUrl} target="_blank" rel="noopener noreferrer" className="team-member-card__social-link" aria-label="LinkedIn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
                      <rect x="2" y="9" width="4" height="12" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </a>
                )}
                {m.email && (
                  <a href={`mailto:${m.email}`} className="team-member-card__social-link" aria-label="Email">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   GALLERY
   ═══════════════════════════════════════════════════════════ */
export const Gallery = () => (
  <section id="gallery" className="gallery-section">
    <div className="gallery-section__container">
      <div className="gallery-section__header">
        <span className="gallery-section__badge">
          <span className="gallery-section__badge-dot" />
          Photo Gallery
        </span>
        <h2 className="gallery-section__title">
          Moments We <span style={{color: '#2E3190', fontWeight: 700}}>Cherish</span>
        </h2>
        <p className="gallery-section__subtitle">
          A glimpse into campus life, events, and the vibrant community of Techie Blazers.
        </p>
      </div>

      <div className="gallery-grid">
        {galleryImages.map((img, i) => (
          <div className="gallery-image-card" key={i}>
            <img src={img.src} alt={img.title} className="gallery-image-card__image" loading="lazy" />
            <div className="gallery-image-card__overlay">
              <span className="gallery-image-card__title">{img.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

/* ═══════════════════════════════════════════════════════════
   ABOUT
   ═══════════════════════════════════════════════════════════ */
export const About = () => (
  <section id="about" className="about-section">
    <div className="about-section__container">
      <div className="about-section__header">
        <span className="about-section__badge">
          <span className="about-section__badge-dot" />
          About Us
        </span>
        <h2 className="about-section__title">
          Department of <span style={{color: '#E31B23', fontWeight: 700}}>CSBS</span>
        </h2>
        <p className="about-section__subtitle">
          Pioneering the intersection of computer science and business systems at VIT Bhimavaram.
        </p>
      </div>

      <div className="about-section__content">
        <div className="about-section__text-block">
          <h3 className="about-section__subheading">Our Vision</h3>
          <p className="about-section__paragraph">
            To be a center of excellence in Computer Science and Business Systems education,
            producing industry-ready professionals who can bridge the gap between technology
            and business strategy.
          </p>
          <h3 className="about-section__subheading">Our Mission</h3>
          <p className="about-section__paragraph">
            To provide world-class education combining computer science fundamentals with
            business acumen, foster innovation through research and hands-on learning, and
            prepare students for leadership roles in the digital economy.
          </p>
        </div>

        <div className="about-section__stats-container">
          <div className="about-stat-item">
            <span className="about-stat-item__icon">🎯</span>
            <span className="about-stat-item__value">2020</span>
            <span className="about-stat-item__label">Established</span>
          </div>
          <div className="about-stat-item">
            <span className="about-stat-item__icon">👨‍🎓</span>
            <span className="about-stat-item__value">500+</span>
            <span className="about-stat-item__label">Students</span>
          </div>
          <div className="about-stat-item">
            <span className="about-stat-item__icon">👨‍🏫</span>
            <span className="about-stat-item__value">20+</span>
            <span className="about-stat-item__label">Faculty</span>
          </div>
          <div className="about-stat-item">
            <span className="about-stat-item__icon">🔬</span>
            <span className="about-stat-item__value">5</span>
            <span className="about-stat-item__label">Labs</span>
          </div>
        </div>
      </div>
    </div>
  </section>
)

/* ═══════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════ */
export const Footer = () => (
  <footer className="footer-section">
    <div className="footer-section__container">
      <div className="footer-section__brand">
        <h3 className="footer-section__brand-title">TECHIE BLAZERS</h3>
        <p className="footer-section__brand-tagline">Computer Science &amp; Business Systems</p>
        <p className="footer-section__brand-description">
          Department of CSBS, Vishnu Institute of Technology, Bhimavaram, Andhra Pradesh.
        </p>
      </div>

      <div className="footer-section__column">
        <h4 className="footer-section__column-title">Quick Links</h4>
        <ul className="footer-section__links-list">
          <li><a href="#achievements" className="footer-section__link">Achievements</a></li>
          <li><a href="#events" className="footer-section__link">Events</a></li>
          <li><a href="#team" className="footer-section__link">Team</a></li>
          <li><a href="#gallery" className="footer-section__link">Gallery</a></li>
          <li><a href="#about" className="footer-section__link">About</a></li>
        </ul>
      </div>

      <div className="footer-section__column">
        <h4 className="footer-section__column-title">Contact</h4>
        <ul className="footer-section__links-list">
          <li className="footer-section__contact-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            csbs.vitb@gmail.com
          </li>
          <li className="footer-section__contact-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            VIT Bhimavaram, AP
          </li>
        </ul>
      </div>
    </div>

    <div className="footer-section__bottom">
      <p className="footer-section__copyright">
        © {new Date().getFullYear()} Techie Blazers — CSBS, VIT Bhimavaram. All rights reserved.
      </p>
    </div>
  </footer>
)
