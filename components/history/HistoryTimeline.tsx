'use client'

import { useState } from 'react'
import { Clock, Save, ChevronRight } from 'lucide-react'
import { Snapshot } from '@/lib/snapshots'
import { cn } from '@/lib/utils'
import { Button } from '../ui/Button'

interface HistoryTimelineProps {
  snapshots: Snapshot[]
  currentItems: any[]
  onSnapshotClick: (snapshot: Snapshot) => void
  onRestore: (snapshot: Snapshot) => void
  onSave: (note: string) => void
  className?: string
}

export function HistoryTimeline({
  snapshots,
  currentItems,
  onSnapshotClick,
  onSave,
  className,
}: HistoryTimelineProps) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [note, setNote] = useState('')

  const handleSave = () => {
    onSave(note)
    setNote('')
    setShowSaveModal(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const calculateDelta = (snapshotItems: any[]) => {
    if (!currentItems.length) return null
    const currentById: Record<string, any> = {}
    currentItems.forEach((i) => (currentById[i.id] = i))

    let rose = 0
    let fell = 0
    let unchanged = 0

    snapshotItems.forEach((item) => {
      const current = currentById[item.id]
      if (!current) return

      const currentOrder = current.tierId
        ? currentItems.filter((i) => i.tierId === current.tierId).length
        : -1
      const prevOrder = item.tierId
        ? snapshotItems.filter((i) => i.tierId === item.tierId).length
        : -1

      if (currentOrder < prevOrder) rose++
      else if (currentOrder > prevOrder) fell++
      else unchanged++
    })

    return { rose, fell, unchanged }
  }

  return (
    <div className={cn('bg-[#1a1a1a] rounded-lg border border-[#262626]', className)}>
      <div className="p-3 border-b border-[#262626] flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-medium">
          <Clock className="w-4 h-4" />
          History
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowSaveModal(true)}>
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {snapshots.length === 0 ? (
          <div className="p-4 text-center text-[#525252]">
            No snapshots yet. Save a snapshot to track your progress.
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {snapshots.map((snapshot, index) => {
              const delta = calculateDelta(snapshot.items)
              return (
                <div
                  key={snapshot.id}
                  className="p-3 hover:bg-[#262626] cursor-pointer transition-colors"
                  onClick={() => onSnapshotClick(snapshot)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">
                      {formatDate(snapshot.createdAt)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#525252]" />
                  </div>
                  {snapshot.note && (
                    <p className="text-xs text-[#a1a1a1] mb-2">
                      {snapshot.note}
                    </p>
                  )}
                  {delta && (
                    <div className="flex gap-2 text-xs">
                      {delta.rose > 0 && (
                        <span className="text-green-500">↑{delta.rose}</span>
                      )}
                      {delta.fell > 0 && (
                        <span className="text-red-500">↓{delta.fell}</span>
                      )}
                      <span className="text-[#525252]">
                        {delta.unchanged} unchanged
                      </span>
                    </div>
                  )}
                  {index === 0 && (
                    <span className="mt-2 inline-block text-xs bg-[#f97316]/20 text-[#f97316] px-2 py-0.5 rounded">
                      Latest
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowSaveModal(false)}
          />
          <div className="relative w-full max-w-sm bg-[#1a1a1a] rounded-xl border border-[#262626] p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Save Snapshot
            </h3>
            <input
              type="text"
              placeholder="What changed? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-[#262626] border border-[#333] rounded-lg text-white mb-3"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
