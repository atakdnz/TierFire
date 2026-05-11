'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { TierItem as TierItemType } from '@/types'
import { TierItem } from './TierItem'
import { cn } from '@/lib/utils'

interface ItemBankProps {
  items: TierItemType[]
  onItemClick?: (item: TierItemType) => void
  selectedItemId?: string | null
}

export function ItemBank({ items, onItemClick, selectedItemId }: ItemBankProps) {
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
        'transition-colors duration-200',
        isOver && 'border-[#f97316] bg-[#f97316]/5'
      )}
    >
      {sortedItems.length === 0 ? (
        <div className="h-[72px] flex items-center justify-center text-sm text-[#525252]">
          Add items to get started
        </div>
      ) : (
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {sortedItems.map((item) => (
              <TierItem
                key={item.id}
                item={item}
                onClick={() => onItemClick?.(item)}
                selected={selectedItemId === item.id}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  )
}
