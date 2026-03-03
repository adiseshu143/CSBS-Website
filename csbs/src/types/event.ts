/**
 * Event & Registration TypeScript interfaces
 * Used across EventDetailsPage, RegistrationModal, and Firestore queries
 */

/** Media item stored in Firestore (from Cloudinary) */
export interface MediaItem {
  secure_url: string
  public_id: string
  resource_type: 'image' | 'video' | 'raw'
  format?: string
  width?: number
  height?: number
}

export interface EventData {
  id: string
  title: string
  tag: 'Workshop' | 'Hackathon' | 'Symposium' | 'Seminar' | 'Competition' | string
  date: string
  endDate?: string
  time: string
  location: string
  bannerImage: string
  /** Cloudinary public_id for optimized delivery */
  bannerPublicId?: string
  /** Additional media gallery (images/videos) from Cloudinary */
  mediaGallery?: MediaItem[]
  /** Optional video URL from Cloudinary */
  videoURL?: string
  shortDescription?: string
  description: string
  problemStatement?: string
  problemBullets?: string[]
  constraints?: ConstraintItem[]
  teamSizeMin: number
  teamSizeMax: number
  eligibility: string
  registrationDeadline: string
  prizePool?: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  organizedBy: string
  totalSlots?: number
  registeredCount?: number
  status: 'upcoming' | 'ongoing' | 'completed'
  createdAt: string
}

export interface ConstraintItem {
  icon: string
  label: string
  value: string
}

export interface EventRegistration {
  id?: string
  userId: string
  eventId: string
  teamName: string
  teamMembers: string[]
  phone: string
  registeredAt: string
  ticketNumber?: string
}

/**
 * Static event data for demo purposes.
 * In production, this data comes from Firestore `events` collection.
 */
export const DEMO_EVENTS: EventData[] = [
  {
    id: 'strat-a-thon-1',
    title: 'STRAT-A-THON 1.0',
    tag: 'Hackathon',
    date: '2026-03-04',
    endDate: '2026-03-05',
    time: '10:00 AM – 10:00 AM (24h)',
    location: 'C Block, VIT Bhimavaram',
    bannerImage: 'https://res.cloudinary.com/dapwxfafn/image/upload/v1772515192/dqdvsbpwymyv3se6vl6z.jpg',
    description:
      'STRAT-A-THON 1.0 is a 24-hour hackathon organized by the Techie-Blazers Club of Vishnu Institute of Technology, where strategy meets innovation. This high-energy event challenges teams of four to brainstorm, build, and battle it out with impactful ideas. It\'s a platform for smart minds to collaborate, compete, and turn bold strategies into real-world solutions. Whether you\'re a strategist, developer, or designer, this hackathon offers the perfect blend of innovation, competition, and learning.',
    problemStatement:
      'Teams are challenged to develop creative solutions that merge business strategy with technical innovation. Your solution should demonstrate strategic thinking, practical implementation, and scalable impact potential.',
    problemBullets: [
      'Brainstorm and conceptualize an innovative business or tech idea',
      'Build a functional prototype or proof-of-concept within 24 hours',
      'Leverage strategy, technology, and creativity to solve real-world challenges',
      'Present a compelling pitch demonstrating your idea\'s impact and viability',
      'Compete with teams from across VIT Bhimavaram for prizes and recognition',
    ],
    constraints: [
      { icon: '⏱️', label: 'Duration', value: '24 hours continuous' },
      { icon: '👥', label: 'Team Size', value: '4 members per team' },
      { icon: '💡', label: 'Focus', value: 'Strategy meets Innovation & Hacking' },
      { icon: '🏆', label: 'Judging', value: 'Innovation, Strategy, Execution, Presentation' },
    ],
    teamSizeMin: 4,
    teamSizeMax: 4,
    eligibility: 'All B.Tech / M.Tech students of VIT Bhimavaram',
    registrationDeadline: '2026-03-02',
    prizePool: 'Cash Prizes + Recognition',
    contactName: 'N. Murari',
    contactEmail: 'csbs.vitb@gmail.com',
    contactPhone: '+91 94915 99995',
    organizedBy: 'Techie-Blazers Club, Department of CSBS, VIT Bhimavaram',
    totalSlots: 80,
    registeredCount: 0,
    status: 'upcoming',
    createdAt: '2026-02-20',
  },
]
