'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Undo2, Redo2, MoreVertical, Share2, LogOut, User, Save, Clock } from 'lucide-react'
import { type User as FirebaseUser } from 'firebase/auth'
import { TierList as TierListType, TierItem as TierItemType, Tier } from '@/types'
import { TierRow } from './TierRow'
import { TierItem } from './TierItem'
import { ItemBank } from './ItemBank'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { ImageUpload } from '../ui/ImageUpload'

const collisionDetection = (args: Parameters<typeof pointerWithin>[0]) => {
  const pointerCollisions = pointerWithin(args)
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args)
}

interface TierBoardProps {
  user: FirebaseUser | null
  lists: TierListType[]
  list: TierListType
  canUndo: boolean
  canRedo: boolean
  onCreateList: (title: string) => void
  onSetActiveList: (listId: string) => void
  onAddItem: (label: string, imageUrl?: string) => void
  onUpdateItem: (item: TierItemType) => void
  onRemoveItem: (item: TierItemType) => void
  onMoveItem: (itemId: string, toTierId: string | null, order: number) => void
  onReorderTier: (tierId: string, toOrder: number) => void
  onUpdateTier: (tier: Tier) => void
  onUpdateTitle: (title: string) => void
  snapshotCount: number
  onSaveSnapshot: (note: string) => void
  onUndo: () => void
  onRedo: () => void
  onDeleteList: () => void
  onTogglePublic: () => void
  onCreateSession?: () => Promise<string | null>
  onLogout: () => void
}

