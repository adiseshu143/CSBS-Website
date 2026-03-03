/**
 * Home Page Sections — Achievements, Events, Team, Gallery, About, Footer
 * Each section has a proper `id` for anchor link scrolling from the Navbar.
 * Includes scroll-reveal animations for a premium feel.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEvents } from '../hooks/useEvents'
import { getEventRegistrationCount } from '../api/eventApi'
import { getTeamMembers } from '../api/teamApi'
import type { TeamMember } from '../api/teamApi'
import EventCard from './EventCard'

/* ── Scroll-reveal hook (animate once on viewport entry) ── */
const useReveal = (threshold = 0.12) => {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold, rootMargin: '0px 0px -30px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, cls: visible ? 'reveal reveal--visible' : 'reveal' }
}

/* ── Data ──────────────────────────────────────────────── */

const achievements = [
  { icon: '🏆', number: '25+', title: 'Hackathon Wins', desc: 'First place victories in national & state-level competitions' },
  { icon: '🎓', number: '95%', title: 'Placement Rate', desc: 'Consistent placement record with top tech companies' },
  { icon: '📄', number: '50+', title: 'Research Papers', desc: 'Published in international journals & conferences' },
  { icon: '💡', number: '100+', title: 'Student Projects', desc: 'Innovative projects solving real-world problems' },
]

