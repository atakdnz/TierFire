'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { type TierList } from '@/types'
import {
  createSnapshot,
  getItemTierHistory,
  getListSnapshots,
  deleteSnapshot,
  type Snapshot,
} from '@/lib/snapshots'
import { generateId } from '@/lib/utils'

const LOCAL_SNAPSHOT_PREFIX = 'tierfire_snapshots'
const MAX_LOCAL_SNAPSHOTS = 20

export function useHistory(list: TierList | null) {
  const { user } = useAuth()
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!list) {
      setSnapshots([])
      setLoading(false)
      return
    }

    if (!user || !list.ownerId) {
      setSnapshots(readLocalSnapshots(list.id))
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    getListSnapshots(list.id)
      .then((snapshots) => {
        if (cancelled) return
        setSnapshots(snapshots)
      })
      .catch((error) => {
        console.error('Failed to load snapshots:', error)
        if (!cancelled) setSnapshots([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [list, user])

  const saveSnapshot = useCallback(
    async (note: string = '') => {
      if (!list) return

      if (user && list.ownerId) {
        await createSnapshot(list.id, list, note)
        setSnapshots(await getListSnapshots(list.id))
        return
      }

      const snapshot: Snapshot = {
        id: generateId(),
        listId: list.id,
        tiers: list.tiers,
        items: list.items,
        note,
        createdAt: new Date().toISOString(),
      }
      const nextSnapshots = [snapshot, ...readLocalSnapshots(list.id)].slice(0, MAX_LOCAL_SNAPSHOTS)
      writeLocalSnapshots(list.id, nextSnapshots)
      setSnapshots(nextSnapshots)
    },
    [list, user]
  )

  const removeSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!list) return
      if (!user || !list.ownerId) {
        const nextSnapshots = readLocalSnapshots(list.id).filter((snapshot) => snapshot.id !== snapshotId)
        writeLocalSnapshots(list.id, nextSnapshots)
        setSnapshots(nextSnapshots)
        return
      }
      await deleteSnapshot(list.id, snapshotId)
      setSnapshots(await getListSnapshots(list.id))
    },
    [list, user]
  )

  const getItemHistory = useCallback(
    (itemId: string) => {
      return getItemTierHistory(itemId, snapshots)
    },
    [snapshots]
  )

  const restoreSnapshot = useCallback(
    async (snapshot: Snapshot): Promise<TierList> => {
      return {
        ...list!,
        tiers: snapshot.tiers,
        items: snapshot.items,
        updatedAt: Date.now(),
      }
    },
    [list]
  )

  return {
    snapshots,
    loading,
    saveSnapshot,
    removeSnapshot,
    getItemHistory,
    restoreSnapshot,
  }
}

function getLocalSnapshotKey(listId: string) {
  return `${LOCAL_SNAPSHOT_PREFIX}_${listId}`
}

function readLocalSnapshots(listId: string): Snapshot[] {
  try {
    const stored = localStorage.getItem(getLocalSnapshotKey(listId))
    if (!stored) return []
    return JSON.parse(stored) as Snapshot[]
  } catch {
    return []
  }
}

function writeLocalSnapshots(listId: string, snapshots: Snapshot[]) {
  localStorage.setItem(getLocalSnapshotKey(listId), JSON.stringify(snapshots))
}
