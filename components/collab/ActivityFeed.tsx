'use client'

import { Bell, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityFeedProps {
  activities: {
    action: string
    uid: string
    data: any
    timestamp: string
  }[]
  className?: string
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  const formatAction = (action: string, data: any) => {
    switch (action) {
      case 'item_moved':
        return `moved "${data.label}" to ${data.tierLabel}`
      case 'item_added':
        return `added "${data.label}"`
      case 'item_removed':
        return `removed "${data.label}"`
      case 'tier_updated':
        return `updated ${data.tierLabel}`
      default:
        return action
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(diff / 60000)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className={cn('bg-[#1a1a1a] rounded-lg border border-[#262626]', className)}>
      <div className="p-3 border-b border-[#262626] flex items-center gap-2 text-white font-medium">
        <Bell className="w-4 h-4" />
        Activity
      </div>

      <div className="max-h-48 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-[#525252] text-sm">
            No activity yet
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {activities.slice(0, 10).map((activity, i) => (
              <div key={i} className="p-3">
                <div className="text-sm text-white">
                  {formatAction(activity.action, activity.data)}
                </div>
                <div className="text-xs text-[#525252] flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(activity.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}