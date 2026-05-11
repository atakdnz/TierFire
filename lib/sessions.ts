import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { type TierList, type TierItem, type Tier } from '@/types'

const SESSIONS_COLLECTION = 'sessions'

export interface Participant {
  uid: string
  displayName: string
  avatarUrl: string
  color: string
  status: 'online' | 'idle' | 'offline'
}

export interface Session {
  id: string
  hostId: string
  listId: string
  mode: 'shared' | 'sidebyside'
  participants: Participant[]
  createdAt: string
  expiresAt: string
}

const participantColors = [
  '#ef4444', '#f97316', '#22c55e', '#3b82f6', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'
]

export async function createSession(
  hostId: string,
  hostName: string,
  hostAvatar: string,
  listId: string,
  mode: 'shared' | 'sidebyside' = 'shared'
): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 1)

  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
    hostId,
    listId,
    mode,
    participants: [{
      uid: hostId,
      displayName: hostName,
      avatarUrl: hostAvatar,
      color: participantColors[0],
      status: 'online',
    }],
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  })

  return docRef.id
}

export async function joinSession(
  sessionId: string,
  uid: string,
  displayName: string,
  avatarUrl: string
): Promise<Session | null> {
  const sessionDoc = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId))
  if (!sessionDoc.exists()) return null

  const sessionData = sessionDoc.data()
  const session: Session = {
    id: sessionId,
    hostId: sessionData.hostId,
    listId: sessionData.listId,
    mode: sessionData.mode,
    participants: sessionData.participants,
    createdAt: sessionData.createdAt,
    expiresAt: sessionData.expiresAt,
  }
  
  const existingParticipant = session.participants.find(p => p.uid === uid)
  if (!existingParticipant) {
    const color = participantColors[session.participants.length % participantColors.length]
    session.participants.push({
      uid,
      displayName,
      avatarUrl,
      color,
      status: 'online',
    })
    await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), { participants: session.participants })
  }

  return session
}

export async function leaveSession(sessionId: string, uid: string): Promise<void> {
  const sessionDoc = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId))
  if (!sessionDoc.exists()) return

  const sessionData = sessionDoc.data()
  const participants = sessionData.participants.filter((p: Participant) => p.uid !== uid)
  
  if (participants.length === 0) {
    await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId))
  } else {
    await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), { participants })
  }
}

export async function endSession(sessionId: string, uid: string): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId)
  const sessionDoc = await getDoc(sessionRef)
  if (!sessionDoc.exists()) return

  const sessionData = sessionDoc.data()
  if (sessionData.hostId !== uid) {
    await leaveSession(sessionId, uid)
    return
  }

  await deleteDoc(sessionRef)
}

export async function updateParticipantStatus(
  sessionId: string,
  uid: string,
  status: 'online' | 'idle' | 'offline'
): Promise<void> {
  const sessionDoc = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId))
  if (!sessionDoc.exists()) return

  const sessionData = sessionDoc.data()
  const participants = sessionData.participants.map((p: Participant) => {
    if (p.uid === uid) {
      return { ...p, status }
    }
    return p
  })
  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), { participants })
}

export async function broadcastUpdate(
  sessionId: string,
  action: 'item_moved' | 'item_added' | 'item_removed' | 'tier_updated',
  uid: string,
  data: any
): Promise<void> {
  const timestamp = new Date().toISOString()
  await addDoc(collection(db, SESSIONS_COLLECTION, sessionId, 'activity'), {
    action,
    uid,
    data,
    timestamp,
  })
}

export function subscribeToSession(
  sessionId: string,
  callback: (session: Session | null) => void
): () => void {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId)
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data()
      delete data.id
      callback({ id: snapshot.id, ...data } as Session)
    } else {
      callback(null)
    }
  })
}

export function subscribeToActivity(
  sessionId: string,
  callback: (activity: any[]) => void
): () => void {
  const q = query(
    collection(db, SESSIONS_COLLECTION, sessionId, 'activity'),
    orderBy('timestamp', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => d.data()))
  })
}
