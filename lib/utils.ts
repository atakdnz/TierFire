import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { type Tier, type TierList } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function createDefaultTiers(): Tier[] {
  return [
    { id: 'tier-s', label: 'S', color: '#ef4444', order: 0 },
    { id: 'tier-a', label: 'A', color: '#f97316', order: 1 },
    { id: 'tier-b', label: 'B', color: '#eab308', order: 2 },
    { id: 'tier-c', label: 'C', color: '#22c55e', order: 3 },
    { id: 'tier-d', label: 'D', color: '#3b82f6', order: 4 },
    { id: 'tier-f', label: 'F', color: '#6b7280', order: 5 },
  ]
}

export function createNewList(title: string = 'My Tier List'): TierList {
  return {
    id: generateId(),
    title,
    tiers: createDefaultTiers(),
    items: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}