'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { type TierList, type TierItem, type Tier } from '@/types'
import {
  createSnapshot,
  getListSnapshots,
  getItemTierHistory,
  deleteSnapshot,
  subscribeToSnapshots,
  type Snapshot,
} from '@/lib/snapshots'
import { createNewList, generateId } from '@/lib/utils'

const AUTO_SNAPSHOT_DELAY = 10 * 60 * 1000

export function useHistory(list: TierList | null) {
  const { user } = useAuth()
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [lastAutoSnapshot, setLastAutoSnapshot] = useState<number>(0)

  useEffect(() => {
    if (!list || !user) {
      setSnapshots([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToSnapshots(list.id, (snapshots) => {
      setSnapshots(snapshots)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [list?.id, user])

  const saveSnapshot = useCallback(
    async (note: string = '') => {
      if (!list || !user) return

      await createSnapshot(list.id, list, note)
      setLastAutoSnapshot(Date.now())
    },
    [list, user]
  )

  const removeSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!list) return
      await deleteSnapshot(list.id, snapshotId)
    },
    [list]
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