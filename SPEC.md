# TierFire MVP — Technical Specification

---

## Overview

TierFire MVP is a basic tier list maker with drag-and-drop functionality, localStorage persistence, and undo/redo support. Guest users can create and manage tier lists without authentication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Icons | Lucide React |
| State | React useReducer + localStorage |

---

## File Structure

```
tierfire-mvp/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # Landing
│   └── board/
│       └── page.tsx          # Main tier board
├── components/
│   ├── tier/
│   │   ├── TierBoard.tsx
│   │   ├── TierRow.tsx
│   │   ├── TierItem.tsx
│   │   └── ItemBank.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── ColorPicker.tsx
│   └── layout/
│       └── Header.tsx
├── hooks/
│   ├── useTierList.ts
│   └── useLocalStorage.ts
├── types/
│   └── index.ts
├── lib/
│   └── utils.ts
└── public/
```

---

## Data Types

```ts
interface TierItem {
  id: string
  label: string
  imageUrl?: string
  overlayText?: string
  overlayFont?: string
  overlaySize?: number
  overlayColor?: string
  overlayPosition?: 'top' | 'center' | 'bottom'
  tierId: string | null  // null = in item bank
  order: number
}

interface Tier {
  id: string
  label: string
  color: string
  order: number
}

interface TierList {
  id: string
  title: string
  tiers: Tier[]
  items: TierItem[]
  createdAt: number
  updatedAt: number
}
```

---

## Default Tier Configuration

| Order | Label | Color (Tailwind) |
|---|---|---|
| 0 | S | #ef4444 (red-500) |
| 1 | A | #f97316 (orange-500) |
| 2 | B | #eab308 (yellow-500) |
| 3 | C | #22c55e (green-500) |
| 4 | D | #3b82f6 (blue-500) |
| 5 | F | #6b7280 (gray-500) |

---

## Component Specs

### TierBoard

- Header with list title (editable), undo/redo buttons, settings menu
- 6 tier rows stacked vertically (S on top)
- Item bank below tier rows
- Drag-and-drop enabled across all zones
- Empty state: "Add items to get started"

### TierRow

- Colored left border (4px, tier color)
- Inline editable label
- Drag handle for reordering rows
- Drop zone for items
- Minimum height: 120px

### TierItem

- 120×120px card
- Image fills card if exists, otherwise placeholder
- Overlay text positioned absolutely on image
- Draggable with visual feedback
- States: default, dragging, selected

### ItemBank

- Grid layout, 3 columns on mobile, 6 on desktop
- "Add item" button opens modal
- Click to select in tap-to-assign mode
- Drag from bank to any tier row

---

## Interactions

### Desktop (Drag & Drop)

- Drag item from bank → tier row
- Drag item between tier rows
- Drag item from tier → bank (removes from tier)
- Click item to edit label/image
- Drag row handle to reorder tiers

### Mobile (Tap-to-Assign)

- Tap item in bank to select (highlight border)
- Tap tier row to place selected item
- Tap tier row item to select → tap another tier to move
- Long-press (500ms) opens edit modal

### Keyboard

- Ctrl+Z: Undo
- Ctrl+Y / Ctrl+Shift+Z: Redo

---

## Undo/Redo System

- Action types: ADD_ITEM, REMOVE_ITEM, MOVE_ITEM, REORDER_TIER, UPDATE_ITEM, UPDATE_TIER, DELETE_LIST
- Max history: 50 actions
- Stored in memory (not localStorage)

```ts
type Action =
  | { type: 'ADD_ITEM'; item: TierItem }
  | { type: 'REMOVE_ITEM'; item: TierItem }
  | { type: 'MOVE_ITEM'; itemId: string; fromTierId: string | null; toTierId: string | null; order: number }
  | { type: 'REORDER_TIER'; tierId: string; fromOrder: number; toOrder: number }
  | { type: 'UPDATE_ITEM'; item: TierItem; previous: TierItem }
  | { type: 'UPDATE_TIER'; tier: Tier; previous: Tier }
```

---

## localStorage Schema

```
Key: tierfire_lists
Value: JSON array of TierList objects

Key: tierfire_active_list
Value: string (active list ID)
```

---

## UI Design

### Colors

- Background: #0f0f0f (near black)
- Surface: #1a1a1a (card backgrounds)
- Border: #262626 (subtle borders)
- Text Primary: #ffffff
- Text Secondary: #a1a1a1
- Accent: #f97316 (orange-500 for CTAs)

### Typography

- Font: Inter (via next/font)
- Tier labels: Uppercase, 14px, font-bold
- Item labels: 12px, text-center
- Headings: 24px, font-semibold

### Spacing

- Base unit: 4px
- Card padding: 12px
- Row gap: 8px
- Section gap: 24px

---

## Acceptance Criteria

1. ✅ Can create new tier list
2. ✅ Can add items with label (text) to item bank
3. ✅ Can drag items between tiers
4. ✅ Can drag items to bank to remove from tier
5. ✅ Can reorder tier rows
6. ✅ Undo reverses last action
7. ✅ Redo restores undone action
8. ✅ Data persists in localStorage across refresh
9. ✅ Works on desktop with drag-and-drop
10. ✅ Works on mobile with tap-to-assign mode
11. ✅ Can edit item label and image URL
12. ✅ Can change tier label and color

---

## Not in MVP

- Firebase Auth
- Firestore storage
- Cloudinary uploads
- History timeline
- Collaboration
- Text overlay editor (beyond basic)
- Sharing via URL