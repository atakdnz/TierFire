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
} from 'firebase/firestore'
import { db } from './firebase'
import { type TierList } from '@/types'

const LISTS_COLLECTION = 'tierlists'

function normalizeList(id: string, data: Partial<TierList> & Record<string, unknown>): TierList {
  const now = Date.now()
  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled Tier List',
    description: typeof data.description === 'string' ? data.description : '',
    isPublic: Boolean(data.isPublic),
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    tiers: Array.isArray(data.tiers) ? data.tiers : [],
    items: Array.isArray(data.items) ? data.items : [],
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : now,
  }
}

export async function createList(userId: string, title: string): Promise<string> {
  const docRef = await addDoc(collection(db, LISTS_COLLECTION), {
    ownerId: userId,
    title,
    description: '',
    isPublic: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tiers: [
      { id: 'tier-s', label: 'S', color: '#ef4444', order: 0 },
      { id: 'tier-a', label: 'A', color: '#f97316', order: 1 },
      { id: 'tier-b', label: 'B', color: '#eab308', order: 2 },
      { id: 'tier-c', label: 'C', color: '#22c55e', order: 3 },
      { id: 'tier-d', label: 'D', color: '#3b82f6', order: 4 },
      { id: 'tier-f', label: 'F', color: '#6b7280', order: 5 },
    ],
    items: [],
  })
  return docRef.id
}

export async function getList(listId: string): Promise<TierList | null> {
  const docSnap = await getDoc(doc(db, LISTS_COLLECTION, listId))
  if (!docSnap.exists()) return null
  return normalizeList(docSnap.id, docSnap.data())
}

export async function updateList(listId: string, data: Partial<TierList>): Promise<void> {
  await updateDoc(doc(db, LISTS_COLLECTION, listId), {
    ...data,
    updatedAt: Date.now(),
  })
}

export async function saveList(list: TierList): Promise<void> {
  await setDoc(doc(db, LISTS_COLLECTION, list.id), {
    ...list,
  }, { merge: true })
}

export async function deleteList(listId: string): Promise<void> {
  await deleteDoc(doc(db, LISTS_COLLECTION, listId))
}

export async function getUserLists(userId: string): Promise<TierList[]> {
  const q = query(
    collection(db, LISTS_COLLECTION),
    where('ownerId', '==', userId),
    orderBy('updatedAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => normalizeList(d.id, d.data()))
}

export async function getSharedList(listId: string): Promise<TierList | null> {
  const list = await getList(listId)
  if (!list) return null
  if (!list.isPublic) return null
  return list
}

export function subscribeToList(
  listId: string,
  callback: (list: TierList | null) => void
): () => void {
  const docRef = doc(db, LISTS_COLLECTION, listId)
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(normalizeList(snapshot.id, snapshot.data()))
    } else {
      callback(null)
    }
  })
}

export function subscribeToUserLists(
  userId: string,
  callback: (lists: TierList[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, LISTS_COLLECTION),
    where('ownerId', '==', userId),
    orderBy('updatedAt', 'desc')
  )

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => normalizeList(d.id, d.data())))
    },
    (error) => {
      onError?.(error)
    }
  )
}
