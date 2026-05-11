'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import { TierList as TierListType, TierItem as TierItemType } from '@/types'
import { TierRow } from '@/components/tier/TierRow'
import { getList } from '@/lib/firestore'

export default function SharedListPage() {
  const params = useParams()
  const router = useRouter()
  const listId = params.id as string
  
  const [list, setList] = useState<TierListType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadList() {
      try {
        const data = await getList(listId)
        if (!data) {
          setError('List not found')
        } else if (!data.isPublic) {
          setError('This list is private')
        } else {
          setList(data)
        }
      } catch {
        setError('Failed to load list')
      } finally {
        setLoading(false)
      }
    }

    loadList()
  }, [listId])

  const sortedTiers = useMemo(() => list ? [...list.tiers].sort((a, b) => a.order - b.order) : [], [list])

  const itemsByTier = useMemo(() => {
    if (!list) return {}
    const map: Record<string, TierItemType[]> = {}
    list.tiers.forEach((t) => {
      map[t.id] = list.items.filter((i) => i.tierId === t.id).sort((a, b) => a.order - b.order)
    })
    return map
  }, [list])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center">
        <Lock className="w-16 h-16 text-[#525252] mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">{error}</h1>
        <p className="text-[#a1a1a1] mb-6">This list may be private or does not exist.</p>
        <Link href="/" className="text-[#f97316] hover:underline">Go to Home</Link>
      </div>
    )
  }

  if (!list) return null

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-[#262626] rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">{list.title}</h1>
          <div className="flex-1" />
          <span className="text-sm text-[#525252]">Shared View</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-2">
          {sortedTiers.map((tier) => (
            <TierRow key={tier.id} tier={tier} items={itemsByTier[tier.id] || []} readOnly />
          ))}
        </div>
      </main>
    </div>
  )
}
