'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { subscribeToSession, subscribeToActivity, type Session } from '@/lib/sessions'
import { TierList as TierListType, TierItem as TierItemType } from '@/types'
import { getList } from '@/lib/firestore'
import { TierRow } from '@/components/tier/TierRow'
import { TierItem } from '@/components/tier/TierItem'
import { SessionPanel } from '@/components/collab/SessionPanel'
import { ActivityFeed } from '@/components/collab/ActivityFeed'
import { useMemo } from 'react'

type Activity = {
  action: string
  uid: string
  data: unknown
  timestamp: string
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [list, setList] = useState<TierListType | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push(`/login?redirect=/session/${sessionId}`)
      return
    }

    const unsubscribeSession = subscribeToSession(sessionId, (session) => {
      setSession(session)
      setIsConnected(Boolean(session))
      setLoading(false)
    })

    const unsubscribeActivity = subscribeToActivity(sessionId, (activities) => {
      setActivities(activities as Activity[])
    })

    return () => {
      unsubscribeSession()
      unsubscribeActivity()
    }
  }, [sessionId, user, authLoading, router])

  useEffect(() => {
    let cancelled = false

    async function loadList() {
      if (!session) {
        setList(null)
        return
      }

      const listData = await getList(session.listId)
      if (!cancelled) setList(listData)
    }

    void loadList()

    return () => {
      cancelled = true
    }
  }, [session])

  const sortedTiers = useMemo(
    () => list ? [...list.tiers].sort((a, b) => a.order - b.order) : [],
    [list]
  )

  const itemsByTier = useMemo(() => {
    if (!list) return {}
    const map: Record<string, TierItemType[]> = {}
    list.tiers.forEach((t) => {
      map[t.id] = list.items.filter((i) => i.tierId === t.id).sort((a, b) => a.order - b.order)
    })
    map['bank'] = list.items
      .filter((i) => i.tierId === null)
      .sort((a, b) => a.order - b.order)
    return map
  }, [list])

  const handleLeave = async () => {
    router.push('/board')
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center">
        <Lock className="w-16 h-16 text-[#525252] mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Session not found</h1>
        <p className="text-[#a1a1a1] mb-6">This session may have expired.</p>
        <Link href="/" className="text-[#f97316] hover:underline">Go Home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={handleLeave} className="p-2 hover:bg-[#262626] rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">{list?.title || 'Session'}</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-[#525252]">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="space-y-2">
              {sortedTiers.map((tier) => (
                <TierRow key={tier.id} tier={tier} items={itemsByTier[tier.id] || []} />
              ))}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-white mb-4">Item Bank</h2>
              <div className="grid grid-cols-6 gap-3">
                {(itemsByTier['bank'] || []).map((item) => (
                  <TierItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>

          <div className="w-72 space-y-4">
            <SessionPanel session={session} onLeave={handleLeave} currentUserId={user?.uid} />
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </div>
    </div>
  )
}
