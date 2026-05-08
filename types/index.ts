export interface TierItem {
  id: string
  label: string
  imageUrl?: string
  overlayText?: string
  overlayFont?: string
  overlaySize?: number
  overlayColor?: string
  overlayPosition?: 'top' | 'center' | 'bottom'
  tierId: string | null
  order: number
}

export interface Tier {
  id: string
  label: string
  color: string
  order: number
}

export interface TierList {
  id: string
  title: string
  description?: string
  isPublic?: boolean
  ownerId?: string
  tiers: Tier[]
  items: TierItem[]
  createdAt: number
  updatedAt: number
}

export interface HistoryAction {
  type: 'ADD_ITEM' | 'REMOVE_ITEM' | 'MOVE_ITEM' | 'REORDER_TIER' | 'UPDATE_ITEM' | 'UPDATE_TIER'
  item?: TierItem
  previousItem?: TierItem
  tier?: Tier
  previousTier?: Tier
  tierId?: string
  fromTierId?: string | null
  toTierId?: string | null
  fromOrder?: number
  toOrder?: number
  itemId?: string
  order?: number
  listId: string
}