const galleryImages = [
  { src: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515192/dqdvsbpwymyv3se6vl6z.jpg', title: 'Treasure Hunt', position: 'center' },
  { src: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515218/a1v7tuponx0n8wiyxmbw.jpg', title: 'Quiz Context', position: 'top' },
  { src: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515238/uoffwvfup2coxpqqmiuj.jpg', title: 'Mentoring Session', position: 'top' },
  { src: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515178/u22e9zianrwoysfapaaq.jpg', title: 'Games', position: 'bottom' },
  { src: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515535/zuw1db8uiyt4yjwtnove.jpg', title: 'Team Strategic Game', position: 'top' },
  { src: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515313/syb0jjeixhatiprlzkqr.jpg', title: 'Games', position: 'top' },
  { src: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515832/xntkrxrfnnog8x5orrtg.jpg', title: 'Guidance', position: 'top' },
  { src: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515205/hexepks0wrpo8eclpnhh.jpg', title: 'Behind CSBS', position: 'center' },
]

// Fallback team data (if Firebase fails)
const defaultTeamMembers: TeamMember[] = [
  { id: '1', name: 'Dr. M. Venu Gopal', role: 'Principal', initials: 'VG', color: '#EB4D28',photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772477662/wtuspythd2g4vlcjvngb.jpg', cardBg: '#E5D0E5', linkedinUrl: 'https://linkedin.com/in/', email: 'ramesh.kumar@vishnu.edu.in' },
  { id: '2', name: 'M. Sri lakshmi', role: 'Vice Principal', initials: 'SL', color: '#2E3190', cardBg: '#ECEDF8', linkedinUrl: 'https://linkedin.com/in/', email: 'sujatha.m@vishnu.edu.in' },
  { id: '3', name: 'P. Archana', role: 'Faculty Organizer', initials: 'PA', color: '#2E3190', photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772477610/y0rhvcfknqg7pldt5i68.jpg', cardBg: '#FACBE5', linkedinUrl: 'https://linkedin.com/in/', email: 'sujatha.m@vishnu.edu.in' },
  { id: '4', name: 'N. Murari', role: 'Organizer', initials: 'NM', color: '#10B981',photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772518899/zqe23rcobq13anitcccq.jpg', cardBg: '#e5dbc2', linkedinUrl: 'https://www.linkedin.com/in/n-murari-33651b300?utm_source=share_via&utm_content=profile&utm_medium=member_android', email: '23pa1a5737@vishnu.edu.in' },
  { id: '5', name: 'S. Vijaya Lakshmi', role: 'Co-Organizer', initials: 'VL', color: '#8B5CF6', photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772477662/wtuspythd2g4vlcjvngb.jpg', cardBg: '#E5D0E5', linkedinUrl: 'https://linkedin.com/in/', email: 'priya.sharma@vishnu.edu.in' },
  { id: '6', name: 'B. Pallavi', role: 'Event Management', initials: 'BP', color: '#EF4444', photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772477648/kr3tqvfchk4crueraw1q.jpg', cardBg: '#E5FAFA', linkedinUrl: 'https://linkedin.com/in/', email: '23pa1a5705@vishnu.edu.in' },
  { id: '7', name: 'T. Hari Teja', role: 'Marketing', initials: 'HT', color: '#EC4899',photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515024/ikpt2wtgf5o1tczknq5u.jpg', cardBg: '#a095b8', linkedinUrl: 'https://www.linkedin.com/in/thota-hariteja-199313342?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app', email: '23pa1a5755@vishnu.edu.in' },
  { id: '8', name: 'H. Adiseshu', role: 'Technical Lead', initials: 'HA', color: '#EC4899', photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772472453/waxowu1rwrmac4ofupcd.jpg', cardBg: '#F0EAE0', linkedinUrl: 'https://www.linkedin.com/in/adiseshu-hanumanthu', email: '24pa1a5723@vishnu.edu.in' },
  { id: '9', name: 'G. Akhil', role: 'Technical Co-Lead', initials: 'GA', color: '#EC4899', photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772477589/l1okzxtglbjghhe9zdwb.jpg', cardBg: '#EAC6DB', linkedinUrl: 'https://www.linkedin.com/in/grandhi-n-v-s-akhil-962997342?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', email: '24pa1a5721@vishnu.edu.in' },
  { id: '10', name: 'V. Pranav Sai Bhagath', role: 'Technical Associate', initials: 'PS', color: '#EC4899', photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772477738/saxzk3jpcgav1zmyylff.jpg', cardBg: '#F5F0D0', linkedinUrl: 'https://www.linkedin.com/in/pranav-sai-bhagath?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', email: '24pa1a5762@vishnu.edu.in' },
  { id: '11', name: 'P.Kartheek', role: 'PR Lead', initials: 'PK', color: '#EC4899',photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772478843/msjhhdbrgmmhyreai0c0.jpg', cardBg: '#FAE5DB', linkedinUrl: 'https://linkedin.com/in/', email: '24pa1a5754@vishnu.edu.in' },
  { id: '12', name: 'Harshika', role: 'Communication Lead', initials: 'HS', color: '#EC4899', photoUrl: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772477634/iszrfogf01sgdwe3fl7n.jpg', cardBg: '#D0E0F0', linkedinUrl: 'https://www.linkedin.com/in/harshika-kilaru-40b98132b?originalSubdomain=in', email: '24pa1a5734@vishnu.edu.in' },
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
export const Achievements = () => {
  const r = useReveal()
  return (
  <section id="achievements" className="achievements-section">
    <div className={`achievements-section__container ${r.cls}`} ref={r.ref}>
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
          <div className="achievement-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
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
}

/* ═══════════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════════ */
export const FAQ = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const r = useReveal()

  return (
    <section id="faq" className="faq-section">
      <div className={`faq-section__container ${r.cls}`} ref={r.ref}>
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
  const r = useReveal()

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
      <div className={`team-section__container ${r.cls}`} ref={r.ref}>
        <div className="team-section__header">
          <span className="team-section__badge">
            <span className="team-section__badge-dot" />
            Our Team
          </span>
          <h2 className="team-section__title">
            Meet our <span className="team-section__title-highlight">Team</span>
          </h2>
          <p className="team-section__subtitle">
           Academic leaders dedicated to empowering tomorrow’s tech professionals.
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
export const Gallery = () => {
  const r = useReveal()
  return (
  <section id="gallery" className="gallery-section">
    <div className={`gallery-section__container ${r.cls}`} ref={r.ref}>
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
            <img src={img.src} alt={img.title} className="gallery-image-card__image" loading="lazy" style={{ objectPosition: img.position }} />
            <div className="gallery-image-card__overlay">
              <span className="gallery-image-card__title">{img.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   ABOUT
   ═══════════════════════════════════════════════════════════ */
export const About = () => {
  const r = useReveal()
  return (
  <section id="about" className="about-section">
    <div className={`about-section__container ${r.cls}`} ref={r.ref}>
      <div className="about-section__header">
        <span className="about-section__badge">
          <span className="about-section__badge-dot" />
          About Us
        </span>
        <h2 className="about-section__title">
          Department of <span style={{color: '#E31B23', fontWeight: 700}}>CSBS</span>
        </h2>
        <p className="about-section__subtitle">
          Driving innovation by blending technical expertise with strategic business thinking.
        </p>
      </div>

      <div className="about-section__content">
        <div className="about-section__text-block">
          <h3 className="about-section__subheading">Our Vision</h3>
          <p className="about-section__paragraph">
            To be a transformative center of excellence in Computer Science and Business Systems, nurturing innovation, leadership, and entrepreneurial mindset to create future-ready professionals who drive technological and business advancement.
          </p>
          <h3 className="about-section__subheading">Our Mission</h3>
          <p className="about-section__paragraph">
           To be a premier center of excellence in Computer Science and Business Systems education, empowering students with technological expertise, strategic thinking, and innovative mindset to lead and shape the future digital economy.
          </p>
        </div>

        <div className="about-section__stats-container">
          <div className="about-stat-item">
            <span className="about-stat-item__icon">🎯</span>
            <span className="about-stat-item__value">2022</span>
            <span className="about-stat-item__label">Established</span>
          </div>
          <div className="about-stat-item">
            <span className="about-stat-item__icon">👨‍🎓</span>
            <span className="about-stat-item__value">50+</span>
            <span className="about-stat-item__label">Students</span>
          </div>
          <div className="about-stat-item">
            <span className="about-stat-item__icon">👨‍🏫</span>
            <span className="about-stat-item__value">10+</span>
            <span className="about-stat-item__label">Faculty</span>
          </div>
          <div className="about-stat-item">
            <span className="about-stat-item__icon">🎓</span>
            <span className="about-stat-item__value">5+</span>
            <span className="about-stat-item__label">Academic Mentors</span>
          </div>
        </div>
      </div>
    </div>
  </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════ */
export const Footer = () => {
  const r = useReveal(0.08)
  return (
  <footer className="footer-section">
    <div className={`footer-section__container ${r.cls}`} ref={r.ref}>
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
}
