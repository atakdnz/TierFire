'use client'

import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
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
        'group flex min-h-[104px] overflow-visible touch-manipulation',
        'transition-all duration-200',
        isDragging && 'opacity-50'
      )}
    >
      <div
        className="relative w-[64px] flex-shrink-0 flex items-center justify-center"
        style={{ backgroundColor: tier.color }}
      >
        <div
          {...(!readOnly ? attributes : {})}
          {...(!readOnly ? listeners : {})}
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            !readOnly && 'cursor-grab active:cursor-grabbing touch-none'
          )}
        >
          {editingLabel ? (
            <Input
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleSaveLabel}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
              autoFocus
              className="w-12 h-9 px-1 text-center text-lg font-bold uppercase"
            />
          ) : (
            <button
              type="button"
              className="z-10 px-1 text-2xl font-bold uppercase leading-none text-white hover:text-white/85"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                if (!readOnly) setEditingLabel(true)
              }}
            >
              {tier.label}
            </button>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            className="absolute bottom-1 right-1 z-10 h-3 w-3 rounded-full border border-white/35 bg-white/15 opacity-0 transition-opacity hover:bg-white/30 group-hover:opacity-60 focus:opacity-100"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              setShowColorPicker(!showColorPicker)
            }}
            aria-label={`Change ${tier.label} tier color`}
          />
        )}

        {showColorPicker && (
          <div className="absolute top-2 left-[68px] p-2 bg-[#1a1a1a] rounded-lg border border-[#262626] shadow-xl z-20 flex flex-wrap gap-1 w-32">
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

      <div className="flex-1 bg-[#1a1a1a] flex flex-col overflow-hidden">
        <div
          ref={setDroppableRef}
          className={cn(
            'flex-1 flex flex-wrap gap-1 p-1 items-start content-start',
            'min-h-[104px] transition-colors duration-200',
            isOver && 'bg-[#262626]/50'
          )}
        >
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
