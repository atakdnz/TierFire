'use client'

import { useState, useMemo, useRef, type PointerEvent } from 'react'
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
import { Plus, Undo2, Redo2, MoreVertical, Share2, LogOut, User, Save, Clock, PanelRight, Download } from 'lucide-react'
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const BANK_LAYOUT_KEY = 'tierfire_bank_layout'
const EXPORT_ITEM_SIZE = 96
const EXPORT_ROW_PADDING = 4
const EXPORT_TIER_WIDTH = 64
const EXPORT_BOARD_WIDTH = 1200

function loadCanvasImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function drawFittedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  item: TierItemType,
  x: number,
  y: number,
  size: number
) {
  const fit = item.imageFit ?? 'cover'
  const scale = item.imageScale ?? 1
  const positionX = (item.imagePositionX ?? 50) / 100
  const positionY = (item.imagePositionY ?? 50) / 100
  const imageRatio = image.naturalWidth / image.naturalHeight
  const boxRatio = 1
  let drawWidth = size
  let drawHeight = size

  if (fit === 'contain') {
    if (imageRatio > boxRatio) drawHeight = size / imageRatio
    else drawWidth = size * imageRatio
  } else if (imageRatio > boxRatio) {
    drawWidth = size * imageRatio
  } else {
    drawHeight = size / imageRatio
  }

  drawWidth *= scale
  drawHeight *= scale

  const drawX = x + (size - drawWidth) * positionX
  const drawY = y + (size - drawHeight) * positionY

  context.save()
  context.beginPath()
  context.rect(x, y, size, size)
  context.clip()
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
  context.restore()
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function filenameFromTitle(title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${slug || 'tierfire-list'}.png`
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
  onDuplicateItem: (item: TierItemType) => void
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
  onDuplicateItem,
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
  const [bankOnRight, setBankOnRight] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(BANK_LAYOUT_KEY) === 'right'
  })
  const [notice, setNotice] = useState('')
  const imageDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startPositionX: number
    startPositionY: number
  } | null>(null)

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

  const toggleBankLayout = () => {
    setBankOnRight((current) => {
      const next = !current
      localStorage.setItem(BANK_LAYOUT_KEY, next ? 'right' : 'bottom')
      return next
    })
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

  const selectedItem = list.items.find((i) => i.id === selectedItemId) || null

  const updateSelectedItem = (patch: Partial<TierItemType>) => {
    if (selectedItem) onUpdateItem({ ...selectedItem, ...patch })
  }

  const handleImagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!selectedItem?.imageUrl) return

    event.currentTarget.setPointerCapture(event.pointerId)
    imageDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPositionX: selectedItem.imagePositionX ?? 50,
      startPositionY: selectedItem.imagePositionY ?? 50,
    }
  }

  const handleImagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = imageDragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !selectedItem) return

    const rect = event.currentTarget.getBoundingClientRect()
    const scale = selectedItem.imageScale ?? 1
    const deltaX = ((event.clientX - drag.startX) / rect.width) * 100 / scale
    const deltaY = ((event.clientY - drag.startY) / rect.height) * 100 / scale

    updateSelectedItem({
      imageFit: 'cover',
      imagePositionX: clamp(drag.startPositionX - deltaX, 0, 100),
      imagePositionY: clamp(drag.startPositionY - deltaY, 0, 100),
    })
  }

  const handleImagePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (imageDragRef.current?.pointerId === event.pointerId) {
      imageDragRef.current = null
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

  const handleExportPng = async () => {
    setNotice('Preparing PNG export...')

    const rowItemCapacity = Math.max(1, Math.floor((EXPORT_BOARD_WIDTH - EXPORT_TIER_WIDTH - EXPORT_ROW_PADDING * 2) / (EXPORT_ITEM_SIZE + EXPORT_ROW_PADDING)))
    const rowHeights = sortedTiers.map((tier) => {
      const itemCount = itemsByTier[tier.id]?.length ?? 0
      const itemRows = Math.max(1, Math.ceil(itemCount / rowItemCapacity))
      return EXPORT_ROW_PADDING + itemRows * EXPORT_ITEM_SIZE + (itemRows - 1) * EXPORT_ROW_PADDING + EXPORT_ROW_PADDING
    })
    const titleHeight = 56
    const height = titleHeight + rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0)
    const canvas = document.createElement('canvas')
    const pixelRatio = 2
    canvas.width = EXPORT_BOARD_WIDTH * pixelRatio
    canvas.height = height * pixelRatio
    canvas.style.width = `${EXPORT_BOARD_WIDTH}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    if (!context) return

    context.scale(pixelRatio, pixelRatio)
    context.fillStyle = '#0f0f0f'
    context.fillRect(0, 0, EXPORT_BOARD_WIDTH, height)
    context.fillStyle = '#ffffff'
    context.font = '700 24px Arial, sans-serif'
    context.fillText(list.title, 16, 36)

    const imageCache = new Map<string, HTMLImageElement | null>()
    for (const item of list.items) {
      if (item.imageUrl && !imageCache.has(item.imageUrl)) {
        imageCache.set(item.imageUrl, await loadCanvasImage(item.imageUrl))
      }
    }

    let y = titleHeight
    sortedTiers.forEach((tier, tierIndex) => {
      const rowHeight = rowHeights[tierIndex]
      const items = itemsByTier[tier.id] || []
      context.fillStyle = tier.color
      context.fillRect(0, y, EXPORT_TIER_WIDTH, rowHeight)
      context.fillStyle = '#ffffff'
      context.font = '700 28px Arial, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(tier.label, EXPORT_TIER_WIDTH / 2, y + rowHeight / 2)

      context.fillStyle = '#1a1a1a'
      context.fillRect(EXPORT_TIER_WIDTH, y, EXPORT_BOARD_WIDTH - EXPORT_TIER_WIDTH, rowHeight)
      context.strokeStyle = '#0f0f0f'
      context.lineWidth = 1
      context.strokeRect(0, y, EXPORT_BOARD_WIDTH, rowHeight)

      items.forEach((item, itemIndex) => {
        const column = itemIndex % rowItemCapacity
        const row = Math.floor(itemIndex / rowItemCapacity)
        const itemX = EXPORT_TIER_WIDTH + EXPORT_ROW_PADDING + column * (EXPORT_ITEM_SIZE + EXPORT_ROW_PADDING)
        const itemY = y + EXPORT_ROW_PADDING + row * (EXPORT_ITEM_SIZE + EXPORT_ROW_PADDING)

        context.fillStyle = '#262626'
        context.fillRect(itemX, itemY, EXPORT_ITEM_SIZE, EXPORT_ITEM_SIZE)
        const image = item.imageUrl ? imageCache.get(item.imageUrl) : null
        if (image) drawFittedImage(context, image, item, itemX, itemY, EXPORT_ITEM_SIZE)

        context.fillStyle = item.imageUrl ? 'rgba(0, 0, 0, 0.65)' : 'transparent'
        if (item.imageUrl) context.fillRect(itemX, itemY + EXPORT_ITEM_SIZE - 16, EXPORT_ITEM_SIZE, 16)
        context.fillStyle = '#ffffff'
        context.font = item.imageUrl ? '500 10px Arial, sans-serif' : '600 14px Arial, sans-serif'
        context.textAlign = 'center'
        context.textBaseline = item.imageUrl ? 'middle' : 'middle'
        context.fillText(item.label, itemX + EXPORT_ITEM_SIZE / 2, item.imageUrl ? itemY + EXPORT_ITEM_SIZE - 8 : itemY + EXPORT_ITEM_SIZE / 2, EXPORT_ITEM_SIZE - 8)
      })

      y += rowHeight
    })

    downloadCanvas(canvas, filenameFromTitle(list.title))
    setNotice('PNG exported.')
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
            <Button variant="ghost" size="sm" onClick={handleExportPng} title="Export PNG">
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant={bankOnRight ? 'primary' : 'ghost'}
              size="sm"
              onClick={toggleBankLayout}
              title={bankOnRight ? 'Move item bank below tiers' : 'Move item bank to the right'}
            >
              <PanelRight className="w-4 h-4" />
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
          <div>
            <div className="w-full space-y-px">
              <div className="space-y-px">
                <SortableContext items={tierIds} strategy={verticalListSortingStrategy}>
                  {sortedTiers.map((tier) => (
                    <div key={tier.id} onClick={() => handleTierClick(tier.id)}>
                      <TierRow tier={tier} items={itemsByTier[tier.id] || []} onItemClick={handleItemClick} selectedItemId={selectedItemId} onUpdateTier={onUpdateTier} />
                    </div>
                  ))}
                </SortableContext>
              </div>
            </div>

            <div className={bankOnRight ? 'mt-4 lg:fixed lg:right-4 lg:top-20 lg:z-30 lg:mt-0 lg:w-[224px]' : 'mt-4'}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-white">Item Bank</h2>
              </div>
              <ItemBank
                items={itemsByTier['bank'] || []}
                onItemClick={handleItemClick}
                selectedItemId={selectedItemId}
                onAddItem={() => setShowAddModal(true)}
                compact={bankOnRight}
              />
            </div>
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
            value={selectedItem?.label || ''}
            onChange={(e) => updateSelectedItem({ label: e.target.value })}
          />
          <ImageUpload
            value={selectedItem?.imageUrl || ''}
            cloudRequired={Boolean(user && list.ownerId)}
            onChange={(url) => {
              updateSelectedItem({
                imageUrl: url,
                imageFit: selectedItem?.imageFit ?? 'cover',
                imagePositionX: selectedItem?.imagePositionX ?? 50,
                imagePositionY: selectedItem?.imagePositionY ?? 50,
                imageScale: selectedItem?.imageScale ?? 1,
              })
            }}
          />
          {selectedItem?.imageUrl && (
            <div className="space-y-3 rounded-lg border border-[#262626] bg-[#141414] p-3">
              <div
                className="aspect-square w-40 cursor-grab touch-none overflow-hidden rounded-md bg-[#262626] active:cursor-grabbing"
                onPointerDown={handleImagePointerDown}
                onPointerMove={handleImagePointerMove}
                onPointerUp={handleImagePointerEnd}
                onPointerCancel={handleImagePointerEnd}
              >
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.label}
                  className="h-full w-full select-none pointer-events-none"
                  style={{
                    objectFit: selectedItem.imageFit ?? 'cover',
                    objectPosition: `${selectedItem.imagePositionX ?? 50}% ${selectedItem.imagePositionY ?? 50}%`,
                    transform: `scale(${selectedItem.imageScale ?? 1})`,
                  }}
                  draggable={false}
                />
              </div>
              <p className="text-xs text-[#737373]">Drag the image to reposition it.</p>
              <label className="space-y-1 text-xs text-[#a1a1a1]">
                Zoom
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={selectedItem.imageScale ?? 1}
                  onChange={(event) => updateSelectedItem({ imageScale: Number(event.target.value), imageFit: 'cover' })}
                  className="w-full"
                />
              </label>
              <div className="flex gap-2">
                <Button
                  variant={(selectedItem.imageFit ?? 'cover') === 'cover' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => updateSelectedItem({ imageFit: 'cover' })}
                >
                  Fill
                </Button>
                <Button
                  variant={selectedItem.imageFit === 'contain' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => updateSelectedItem({ imageFit: 'contain', imageScale: 1 })}
                >
                  Fit
                </Button>
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="danger" size="sm" onClick={handleDeleteItem}>Delete</Button>
            <div className="flex gap-2">
              {selectedItem && (
                <Button variant="secondary" size="sm" onClick={() => onDuplicateItem(selectedItem)}>
                  Duplicate
                </Button>
              )}
              <Button variant="primary" onClick={() => setShowEditModal(false)}>Done</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
