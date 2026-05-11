'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Clock, Play, Pause } from 'lucide-react'
import { TierList as TierListType, TierItem as TierItemType } from '@/types'
import { getList, saveList } from '@/lib/firestore'
import { createSnapshot, getListSnapshots, Snapshot } from '@/lib/snapshots'
import { TierRow } from '@/components/tier/TierRow'
import { TierItem } from '@/components/tier/TierItem'
import { useAuth } from '@/hooks/useAuth'

export default function HistoryPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const listId = params.id as string

  const [list, setList] = useState<TierListType | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState('')
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null)
  const [playing, setPlaying] = useState(false)
  const [playIndex, setPlayIndex] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const [listData, snapshotsData] = await Promise.all([
          getList(listId),
          getListSnapshots(listId),
        ])
        if (listData) {
          setList(listData)
          setSnapshots(snapshotsData)
          if (snapshotsData.length > 0) {
            setSelectedSnapshot(snapshotsData[0])
          }
        }
      } catch (err) {
        console.error('Failed to load:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [listId])

  useEffect(() => {
    if (!playing || snapshots.length === 0) return

    const interval = setInterval(() => {
      setPlayIndex((prev) => {
        const next = prev + 1
        if (next >= snapshots.length) {
          setPlaying(false)
          return 0
        }
        setSelectedSnapshot(snapshots[next])
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [playing, snapshots])

  const canRestore = Boolean(user && list?.ownerId === user.uid && selectedSnapshot)

  const handleSelectSnapshot = (snapshot: Snapshot | null) => {
    setSelectedSnapshot(snapshot)
    setRestoreError('')
    if (!snapshot) {
      setPlayIndex(0)
      return
    }
    const index = snapshots.findIndex((entry) => entry.id === snapshot.id)
    setPlayIndex(index === -1 ? 0 : index)
  }

  const handleRestore = async () => {
    if (!list || !selectedSnapshot || !canRestore) return

    setRestoring(true)
    setRestoreError('')

    try {
      await createSnapshot(list.id, list, 'Before restoring snapshot')
      const restoredList: TierListType = {
        ...list,
        tiers: selectedSnapshot.tiers,
        items: selectedSnapshot.items,
        updatedAt: Date.now(),
      }
      await saveList(restoredList)
      const nextSnapshots = await getListSnapshots(list.id)
      setList(restoredList)
      setSnapshots(nextSnapshots)
      handleSelectSnapshot(null)
    } catch (error) {
      console.error('Failed to restore snapshot:', error)
      setRestoreError('Could not restore this snapshot. Try again after refreshing.')
    } finally {
      setRestoring(false)
    }
  }

  const displayItems = useMemo(
    () => selectedSnapshot?.items ?? list?.items ?? [],
    [selectedSnapshot, list]
  )

  const displayTiers = useMemo(
    () => selectedSnapshot?.tiers ?? list?.tiers ?? [],
    [selectedSnapshot, list]
  )

  const sortedTiers = useMemo(
    () => [...displayTiers].sort((a, b) => a.order - b.order),
    [displayTiers]
  )

  const itemsByTier = useMemo(() => {
    const map: Record<string, TierItemType[]> = {}
    displayTiers.forEach((t) => {
      map[t.id] = displayItems.filter((i) => i.tierId === t.id).sort((a, b) => a.order - b.order)
    })
    map['bank'] = displayItems
      .filter((i) => i.tierId === null)
      .sort((a, b) => a.order - b.order)
    return map
  }, [displayItems, displayTiers])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
      </div>
    )
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-white mb-2">List not found</h1>
        <Link href="/" className="text-[#f97316] hover:underline">
          Go Home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => router.push(`/list/${listId}`)}
            className="p-2 hover:bg-[#262626] rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">{list.title}</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#525252]">
              {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 mb-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Clock className="w-4 h-4" />
                  Timeline
                </div>
                {snapshots.length > 0 && (
                  <button
                    onClick={() => setPlaying(!playing)}
                    className="p-2 hover:bg-[#262626] rounded-lg"
                  >
                    {playing ? (
                      <Pause className="w-4 h-4 text-[#f97316]" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                <button
                  onClick={() => handleSelectSnapshot(null)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    !selectedSnapshot
                      ? 'bg-[#f97316]/20 border border-[#f97316]'
                      : 'hover:bg-[#262626]'
                  }`}
                >
                  <div className="text-sm text-white font-medium">Current</div>
                  <div className="text-xs text-[#525252]">Live version</div>
                </button>

                {snapshots.map((snapshot, index) => (
                  <button
                    key={snapshot.id}
                    onClick={() => handleSelectSnapshot(snapshot)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedSnapshot?.id === snapshot.id
                        ? 'bg-[#f97316]/20 border border-[#f97316]'
                        : 'hover:bg-[#262626]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">
                        {new Date(snapshot.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      {index === 0 && (
                        <span className="text-xs bg-[#f97316]/20 text-[#f97316] px-2 py-0.5 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    {snapshot.note && (
                      <div className="text-xs text-[#a1a1a1] mt-1">
                        {snapshot.note}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {snapshots.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#262626]">
                  <input
                    type="range"
                    min={0}
                    max={snapshots.length - 1}
                    value={playIndex}
                    onChange={(e) => handleSelectSnapshot(snapshots[parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <div className="text-xs text-[#525252] mt-2 text-center">
                    {selectedSnapshot
                      ? `${playIndex + 1} / ${snapshots.length}`
                      : 'Current'}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedSnapshot ? 'Snapshot Preview' : 'Current List'}
                </h2>
                <p className="text-sm text-[#737373]">
                  {selectedSnapshot
                    ? 'Read-only preview of the selected saved state.'
                    : 'The current saved version of this list.'}
                </p>
              </div>
              {selectedSnapshot && (
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={!canRestore || restoring}
                  className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:bg-[#333] disabled:text-[#737373]"
                  title={canRestore ? 'Restore this snapshot' : 'Only the list owner can restore snapshots'}
                >
                  {restoring ? 'Restoring...' : 'Restore'}
                </button>
              )}
            </div>
            {restoreError && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {restoreError}
              </div>
            )}
            <div className="space-y-2">
              {sortedTiers.map((tier) => (
                <TierRow key={tier.id} tier={tier} items={itemsByTier[tier.id] || []} readOnly />
              ))}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-white mb-4">Item Bank</h2>
              <div className="grid grid-cols-6 gap-3">
                {(itemsByTier['bank'] || []).map((item) => (
                  <TierItem key={item.id} item={item} draggable={false} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
