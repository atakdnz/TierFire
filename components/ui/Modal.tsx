'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={cn(
          'relative w-full max-w-md bg-[#1a1a1a] rounded-xl border border-[#262626]',
          'shadow-2xl animate-in fade-in zoom-in-95 duration-200',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}