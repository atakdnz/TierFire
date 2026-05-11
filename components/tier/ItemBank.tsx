'use client'

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
  compact?: boolean
}

export function ItemBank({ items, onItemClick, selectedItemId, onAddItem, compact = false }: ItemBankProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'item-bank',
    data: { type: 'bank' },
  })

  const sortedItems = [...items].sort((a, b) => a.order - b.order)
  const itemIds = sortedItems.map((i) => i.id)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[96px] p-2 rounded-lg border-2 border-dashed border-[#262626]',
        compact && 'max-h-[calc(100vh-190px)] overflow-y-auto',
        'transition-colors duration-200',
        isOver && 'border-[#f97316] bg-[#f97316]/5'
      )}
    >
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className={cn(
          'grid gap-2',
          compact ? 'grid-cols-2' : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10'
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
              compact ? 'col-span-1' : 'col-span-3 sm:col-span-5 md:col-span-7 lg:col-span-9'
            )}>
              Add items to get started
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
