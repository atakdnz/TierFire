'use client'

import { useState, useMemo } from 'react'
import { TierItem as TierItemType, Tier } from '@/types'
import { cn } from '@/lib/utils'
import { Snapshot } from '@/lib/snapshots'

interface GlowModeProps {
  list: { items: TierItemType[]; tiers: Tier[] }
  snapshot: Snapshot | null
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

export function GlowMode({ list, snapshot, children }: GlowModeProps) {
  const itemsWithGlow = useMemo(() => {
    if (!snapshot) return list.items

    const prevById: Record<string, TierItemType> = {}
    snapshot.items.forEach((i) => (prevById[i.id] = i))

    return list.items.map((item) => {
      const prev = prevById[item.id]
      if (!prev) return { ...item, delta: 0, isNew: true }

      const prevRank = prev.tierId ? tierRank[prev.tierId] || 0 : 0
      const currentRank = item.tierId ? tierRank[item.tierId] || 0 : 0
      const delta = currentRank - prevRank

      return { ...item, delta, isNew: false }
    })
  }, [list, snapshot])

  const containerRef = useMemo(() => {
    if (!snapshot) return children

    const style = document.createElement('style')
    style.textContent = `
      .glow-item {
        transition: all 0.3s ease;
      }
      .glow-positive {
        box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
      }
      .glow-negative {
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
      }
      .glow-new {
        box-shadow: 0 0 20px rgba(234, 179, 8, 0.5);
      }
      .glow-neutral {
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
      }
    `
    return style
  }, [snapshot, children])

  if (!snapshot) return <>{children}</>

  const anyDelta = itemsWithGlow.some((i: any) => i.delta !== 0)
  if (!anyDelta) {
    return (
      <div className="relative">
        {itemsWithGlow.map((item: any) => (
          <div
            key={item.id}
            className="glow-item glow-neutral inline-block"
            style={{ '--glow-color': '#22c55e', '--glow-intensity': 0.2 } as any}
          >
            {item}
          </div>
        ))}
      </div>
    )
  }

  return <>{children}</>
}

interface GlowDeltaProps {
  delta: number
  isNew?: boolean
}

export function GlowDelta({ delta, isNew }: GlowDeltaProps) {
  if (isNew) {
    return (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
        <span className="text-[8px] font-bold text-black">N</span>
      </div>
    )
  }

  if (delta > 0) {
    return (
      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
        <span className="text-[10px] font-bold text-white">+{delta}</span>
      </div>
    )
  }

  if (delta < 0) {
    return (
      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
        <span className="text-[10px] font-bold text-white">{delta}</span>
      </div>
    )
  }

  return null
}