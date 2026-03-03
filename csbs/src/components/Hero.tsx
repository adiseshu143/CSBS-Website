import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

/* ── Cloudinary responsive URL helper ── */
const cloudinaryResponsive = (url: string, width: number, quality = 'auto') => {
  // Insert Cloudinary transforms after /upload/
  return url.replace('/upload/', `/upload/w_${width},f_auto,q_${quality}/`)
}

/* ── Animated counter hook (uses requestAnimationFrame for perf) ── */
const useCountUp = (end: number, duration = 2000, suffix = '') => {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true) },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    let startTime: number | null = null
    let rafId: number
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [started, end, duration])

  return { count: `${count}${suffix}`, ref }
}

const Hero = () => {
  const heroRef = useRef<HTMLElement>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const { openAuthModal } = useAuth()

  // Detect mobile once for responsive image sizing
  const isMobile = useMemo(() => window.innerWidth <= 768, [])

  const slides = useMemo(() => [
    {
      id: 1,
      image: cloudinaryResponsive('https://res.cloudinary.com/dapwxfafn/image/upload/v1772505233/qjwrmosrliuxg8rkkwwm.webp', isMobile ? 800 : 1200),
      title: 'VIT Bhimavaram',
      description: 'A hub of innovation and learning in the heart of Andhra Pradesh',
      duration: 5000,
      objectPosition: 'center center',
    },
    {
      id: 2,
      image: cloudinaryResponsive('https://res.cloudinary.com/dapwxfafn/image/upload/v1772504918/nxsyoflhtezbnemhgfry.jpg', isMobile ? 800 : 1200),
      title: 'Behind the CSBS',
      description: 'Building the future of tech education at VIT Bhimavaram',
      duration: 5000,
      objectPosition: 'center 40%',
    },
    {
      id: 3,
      image: cloudinaryResponsive('https://res.cloudinary.com/dapwxfafn/image/upload/v1772505507/z8iavybzfh8zxverqslz.png', isMobile ? 800 : 1200),
      title: 'Computer Science & Business Systems',
      description: 'Empowering students with the skills and mindset to lead in the digital economy',
      duration: 5000,
      objectPosition: 'center center',
      objectFit: 'contain' as const,
    },
  ], [isMobile])

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Auto-advance carousel with per-slide duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, slides[currentSlide].duration)
    return () => clearTimeout(timeout)
  }, [currentSlide, slides])

  const goToSlide = useCallback((index: number) => setCurrentSlide(index), [])
  const goToPrevious = useCallback(() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length), [slides.length])
  const goToNext = useCallback(() => setCurrentSlide((prev) => (prev + 1) % slides.length), [slides.length])

  // Animated counters
  const students = useCountUp(100, 1000, '+')
  const events = useCountUp(25, 1400, '+')
  const projects = useCountUp(15, 1400, '+')

  return (
    <section className={`hero ${isVisible ? 'hero--visible' : ''}`} ref={heroRef} aria-label="Welcome">
      {/* Floating particles background */}
      <div className="hero__particles" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <span key={i} className={`hero__particle hero__particle--${i + 1}`} />
        ))}
      </div>

      <div className="hero__grid">
        {/* LEFT — Text Content */}
        <div className="hero__content">
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            <span>Department of CSBS — VIT Bhimavaram</span>
          </div>

          <h1 className="hero__title">
            Center for Smart{' '}
            <span className="hero__title-gradient">Business Solutions</span>{' '}
            & Digital Innovation — VIT-B
          </h1>

          <p className="hero__subtitle">
            Empowering future leaders through technology-driven strategy, intelligent systems,
            and transformative digital innovation — fostering creativity, critical thinking,
            and real-world problem-solving to shape a smarter, more sustainable future.
          </p>

          <div className="hero__actions">
            <a href="#events" className="hero__btn hero__btn--primary">
              <span>View Events</span>
              <svg className="hero__btn-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
            <button type="button" onClick={() => openAuthModal()} className="hero__btn hero__btn--secondary">
              <span>Join Community</span>
              <svg className="hero__btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>
          </div>

          {/* Animated Stats row */}
          <div className="hero__stats">
            <div className="hero__stat">
              <span className="hero__stat-number" ref={students.ref}>{students.count}</span>
              <span className="hero__stat-label">Students</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-number" ref={events.ref}>{events.count}</span>
              <span className="hero__stat-label">Events</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-number" ref={projects.ref}>{projects.count}</span>
              <span className="hero__stat-label">Faculty</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Visual with enhanced carousel */}
        <div className="hero__visual">
          <div className="hero__carousel">
            <div className="hero__carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {slides.map((slide, index) => (
                <div key={slide.id} className="hero__carousel-slide">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="hero__carousel-image"
                    width={isMobile ? 800 : 1200}
                    height={isMobile ? 450 : 675}
                    loading={index < 2 ? 'eager' : 'lazy'}
                    decoding={index === 0 ? 'sync' : 'async'}
                    fetchPriority={index === 0 ? 'high' : undefined}
                    style={{
                      objectPosition: slide.objectPosition,
                      objectFit: slide.objectFit || 'cover',
                      background: slide.objectFit === 'contain' ? 'linear-gradient(180deg, #1a1035 0%, #0f1a2e 40%, #0f1a2e 60%, #1a1035 100%)' : undefined,
                    }}
                  />
                  <div className="hero__carousel-overlay">
                    <div className="hero__carousel-content">
                      <span className="hero__carousel-text">{slide.title}</span>
                      <span className="hero__carousel-desc">{slide.description}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="hero__carousel-progress">
              <div
                className="hero__carousel-progress-bar"
                key={currentSlide}
                style={{ animationDuration: `${slides[currentSlide].duration}ms` }}
              />
            </div>

            {/* Arrow Navigation */}
            <button
              className="hero__carousel-arrow hero__carousel-arrow--left"
              onClick={goToPrevious}
              aria-label="Previous slide"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              className="hero__carousel-arrow hero__carousel-arrow--right"
              onClick={goToNext}
              aria-label="Next slide"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Dots */}
            <div className="hero__carousel-dots">
              {slides.map((_, index) => (
                <button
                  key={index}
                  className={`hero__carousel-dot ${index === currentSlide ? 'hero__carousel-dot--active' : ''}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
