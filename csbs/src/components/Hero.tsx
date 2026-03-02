import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const Hero = () => {
  const heroRef = useRef<HTMLElement>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const { openAuthModal } = useAuth()

  const slides = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=800&fit=crop',
      title: 'Innovation',
      description: 'Cutting-edge technology and ideas',
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=800&fit=crop',
      title: 'Technology',
      description: 'Building the future with code',
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=800&fit=crop',
      title: 'Leadership',
      description: 'Empowering the next generation',
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [slides.length])

  const goToSlide = (index: number) => setCurrentSlide(index)
  const goToPrevious = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  const goToNext = () => setCurrentSlide((prev) => (prev + 1) % slides.length)

  return (
    <section className="hero" ref={heroRef} aria-label="Welcome">
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
           Empowering future leaders through technology-driven strategy, intelligent systems, and transformative digital innovation, while fostering creativity, critical thinking, and real-world problem-solving to shape a smarter and more sustainable future.
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
            </button>
          </div>

          {/* Stats row */}
          <div className="hero__stats">
            <div className="hero__stat">
              <span className="hero__stat-number">500+</span>
              <span className="hero__stat-label">Students</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-number">50+</span>
              <span className="hero__stat-label">Events</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-number">20+</span>
              <span className="hero__stat-label">Projects</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Visual overlapping the curve boundary */}
        <div className="hero__visual">
          {/* Carousel */}
          <div className="hero__carousel">
            <div className="hero__carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {slides.map((slide) => (
                <div key={slide.id} className="hero__carousel-slide">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="hero__carousel-image"
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
