import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import { type TierList, type TierItem, type Tier } from '@/types'

const SNAPSHOTS_COLLECTION = 'snapshots'

export interface Snapshot {
  id: string
  listId: string
  tiers: Tier[]
  items: TierItem[]
  note: string
  createdAt: string
}

export async function createSnapshot(
  listId: string,
  list: TierList,
  note: string = ''
): Promise<string> {
  const docRef = await addDoc(
    collection(db, 'tierlists', listId, SNAPSHOTS_COLLECTION),
    {
      listId,
      tiers: list.tiers,
      items: list.items,
      note,
      createdAt: new Date().toISOString(),
    }
  )
  return docRef.id
}

export async function getSnapshot(
  listId: string,
  snapshotId: string
): Promise<Snapshot | null> {
  const docRef = doc(db, 'tierlists', listId, SNAPSHOTS_COLLECTION, snapshotId)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Snapshot
}

export async function getListSnapshots(listId: string): Promise<Snapshot[]> {
  const q = query(
    collection(db, 'tierlists', listId, SNAPSHOTS_COLLECTION),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Snapshot))
}

export async function deleteSnapshot(listId: string, snapshotId: string): Promise<void> {
  const docRef = doc(db, 'tierlists', listId, SNAPSHOTS_COLLECTION, snapshotId)
  await deleteDoc(docRef)
}

export function subscribeToSnapshots(
  listId: string,
  callback: (snapshots: Snapshot[]) => void
): () => void {
  const q = query(
    collection(db, 'tierlists', listId, SNAPSHOTS_COLLECTION),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Snapshot)))
  })
}

export function getItemTierHistory(
  itemId: string,
  snapshots: Snapshot[]
): { tierId: string | null; date: string }[] {
  const history: { tierId: string | null; date: string }[] = []

  for (const snapshot of snapshots) {
    const item = snapshot.items.find((i) => i.id === itemId)
    if (item) {
      history.push({
        tierId: item.tierId,
        date: snapshot.createdAt,
      })
    }
  }

  return history.reverse()
}