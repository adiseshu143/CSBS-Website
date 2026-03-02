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
    id: 'tech-symposium-2026',
    title: 'Tech Symposium 2026',
    tag: 'Symposium',
    date: '2026-03-15',
    endDate: '2026-03-16',
    time: '9:00 AM – 5:00 PM',
    location: 'Main Auditorium, VIT Bhimavaram',
    bannerImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=500&fit=crop',
    description:
      'Join us for the annual Tech Symposium 2026 — the flagship technology event of the CSBS department. Featuring keynote addresses from industry leaders, hands-on workshops covering cutting-edge technologies, live project exhibitions, panel discussions on AI & business strategy, and ample networking opportunities with tech professionals and alumni. This two-day event is designed to inspire, educate, and connect the brightest minds in computer science and business systems.',
    problemStatement:
      'Participants are challenged to build innovative solutions that bridge the gap between technology and real-world business problems. Projects should demonstrate practical applicability, scalability, and creative use of modern tech stacks.',
    problemBullets: [
      'Design a solution addressing a real-world business challenge',
      'Use at least one modern framework (React, Flutter, Django, etc.)',
      'Include a working prototype or demo',
      'Present a 10-minute pitch to the judging panel',
      'Focus on user experience and business viability',
    ],
    constraints: [
      { icon: '⏱️', label: 'Time Limit', value: '24 hours for hackathon track' },
      { icon: '💻', label: 'Tech Stack', value: 'Any modern framework allowed' },
      { icon: '📄', label: 'Submission', value: 'GitHub repo + live demo + PPT' },
      { icon: '⚖️', label: 'Judging', value: 'Innovation, Feasibility, Design, Presentation' },
    ],
    teamSizeMin: 2,
    teamSizeMax: 4,
    eligibility: 'All B.Tech students (any branch, any year)',
    registrationDeadline: '2026-03-10',
    prizePool: '₹50,000',
    contactName: 'Mr. Aravind K',
    contactEmail: 'csbs.vitb@gmail.com',
    contactPhone: '+91 98765 43210',
    organizedBy: 'Department of CSBS, VIT Bhimavaram',
    totalSlots: 200,
    registeredCount: 87,
    status: 'upcoming',
    createdAt: '2026-01-15',
  },
  {
    id: 'code-sprint-3',
    title: 'Code Sprint 3.0',
    tag: 'Hackathon',
    date: '2026-04-05',
    endDate: '2026-04-06',
    time: '10:00 AM – 10:00 AM (24h)',
    location: 'CS Lab Complex, VIT Bhimavaram',
    bannerImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=500&fit=crop',
    description:
      'Code Sprint 3.0 is a 24-hour non-stop coding marathon designed for passionate developers. Tackle real-world challenges, collaborate with talented peers, receive mentorship from industry experts, and compete for exciting cash prizes. Whether you\'re a beginner or an experienced coder, this hackathon has tracks for everyone.',
    problemStatement:
      'Build a full-stack application that solves a pressing problem in education, healthcare, or sustainability. Your solution must be deployable and demonstrate real impact potential.',
    problemBullets: [
      'Choose one track: Education, Healthcare, or Sustainability',
      'Build an end-to-end functional application',
      'Integrate at least one API or external service',
      'Deploy on any cloud platform',
      'Prepare a 5-minute demo video',
    ],
    constraints: [
      { icon: '⏱️', label: 'Time Limit', value: '24 hours continuous' },
      { icon: '💻', label: 'Tech Stack', value: 'Open — any language/framework' },
      { icon: '📄', label: 'Submission', value: 'GitHub + deployed link + video demo' },
      { icon: '⚖️', label: 'Judging', value: 'Functionality, Code Quality, Impact, Creativity' },
    ],
    teamSizeMin: 2,
    teamSizeMax: 4,
    eligibility: 'All B.Tech / M.Tech students',
    registrationDeadline: '2026-03-30',
    prizePool: '₹30,000',
    contactName: 'Prof. Sujatha M',
    contactEmail: 'csbs.vitb@gmail.com',
    contactPhone: '+91 98765 43211',
    organizedBy: 'Department of CSBS, VIT Bhimavaram',
    totalSlots: 100,
    registeredCount: 42,
    status: 'upcoming',
    createdAt: '2026-02-01',
  },
  {
    id: 'ai-ml-workshop',
    title: 'AI / ML Workshop',
    tag: 'Workshop',
    date: '2026-04-20',
    time: '9:30 AM – 4:30 PM',
    location: 'Seminar Hall, Block A, VIT Bhimavaram',
    bannerImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=500&fit=crop',
    description:
      'A comprehensive hands-on workshop covering artificial intelligence fundamentals, machine learning algorithms, neural network architectures, and real-world deployment strategies. Led by industry practitioners and academic researchers, this workshop equips you with the skills to build intelligent systems from scratch.',
    problemStatement:
      'Participants will work through guided exercises building an ML pipeline — from data preprocessing to model training and evaluation — culminating in a mini Kaggle-style competition.',
    problemBullets: [
      'Learn data preprocessing and feature engineering',
      'Implement classification and regression models',
      'Understand neural networks and deep learning basics',
      'Deploy a trained model as a REST API',
      'Compete in a live prediction challenge',
    ],
    constraints: [
      { icon: '⏱️', label: 'Duration', value: '1 day (7 hours)' },
      { icon: '💻', label: 'Prerequisites', value: 'Python basics, laptop required' },
      { icon: '📄', label: 'Materials', value: 'Provided — Jupyter notebooks + datasets' },
      { icon: '⚖️', label: 'Certificate', value: 'Participation certificate for all attendees' },
    ],
    teamSizeMin: 1,
    teamSizeMax: 1,
    eligibility: 'All students with basic Python knowledge',
    registrationDeadline: '2026-04-15',
    prizePool: 'Certificates + Goodies',
    contactName: 'Ms. Priya Sharma',
    contactEmail: 'csbs.vitb@gmail.com',
    organizedBy: 'Department of CSBS, VIT Bhimavaram',
    totalSlots: 60,
    registeredCount: 28,
    status: 'upcoming',
    createdAt: '2026-02-10',
  },
]
