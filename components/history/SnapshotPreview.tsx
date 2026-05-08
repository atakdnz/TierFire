'use client'

import { X, Eye } from 'lucide-react'
import { Snapshot } from '@/lib/snapshots'
import { TierList as TierListType, TierItem as TierItemType, Tier } from '@/types'
import { TierRow } from '../tier/TierRow'
import { TierItem } from '../tier/TierItem'
import { Button } from '../ui/Button'
import { useMemo } from 'react'

interface SnapshotPreviewProps {
  snapshot: Snapshot
  currentList: TierListType
  onClose: () => void
  onRestore: () => void
}

export function SnapshotPreview({
  snapshot,
  currentList,
  onClose,
  onRestore,
}: SnapshotPreviewProps) {
  const displayItems = snapshot.items
  const displayTiers = snapshot.tiers

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#262626] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Snapshot</h2>
            <p className="text-sm text-[#525252]">
              {formatDate(snapshot.createdAt)}
            </p>
            {snapshot.note && (
              <p className="text-sm text-[#a1a1a1] mt-1">
                {snapshot.note}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {sortedTiers.map((tier) => (
              <TierRow key={tier.id} tier={tier} items={itemsByTier[tier.id] || []} />
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-medium text-[#a1a1a1] mb-3">Item Bank</h3>
            <div className="grid grid-cols-6 gap-3">
              {(itemsByTier['bank'] || []).map((item) => (
                <TierItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#262626] flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={onRestore}>
            Restore This Version
          </Button>
        </div>
      </div>
    </div>
  )
}