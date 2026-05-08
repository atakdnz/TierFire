'use client'

import { Users, Copy, X, User } from 'lucide-react'
import { Session, Participant } from '@/lib/sessions'
import { cn } from '@/lib/utils'
import { Button } from '../ui/Button'

interface SessionPanelProps {
  session: Session
  onLeave: () => void
  currentUserId?: string
  className?: string
}

export function SessionPanel({ session, onLeave, currentUserId, className }: SessionPanelProps) {
  const copyLink = async () => {
    const url = `${window.location.origin}/session/${session.id}`
    await navigator.clipboard.writeText(url)
  }

  const isHost = session.hostId === currentUserId

  return (
    <div className={cn('bg-[#1a1a1a] rounded-lg border border-[#262626]', className)}>
      <div className="p-3 border-b border-[#262626] flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-medium">
          <Users className="w-4 h-4" />
          Session
        </div>
        <Button variant="ghost" size="sm" onClick={copyLink}>
          <Copy className="w-4 h-4 mr-1" />
          Share
        </Button>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-sm text-[#a1a1a1]">
            {session.participants.length} participant{session.participants.length !== 1 ? 's' : ''}
          </div>
          <span className="text-xs bg-[#f97316]/20 text-[#f97316] px-2 py-0.5 rounded">
            {session.mode === 'shared' ? 'Live Edit' : 'Side-by-Side'}
          </span>
        </div>

        <div className="space-y-2">
          {session.participants.map((p) => (
            <ParticipantRow key={p.uid} participant={p} isCurrentUser={p.uid === currentUserId} />
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-[#262626]">
        <Button variant="danger" size="sm" className="w-full" onClick={onLeave}>
          <X className="w-4 h-4 mr-1" />
          {isHost ? 'End Session' : 'Leave'}
        </Button>
      </div>
    </div>
  )
}

function ParticipantRow({ participant, isCurrentUser }: { participant: Participant; isCurrentUser: boolean }) {
  const statusColor = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-gray-500',
  }[participant.status]

  return (
    <div className="flex items-center gap-2">
      {participant.avatarUrl ? (
        <img
          src={participant.avatarUrl}
          alt={participant.displayName}
          className="w-6 h-6 rounded-full"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-[#262626] flex items-center justify-center">
          <User className="w-3 h-3" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">
          {participant.displayName}
          {isCurrentUser && <span className="text-[#525252] ml-1">(you)</span>}
        </div>
      </div>
      <div
        className={cn('w-2 h-2 rounded-full', statusColor)}
        title={participant.status}
      />
    </div>
  )
}