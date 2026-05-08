'use client'

import { useState, useRef } from 'react'
import { TierItem as TierItemType, Tier } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/Button'

interface ItemHistoryTooltipProps {
  item: TierItemType
  history: { tierId: string | null; date: string }[]
  tiers: Tier[]
  children: React.ReactNode
}

const tierRank: Record<string, number> = {
  'tier-s': 6,
  'tier-a': 5,
  'tier-b': 4,
  'tier-c': 3,
  'tier-d': 2,
  'tier-f': 1,
}

export function ItemHistoryTooltip({
  item,
  history,
  tiers,
  children,
}: ItemHistoryTooltipProps) {
  const [show, setShow] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 500)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShow(false)
  }

  const getTierLabel = (tierId: string | null) => {
    if (!tierId) return 'Bank'
    const tier = tiers.find((t) => t.id === tierId)
    return tier?.label || '?'
  }

  const getTierColor = (tierId: string | null) => {
    if (!tierId) return '#525252'
    const tier = tiers.find((t) => t.id === tierId)
    return tier?.color || '#525252'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const currentTier = item.tierId
  const currentRank = currentTier ? tierRank[currentTier] || 0 : 0

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => {
        timeoutRef.current = setTimeout(() => setShow(true), 500)
      }}
      onTouchEnd={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }}
    >
      {children}

      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#1a1a1a] rounded-lg border border-[#262626] shadow-xl p-3">
          <div className="text-sm text-white font-medium mb-2">Tier Journey</div>

          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            {history.length === 0 ? (
              <span className="text-xs text-[#525252]">No history yet</span>
            ) : (
              history.map((h, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${getTierColor(h.tierId)}30`,
                    color: getTierColor(h.tierId),
                  }}
                >
                  {getTierLabel(h.tierId)}
                </div>
              ))
            )}
          </div>

          {history.length > 0 && (
            <>
              <div className="text-xs text-[#a1a1a1] mb-2">Timeline</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getTierColor(h.tierId) }}
                    />
                    <span className="text-[#525252] flex-1 mx-2">
                      {getTierLabel(h.tierId)}
                    </span>
                    <span className="text-[#525252]">
                      {formatDate(h.date)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-2 pt-2 border-t border-[#262626] text-xs text-[#525252]">
            Total moves: {history.length}
          </div>
        </div>
      )}
    </div>
  )
}