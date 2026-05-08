'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ className, label, id, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm text-[#a1a1a1] mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded-lg',
          'text-white placeholder-[#525252]',
          'focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]',
          'transition-all duration-200',
          className
        )}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </div>
  )
}