'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { TierItem as TierItemType } from '@/types'
import { TierItem } from './TierItem'
import { cn } from '@/lib/utils'

interface ItemBankProps {
  items: TierItemType[]
  onItemClick?: (item: TierItemType) => void
  selectedItemId?: string | null
  onAddItem?: () => void
  onImageDrop?: (event: React.DragEvent<HTMLDivElement>) => void
  compact?: boolean
}

export function ItemBank({ items, onItemClick, selectedItemId, onAddItem, onImageDrop, compact = false }: ItemBankProps) {
  const [isNativeDropActive, setIsNativeDropActive] = useState(false)
  const { setNodeRef, isOver } = useDroppable({
    id: 'item-bank',
    data: { type: 'bank' },
  })

  const sortedItems = [...items].sort((a, b) => a.order - b.order)
  const itemIds = sortedItems.map((i) => i.id)

  return (
    <div
      ref={setNodeRef}
      onDragEnter={() => {
        if (onImageDrop) setIsNativeDropActive(true)
      }}
      onDragOver={(event) => {
        if (onImageDrop) event.preventDefault()
      }}
      onDragLeave={() => setIsNativeDropActive(false)}
      onDrop={(event) => {
        setIsNativeDropActive(false)
        onImageDrop?.(event)
      }}
      className={cn(
        'min-h-[96px] p-2 rounded-lg border border-[#262626]',
        compact && 'lg:h-[calc(100vh-118px)] lg:min-h-0 lg:overflow-y-auto',
        'transition-colors duration-200',
        (isOver || isNativeDropActive) && 'border-[#f97316] bg-[#f97316]/5'
      )}
    >
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className={cn(
          'grid',
          compact ? 'grid-cols-2 gap-4' : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2'
        )}>
          <button
            type="button"
            onClick={onAddItem}
            className="flex h-[96px] w-[96px] items-center justify-center rounded-md border-2 border-dashed border-[#333] bg-[#1a1a1a] text-[#737373] transition-colors hover:border-[#f97316] hover:text-[#f97316]"
            aria-label="Add item"
          >
            <Plus className="h-7 w-7" />
          </button>
          {sortedItems.length === 0 ? (
            <div className={cn(
              'flex h-[96px] items-center text-sm text-[#525252]',
              isNativeDropActive && 'text-[#fdba74]',
              compact ? 'col-span-1' : 'col-span-3 sm:col-span-5 md:col-span-7 lg:col-span-9'
            )}>
              {isNativeDropActive ? 'Drop images to add them' : 'Add items to get started'}
            </div>
          ) : (
            sortedItems.map((item) => (
              <TierItem
                key={item.id}
                item={item}
                onClick={() => onItemClick?.(item)}
                selected={selectedItemId === item.id}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}
