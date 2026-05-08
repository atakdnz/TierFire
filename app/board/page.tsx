'use client'

import { useTierList } from '@/hooks/useTierList'
import { TierBoard } from '@/components/tier/TierBoard'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'

export default function BoardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const {
    lists,
    activeList,
    canUndo,
    canRedo,
    createList,
    deleteList,
    setActiveList,
    updateListTitle,
    togglePublic,
    addItem,
    updateItem,
    removeItem,
    moveItem,
    reorderTier,
    updateTier,
    undo,
    redo,
  } = useTierList()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  if (!activeList || authLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <TierBoard
      user={user}
      lists={lists}
      list={activeList}
      canUndo={canUndo}
      canRedo={canRedo}
      onCreateList={createList}
      onSetActiveList={setActiveList}
      onAddItem={(label, imageUrl) => addItem(activeList.id, label, imageUrl)}
      onUpdateItem={(item) => {
        const prev = activeList.items.find(i => i.id === item.id)
        if (prev) updateItem(activeList.id, item, prev)
      }}
      onRemoveItem={(item) => removeItem(activeList.id, item)}
      onMoveItem={(itemId, toTierId, order) => moveItem(activeList.id, itemId, toTierId, order)}
      onReorderTier={(tierId, toOrder) => reorderTier(activeList.id, tierId, toOrder)}
      onUpdateTier={(tier) => {
        const prev = activeList.tiers.find(t => t.id === tier.id)
        if (prev) updateTier(activeList.id, tier, prev)
      }}
      onUpdateTitle={(title) => updateListTitle(activeList.id, title)}
      onUndo={undo}
      onRedo={redo}
      onDeleteList={() => deleteList(activeList.id)}
      onTogglePublic={() => togglePublic(activeList.id)}
      onLogout={async () => {
        await logout()
      }}
    />
  )
}
