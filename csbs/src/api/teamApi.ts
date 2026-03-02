import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export interface TeamMember {
  id?: string
  name: string
  role: string
  initials: string
  color: string
  photoUrl?: string
  cardBg?: string
  linkedinUrl?: string
  githubUrl?: string
  email?: string
  createdAt?: Timestamp
}

const TEAM_COLLECTION = 'teamMembers'

/**
 * Fetch all team members from Firestore
 */
export const getTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const q = query(collection(db, TEAM_COLLECTION), orderBy('createdAt', 'asc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as TeamMember))
  } catch (error) {
    console.error('Error fetching team members:', error)
    throw error
  }
}

/**
 * Add a new team member
 */
export const addTeamMember = async (member: TeamMember): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, TEAM_COLLECTION), {
      name: member.name.trim(),
      role: member.role.trim(),
      initials: member.initials.toUpperCase().trim(),
      color: member.color,
      linkedinUrl: member.linkedinUrl?.trim() || '',
      githubUrl: member.githubUrl?.trim() || '',
      email: member.email?.trim() || '',
      createdAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error adding team member:', error)
    throw error
  }
}

/**
 * Update an existing team member
 */
export const updateTeamMember = async (id: string, member: Partial<TeamMember>): Promise<void> => {
  try {
    const docRef = doc(db, TEAM_COLLECTION, id)
    const updateData: any = {}

    if (member.name) updateData.name = member.name.trim()
    if (member.role) updateData.role = member.role.trim()
    if (member.initials) updateData.initials = member.initials.toUpperCase().trim()
    if (member.color) updateData.color = member.color
    if (member.linkedinUrl !== undefined) updateData.linkedinUrl = member.linkedinUrl?.trim() || ''
    if (member.githubUrl !== undefined) updateData.githubUrl = member.githubUrl?.trim() || ''
    if (member.email !== undefined) updateData.email = member.email?.trim() || ''

    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('Error updating team member:', error)
    throw error
  }
}

/**
 * Delete a team member
 */
export const deleteTeamMember = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, TEAM_COLLECTION, id))
  } catch (error) {
    console.error('Error deleting team member:', error)
    throw error
  }
}
