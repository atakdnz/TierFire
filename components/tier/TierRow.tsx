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
        'flex min-h-[140px] rounded-lg overflow-hidden touch-manipulation',
        'transition-all duration-200',
        isDragging && 'opacity-50'
      )}
    >
      <div
        className="w-20 flex-shrink-0 flex flex-col"
        style={{ backgroundColor: tier.color }}
      >
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-2 text-white/50 hover:text-white cursor-grab active:cursor-grabbing touch-none"
            aria-label={`Move ${tier.label} tier`}
          >
            <GripVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#1a1a1a] flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#262626]">
          {editingLabel ? (
            <Input
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleSaveLabel}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
              autoFocus
              className="w-16 text-lg font-bold uppercase"
            />
          ) : (
            <span
              className="text-lg font-bold uppercase cursor-pointer hover:text-white/80"
              style={{ color: tier.color }}
              onClick={() => setEditingLabel(true)}
            >
              {tier.label}
            </span>
          )}
          
          <button
            type="button"
            className="p-1 text-[#525252] hover:text-white"
            onClick={() => setShowColorPicker(!showColorPicker)}
            aria-label={`Change ${tier.label} tier color`}
          >
            <div
              className="w-4 h-4 rounded-full border border-[#525252]"
              style={{ backgroundColor: tier.color }}
            />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-[#1a1a1a] rounded-lg border border-[#262626] shadow-xl z-10 flex flex-wrap gap-1 w-32">
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

        <div
          ref={setDroppableRef}
          className={cn(
            'flex-1 flex flex-wrap gap-2 p-3 items-start content-start',
            'min-h-[100px] transition-colors duration-200',
            isOver && 'bg-[#262626]/50'
          )}
        >
          {sortedItems.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-[#525252] text-sm">
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
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  )
}
