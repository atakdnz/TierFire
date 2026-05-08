'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Undo2, Redo2, MoreVertical, Share2, LogOut, User } from 'lucide-react'
import { type User as FirebaseUser } from 'firebase/auth'
import { TierList as TierListType, TierItem as TierItemType, Tier } from '@/types'
import { TierRow } from './TierRow'
import { TierItem } from './TierItem'
import { ItemBank } from './ItemBank'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { ImageUpload } from '../ui/ImageUpload'

interface TierBoardProps {
  user: FirebaseUser | null
  list: TierListType
  canUndo: boolean
  canRedo: boolean
  onAddItem: (label: string, imageUrl?: string) => void
  onUpdateItem: (item: TierItemType) => void
  onRemoveItem: (item: TierItemType) => void
  onMoveItem: (itemId: string, toTierId: string | null, order: number) => void
  onReorderTier: (tierId: string, toOrder: number) => void
  onUpdateTier: (tier: Tier) => void
  onUpdateTitle: (title: string) => void
  onUndo: () => void
  onRedo: () => void
  onDeleteList: () => void
  onTogglePublic: () => void
  onLogout: () => void
}

export function TierBoard({
  user,
  list,
  canUndo,
  canRedo,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onReorderTier,
  onUpdateTier,
  onUpdateTitle,
  onUndo,
  onRedo,
  onDeleteList,
  onTogglePublic,
  onLogout,
}: TierBoardProps) {
  const [activeItem, setActiveItem] = useState<TierItemType | null>(null)
  const [activeTier, setActiveTier] = useState<Tier | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [tapMode, setTapMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [newItemLabel, setNewItemLabel] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(list.title)
  const [copyingLink, setCopyingLink] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const sortedTiers = useMemo(() => [...list.tiers].sort((a, b) => a.order - b.order), [list.tiers])
  const tierIds = useMemo(() => sortedTiers.map((t) => t.id), [sortedTiers])

  const itemsByTier = useMemo(() => {
    const map: Record<string, TierItemType[]> = {}
    list.tiers.forEach((t) => {
      map[t.id] = list.items.filter((i) => i.tierId === t.id).sort((a, b) => a.order - b.order)
    })
    map['bank'] = list.items.filter((i) => i.tierId === null).sort((a, b) => a.order - b.order)
    return map
  }, [list.items, list.tiers])

  const findItemContainer = (id: UniqueIdentifier): string | null => {
    const item = list.items.find((i) => i.id === id)
    return item?.tierId ?? null
  }

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type
    if (type === 'tier') {
      const tier = list.tiers.find((tier) => tier.id === event.active.id)
      if (tier) setActiveTier(tier)
      return
    }

    const item = list.items.find((i) => i.id === event.active.id)
    if (item) {
      setActiveItem(item)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return
    if (active.data.current?.type !== 'item') return

    const activeId = active.id as string
    const overId = over.id as string

    const activeItem = list.items.find((i) => i.id === activeId)
    if (!activeItem) return

    const tierIdsList = tierIds
    let targetTierId: string | null = null

    if (overId === 'item-bank') {
      targetTierId = null
    } else if (tierIdsList.includes(overId)) {
      targetTierId = overId
    } else {
      targetTierId = findItemContainer(overId)
    }

    if (targetTierId !== activeItem.tierId) {
      const targetItems = itemsByTier[targetTierId || 'bank'] || []
      onMoveItem(activeId, targetTierId, targetItems.length)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) {
      setActiveItem(null)
      setActiveTier(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string
    const activeType = active.data.current?.type

    if (activeType === 'tier') {
      if (tierIds.includes(overId) && activeId !== overId) {
        const targetIndex = sortedTiers.findIndex((tier) => tier.id === overId)
        if (targetIndex !== -1) onReorderTier(activeId, targetIndex)
      }
      setActiveTier(null)
      return
    }

    if (activeType !== 'item') {
      setActiveItem(null)
      setActiveTier(null)
      return
    }

    if (overId === 'item-bank') {
      const targetItems = itemsByTier.bank || []
      onMoveItem(activeId, null, targetItems.length)
    } else if (tierIds.includes(overId)) {
      const targetItems = itemsByTier[overId] || []
      onMoveItem(activeId, overId, targetItems.length)
    } else {
      const overItem = list.items.find((i) => i.id === overId)
      if (overItem) {
        const targetKey = overItem.tierId || 'bank'
        const targetItems = itemsByTier[targetKey] || []
        const currentIndex = targetItems.findIndex((i) => i.id === overId)
        onMoveItem(activeId, overItem.tierId, currentIndex === -1 ? targetItems.length : currentIndex)
      }
    }

    setActiveItem(null)
    setActiveTier(null)
  }

  const handleItemClick = (item: TierItemType) => {
    if (tapMode) {
      setSelectedItemId(item.id === selectedItemId ? null : item.id)
    } else {
      setSelectedItemId(item.id)
      setShowEditModal(true)
    }
  }

  const handleTierClick = (tierId: string) => {
    if (tapMode && selectedItemId) {
      const targetItems = itemsByTier[tierId] || []
      onMoveItem(selectedItemId, tierId, targetItems.length)
      setSelectedItemId(null)
    }
  }

  const handleAddItem = () => {
    if (newItemLabel.trim()) {
      onAddItem(newItemLabel.trim())
      setNewItemLabel('')
      setShowAddModal(false)
    }
  }

  const handleDeleteItem = () => {
    const item = list.items.find((i) => i.id === selectedItemId)
    if (item) {
      onRemoveItem(item)
      setSelectedItemId(null)
      setShowEditModal(false)
    }
  }

  const handleSaveTitle = () => {
    if (titleValue.trim()) onUpdateTitle(titleValue.trim())
    setEditingTitle(false)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/list/${list.id}`
    await navigator.clipboard.writeText(url)
    setCopyingLink(true)
    setTimeout(() => setCopyingLink(false), 2000)
    setShowSettingsMenu(false)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white hidden md:block">{list.title}</span>
          </Link>

          {editingTitle ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              autoFocus
              className="text-xl font-bold w-64"
            />
          ) : (
            <h1
              className="text-xl font-bold text-white cursor-pointer hover:text-[#f97316]"
              onClick={() => setEditingTitle(true)}
            >
              {list.title}
            </h1>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
              <Redo2 className="w-4 h-4" />
            </Button>

            <Button variant={tapMode ? 'primary' : 'secondary'} size="sm" onClick={() => setTapMode(!tapMode)} className="md:hidden">
              {tapMode ? 'Tap Mode ON' : 'Tap Mode'}
            </Button>

            <div className="relative">
              <Button variant="ghost" size="sm" onClick={() => setShowSettingsMenu(!showSettingsMenu)}>
                <MoreVertical className="w-4 h-4" />
              </Button>

              {showSettingsMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#1a1a1a] rounded-lg border border-[#262626] shadow-xl py-1 z-50">
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#262626] flex items-center gap-2"
                    onClick={() => { setShowAddModal(true); setShowSettingsMenu(false) }}
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#262626] flex items-center gap-2"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" /> {copyingLink ? 'Copied!' : 'Share'}
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#262626] flex items-center gap-2"
                    onClick={() => { onTogglePublic(); setShowSettingsMenu(false) }}
                  >
                    {list.isPublic ? 'Make Private' : 'Make Public'}
                  </button>
                  <div className="border-t border-[#262626] my-1" />
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-[#262626]"
                    onClick={() => { onDeleteList(); setShowSettingsMenu(false) }}
                  >
                    Delete List
                  </button>
                </div>
              )}
            </div>

            {user && (
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] rounded-lg border border-[#262626] shadow-xl py-1 z-50">
                    <div className="px-4 py-2 text-sm text-white border-b border-[#262626]">
                      {user.displayName || user.email}
                    </div>
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-[#262626] flex items-center gap-2"
                      onClick={onLogout}
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="space-y-2">
            <SortableContext items={tierIds} strategy={verticalListSortingStrategy}>
              {sortedTiers.map((tier) => (
                <div key={tier.id} onClick={() => handleTierClick(tier.id)}>
                  <TierRow tier={tier} items={itemsByTier[tier.id] || []} onItemClick={handleItemClick} selectedItemId={selectedItemId} onUpdateTier={onUpdateTier} />
                </div>
              ))}
            </SortableContext>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Item Bank</h2>
              <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>
            <ItemBank items={itemsByTier['bank'] || []} onItemClick={handleItemClick} selectedItemId={selectedItemId} />
          </div>
          <DragOverlay>
            {activeItem ? <TierItem item={activeItem} overlay /> : null}
            {!activeItem && activeTier ? (
              <div className="h-[72px] min-w-[220px] rounded-lg border border-[#404040] bg-[#1a1a1a] shadow-2xl flex overflow-hidden">
                <div className="w-20 flex items-center justify-center font-bold text-white" style={{ backgroundColor: activeTier.color }}>
                  {activeTier.label}
                </div>
                <div className="flex-1 px-4 flex items-center text-sm text-[#a1a1a1]">Move tier</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Item">
        <div className="space-y-4">
          <Input label="Label" value={newItemLabel} onChange={(e) => setNewItemLabel(e.target.value)} placeholder="Enter item name" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddItem}>Add</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Item">
        <div className="space-y-4">
          <Input
            label="Label"
            value={list.items.find((i) => i.id === selectedItemId)?.label || ''}
            onChange={(e) => {
              const item = list.items.find((i) => i.id === selectedItemId)
              if (item) onUpdateItem({ ...item, label: e.target.value })
            }}
          />
          <ImageUpload
            value={list.items.find((i) => i.id === selectedItemId)?.imageUrl || ''}
            onChange={(url) => {
              const item = list.items.find((i) => i.id === selectedItemId)
              if (item) onUpdateItem({ ...item, imageUrl: url })
            }}
          />
          <div className="flex justify-between">
            <Button variant="danger" size="sm" onClick={handleDeleteItem}>Delete</Button>
            <Button variant="primary" onClick={() => setShowEditModal(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
