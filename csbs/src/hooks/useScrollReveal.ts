import { useEffect, useRef, useState } from 'react'

/**
 * useScrollReveal — Triggers CSS class when element enters viewport
 * Provides smooth scroll-based reveal animations for sections.
 */
export const useScrollReveal = (threshold = 0.15) => {
  const ref = useRef<HTMLElement>(null)
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true)
          observer.unobserve(el) // Only animate once
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isRevealed }
}

/**
 * useParallax — Simple parallax scroll offset
 */
export const useParallax = (speed = 0.3) => {
  const ref = useRef<HTMLElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const scrolled = window.innerHeight - rect.top
      if (scrolled > 0) {
        setOffset(scrolled * speed)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  return { ref, offset }
}