export function TierBoard({
  user,
  lists,
  list,
  canUndo,
  canRedo,
  onCreateList,
  onSetActiveList,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onReorderTier,
  onUpdateTier,
  onUpdateTitle,
  snapshotCount,
  onSaveSnapshot,
  onUndo,
  onRedo,
  onDeleteList,
  onTogglePublic,
  onCreateSession,
  onLogout,
}: TierBoardProps) {
  const [activeItem, setActiveItem] = useState<TierItemType | null>(null)
  const [activeTier, setActiveTier] = useState<Tier | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [tapMode, setTapMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNewListModal, setShowNewListModal] = useState(false)
  const [showSnapshotModal, setShowSnapshotModal] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [newItemLabel, setNewItemLabel] = useState('')
  const [newListTitle, setNewListTitle] = useState('')
  const [snapshotNote, setSnapshotNote] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(list.title)
  const [copyingLink, setCopyingLink] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [notice, setNotice] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const sortedTiers = useMemo(() => [...list.tiers].sort((a, b) => a.order - b.order), [list.tiers])
  const tierIds = useMemo(() => sortedTiers.map((t) => t.id), [sortedTiers])
  const sortedLists = useMemo(() => [...lists].sort((a, b) => b.updatedAt - a.updatedAt), [lists])

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

  const handleDragOver = () => {
    // Keep DndContext callback registration stable without mutating list state during hover.
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
        const targetKey = findItemContainer(overId) || 'bank'
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

  const handleCreateList = () => {
    const title = newListTitle.trim() || 'Untitled Tier List'
    onCreateList(title)
    setNewListTitle('')
    setShowNewListModal(false)
    setShowSettingsMenu(false)
  }

  const handleSaveSnapshot = () => {
    onSaveSnapshot(snapshotNote.trim())
    setSnapshotNote('')
    setShowSnapshotModal(false)
    setNotice('Snapshot saved.')
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
    if (!list.ownerId || !list.isPublic) {
      setNotice('Sharing needs a public cloud-saved list. Local lists stay private on this device for now.')
      setShowSettingsMenu(false)
      return
    }

    const url = `${window.location.origin}/list/${list.id}`
    await navigator.clipboard.writeText(url)
    setCopyingLink(true)
    setTimeout(() => setCopyingLink(false), 2000)
    setShowSettingsMenu(false)
  }

  const handleCreateSession = async () => {
    if (!user || !list.ownerId || !onCreateSession) {
      setNotice('Sign in and use a cloud-saved list before creating a session.')
      setShowSettingsMenu(false)
      return
    }

    setCreatingSession(true)
    setNotice('')
    try {
      const sessionId = await onCreateSession()
      if (!sessionId) {
        setNotice('Could not create a session for this list.')
        return
      }

      const url = `${window.location.origin}/session/${sessionId}`
      await navigator.clipboard.writeText(url)
      setNotice('Session link copied to clipboard.')
      setShowSettingsMenu(false)
    } catch {
      setNotice('Could not create a session. Check your Firestore configuration and try again.')
    } finally {
      setCreatingSession(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
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
              className="min-w-0 truncate text-xl font-bold text-white cursor-pointer hover:text-[#f97316]"
              onClick={() => {
                setTitleValue(list.title)
                setEditingTitle(true)
              }}
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
            <Button variant="ghost" size="sm" onClick={() => setShowSnapshotModal(true)} title="Save snapshot">
              <Save className="w-4 h-4" />
              <span className="hidden lg:inline ml-1">{snapshotCount}</span>
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
                    onClick={() => { setShowNewListModal(true); setShowSettingsMenu(false) }}
                  >
                    <Plus className="w-4 h-4" /> New List
                  </button>
                  <div className="border-t border-[#262626] my-1" />
                  <div className="px-4 py-1.5 text-xs uppercase tracking-wide text-[#525252]">Switch List</div>
                  <div className="max-h-48 overflow-y-auto">
                    {sortedLists.map((tierList) => (
                      <button
                        key={tierList.id}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#262626] flex items-center justify-between gap-2"
                        onClick={() => {
                          onSetActiveList(tierList.id)
                          setShowSettingsMenu(false)
                        }}
                      >
                        <span className="truncate">{tierList.title}</span>
                        {tierList.id === list.id ? <span className="text-[#f97316]">Active</span> : null}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[#262626] my-1" />
                  <Link
                    href={list.ownerId ? `/list/${list.id}/history` : '#'}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#262626] flex items-center gap-2"
                    onClick={(event) => {
                      if (!list.ownerId) {
                        event.preventDefault()
                        setNotice('History pages are available after cloud sync.')
                      }
                      setShowSettingsMenu(false)
                    }}
                  >
                    <Clock className="w-4 h-4" /> History
                  </Link>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#262626] flex items-center gap-2"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" /> {copyingLink ? 'Copied!' : 'Share'}
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#262626] flex items-center gap-2 disabled:cursor-not-allowed disabled:text-[#525252]"
                    onClick={handleCreateSession}
                    disabled={creatingSession}
                  >
                    <User className="w-4 h-4" /> {creatingSession ? 'Creating Session...' : 'Create Session'}
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#262626] flex items-center gap-2"
                    onClick={() => {
                      if (!list.ownerId) {
                        setNotice('Cloud sync is required before a list can be made public.')
                        setShowSettingsMenu(false)
                        return
                      }
                      onTogglePublic()
                      setShowSettingsMenu(false)
                    }}
                  >
                    {list.ownerId ? (list.isPublic ? 'Make Private' : 'Make Public') : 'Cloud Sync Required'}
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

      <main className="max-w-6xl mx-auto px-4 py-4">
        {notice && (
          <div className="mb-4 rounded-lg border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-3 text-sm text-[#fed7aa] flex items-center justify-between gap-4">
            <span>{notice}</span>
            <button
              type="button"
              className="text-[#fdba74] hover:text-white"
              onClick={() => setNotice('')}
            >
              Dismiss
            </button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="space-y-1.5">
            <SortableContext items={tierIds} strategy={verticalListSortingStrategy}>
              {sortedTiers.map((tier) => (
                <div key={tier.id} onClick={() => handleTierClick(tier.id)}>
                  <TierRow tier={tier} items={itemsByTier[tier.id] || []} onItemClick={handleItemClick} selectedItemId={selectedItemId} onUpdateTier={onUpdateTier} />
                </div>
              ))}
            </SortableContext>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-white">Item Bank</h2>
              <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>
            <ItemBank items={itemsByTier['bank'] || []} onItemClick={handleItemClick} selectedItemId={selectedItemId} />
          </div>
          <DragOverlay>
            {activeItem ? <TierItem item={activeItem} overlay /> : null}
            {!activeItem && activeTier ? (
              <div className="h-[56px] min-w-[180px] rounded-md border border-[#404040] bg-[#1a1a1a] shadow-2xl flex overflow-hidden">
                <div className="w-12 flex items-center justify-center font-bold text-white" style={{ backgroundColor: activeTier.color }}>
                  {activeTier.label}
                </div>
                <div className="flex-1 px-3 flex items-center text-xs text-[#a1a1a1]">Move tier</div>
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

      <Modal open={showNewListModal} onClose={() => setShowNewListModal(false)} title="New List">
        <div className="space-y-4">
          <Input
            label="Title"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            placeholder="Movie rankings, launch ideas, draft picks..."
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowNewListModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateList}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSnapshotModal} onClose={() => setShowSnapshotModal(false)} title="Save Snapshot">
        <div className="space-y-4">
          <Input
            label="Note"
            value={snapshotNote}
            onChange={(e) => setSnapshotNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()}
            placeholder="What changed? (optional)"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowSnapshotModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveSnapshot}>Save</Button>
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
            cloudRequired={Boolean(user && list.ownerId)}
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
