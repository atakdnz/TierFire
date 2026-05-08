'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TierItem as TierItemType } from '@/types'
import { cn } from '@/lib/utils'

interface TierItemProps {
  item: TierItemType
  onClick?: () => void
  selected?: boolean
  overlay?: boolean
  draggable?: boolean
}

const tierColors: Record<string, string> = {
  'tier-s': '#ef4444',
  'tier-a': '#f97316',
  'tier-b': '#eab308',
  'tier-c': '#22c55e',
  'tier-d': '#3b82f6',
  'tier-f': '#6b7280',
}

export function TierItem({ item, onClick, selected, overlay, draggable = true }: TierItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: 'item', item },
    disabled: !draggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const overlayBg = item.tierId ? tierColors[item.tierId] : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'w-[120px] h-[120px] rounded-lg',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        'bg-[#262626] border-2 border-transparent transition-shadow duration-150 touch-none select-none',
        'flex flex-col items-center justify-center overflow-hidden',
        isDragging && 'opacity-40 shadow-2xl',
        selected && 'border-[#f97316] ring-2 ring-[#f97316]/50',
        overlay && 'shadow-2xl scale-105'
      )}
    >
      {item.imageUrl ? (
        <div className="relative w-full h-full">
          <img
            src={item.imageUrl}
            alt={item.label}
            className="w-full h-full object-cover"
          />
          {overlayBg && (
            <div
              className="absolute inset-0 opacity-30"
              style={{ backgroundColor: overlayBg }}
            />
          )}
        </div>
      ) : (
        <div
          className="w-full h-full flex items-center justify-center p-2"
          style={overlayBg ? { backgroundColor: `${overlayBg}30` } : {}}
        >
          <span className="text-sm text-white text-center font-medium line-clamp-3">
            {item.label}
          </span>
        </div>
      )}
    </div>
  )
}
