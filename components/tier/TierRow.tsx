'use client'

import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { TierItem as TierItemType, Tier } from '@/types'
import { TierItem } from './TierItem'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Input } from '../ui/Input'

interface TierRowProps {
  tier: Tier
  items: TierItemType[]
  onItemClick?: (item: TierItemType) => void
  selectedItemId?: string | null
  onUpdateTier?: (tier: Tier) => void
  readOnly?: boolean
}

const defaultColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6b7280',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
]

export function TierRow({
  tier,
  items,
  onItemClick,
  selectedItemId,
  onUpdateTier,
  readOnly = false,
}: TierRowProps) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelValue, setLabelValue] = useState(tier.label)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tier.id,
    data: { type: 'tier', tier },
    disabled: readOnly,
  })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: tier.id,
    data: { type: 'tier', tier },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSaveLabel = () => {
    if (onUpdateTier && labelValue !== tier.label) {
      onUpdateTier({ ...tier, label: labelValue })
    }
    setEditingLabel(false)
  }

  const sortedItems = [...items].sort((a, b) => a.order - b.order)
  const itemIds = sortedItems.map((item) => item.id)

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        'flex min-h-[72px] rounded-md overflow-visible touch-manipulation',
        'transition-all duration-200',
        isDragging && 'opacity-50'
      )}
    >
      <div
        className="relative w-12 flex-shrink-0 rounded-l-md flex flex-col items-center justify-between gap-1 p-1.5"
        style={{ backgroundColor: tier.color }}
      >
        <div className="flex items-center justify-center min-h-6">
          {editingLabel ? (
            <Input
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleSaveLabel}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
              autoFocus
              className="w-9 h-7 px-1 text-center text-base font-bold uppercase"
            />
          ) : (
            <button
              type="button"
              className="text-lg font-bold uppercase leading-none text-white hover:text-white/80"
              onClick={() => {
                if (!readOnly) setEditingLabel(true)
              }}
            >
              {tier.label}
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          {!readOnly && (
            <button
              type="button"
              className="p-1 text-white/70 hover:text-white"
              onClick={() => setShowColorPicker(!showColorPicker)}
              aria-label={`Change ${tier.label} tier color`}
            >
              <div className="w-3.5 h-3.5 rounded-full border border-white/50 bg-white/20" />
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="p-0.5 text-white/60 hover:text-white cursor-grab active:cursor-grabbing touch-none"
              aria-label={`Move ${tier.label} tier`}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {showColorPicker && (
          <div className="absolute top-8 left-10 p-2 bg-[#1a1a1a] rounded-lg border border-[#262626] shadow-xl z-20 flex flex-wrap gap-1 w-32">
            {defaultColors.map((color) => (
              <button
                type="button"
                key={color}
                className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onUpdateTier?.({ ...tier, color })
                  setShowColorPicker(false)
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#1a1a1a] rounded-r-md flex flex-col overflow-hidden">
        <div
          ref={setDroppableRef}
          className={cn(
            'flex-1 flex flex-wrap gap-1.5 p-1.5 items-start content-start',
            'min-h-[72px] transition-colors duration-200',
            isOver && 'bg-[#262626]/50'
          )}
        >
          {sortedItems.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-[#525252] text-xs">
              Drop items here
            </div>
          )}
          <SortableContext items={itemIds} strategy={rectSortingStrategy}>
            {sortedItems.map((item) => (
              <TierItem
                key={item.id}
                item={item}
                onClick={() => onItemClick?.(item)}
                selected={selectedItemId === item.id}
                draggable={!readOnly}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  )
}
