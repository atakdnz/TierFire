'use client'

import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import {
  createSession,
  joinSession,
  leaveSession,
  broadcastUpdate,
  type Session,
} from '@/lib/sessions'
import { type TierList } from '@/types'

type SessionActivity = {
  action: string
  uid: string
  data: unknown
  timestamp: string
}

export function useSession(list: TierList | null) {
  const { user } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [activity] = useState<SessionActivity[]>([])
  const [loading, setLoading] = useState(false)

  const createCollabSession = useCallback(async () => {
    if (!user || !list) return null
    setLoading(true)
    try {
      const sessionId = await createSession(
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'Anonymous',
        user.photoURL || '',
        list.id
      )
      return sessionId
    } finally {
      setLoading(false)
    }
  }, [user, list])

  const joinCollabSession = useCallback(async (sessionId: string) => {
    if (!user) return
    setLoading(true)
    try {
      const session = await joinSession(
        sessionId,
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'Anonymous',
        user.photoURL || ''
      )
      setSession(session)
    } finally {
      setLoading(false)
    }
  }, [user])

  const leaveCollabSession = useCallback(async () => {
    if (!session || !user) return
    await leaveSession(session.id, user.uid)
    setSession(null)
  }, [session, user])

  const broadcastAction = useCallback(async (
    action: 'item_moved' | 'item_added' | 'item_removed' | 'tier_updated',
    data: unknown
  ) => {
    if (!session || !user) return
    await broadcastUpdate(session.id, action, user.uid, data)
  }, [session, user])

  return {
    session,
    activity,
    loading,
    createCollabSession,
    joinCollabSession,
    leaveCollabSession,
    broadcastAction,
  }
}
