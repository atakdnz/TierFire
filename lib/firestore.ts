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
} from 'firebase/firestore'
import { db } from './firebase'
import { type TierList } from '@/types'

const LISTS_COLLECTION = 'tierlists'

export async function createList(userId: string, title: string): Promise<string> {
  const docRef = await addDoc(collection(db, LISTS_COLLECTION), {
    ownerId: userId,
    title,
    description: '',
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
  return { id: docSnap.id, ...docSnap.data() } as TierList
}

export async function updateList(listId: string, data: Partial<TierList>): Promise<void> {
  await updateDoc(doc(db, LISTS_COLLECTION, listId), {
    ...data,
    updatedAt: new Date().toISOString(),
  })
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
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TierList))
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
      callback({ id: snapshot.id, ...snapshot.data() } as TierList)
    } else {
      callback(null)
    }
  })
}