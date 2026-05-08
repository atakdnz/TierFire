'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f0f0f]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-[#f97316] text-white hover:bg-[#ea580c] focus:ring-[#f97316]': variant === 'primary',
          'bg-[#262626] text-white hover:bg-[#333333] focus:ring-[#262626]': variant === 'secondary',
          'bg-transparent text-[#a1a1a1] hover:text-white hover:bg-[#262626]': variant === 'ghost',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}