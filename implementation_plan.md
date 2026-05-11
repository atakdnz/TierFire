# 🔥 TierFire — Complete Technical Specification

---

## 🏗️ Tech Stack Overview

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Image Storage | Cloudinary |
| Real-time | Firebase Firestore live listeners + Socket.io for collab sessions |
| Deployment | Vercel |
| Local Fallback | localStorage (guest users) |

---

## 📁 Project Structure

```
tierfire/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── list/[id]/page.tsx
│   │   ├── list/[id]/history/page.tsx
│   │   └── session/[id]/page.tsx
│   ├── api/
│   │   ├── cloudinary/upload/route.ts
│   │   └── socket/route.ts
│   ├── layout.tsx
│   └── page.tsx (landing)
├── components/
│   ├── tier/
│   │   ├── TierBoard.tsx
│   │   ├── TierRow.tsx
│   │   ├── TierItem.tsx
│   │   ├── ItemBank.tsx
│   │   └── TextOverlayEditor.tsx
│   ├── history/
│   │   ├── HistoryTimeline.tsx
│   │   ├── SnapshotPreview.tsx
│   │   ├── ItemHistoryTooltip.tsx
│   │   └── GlowDelta.tsx
│   ├── collab/
│   │   ├── SessionPanel.tsx
│   │   ├── PresenceIndicator.tsx
│   │   └── ActivityFeed.tsx
│   └── ui/ (shadcn components)
├── lib/
│   ├── firebase.ts
│   ├── cloudinary.ts
│   ├── socket.ts
│   ├── snapshots.ts
│   └── localStorage.ts
├── hooks/
│   ├── useTierList.ts
│   ├── useHistory.ts
│   ├── useSession.ts
│   └── usePresence.ts
├── types/
│   └── index.ts
└── public/
```

---

## 🔐 Authentication — Firebase Auth Only

- Providers: Email/password and Google Sign-In via Firebase Authentication SDK.
- Auth state managed globally via a `useAuth` context wrapping the entire app.
- Protected routes handled by Next.js middleware (`middleware.ts`) checking Firebase ID token from a cookie.
- Guest users bypass auth entirely — no redirect, no wall. A non-intrusive banner appears offering to save their work by signing in.
- On sign-in, any localStorage tier lists are offered for import into their account.

```ts
// lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export const app = initializeApp({ /* env vars */ })
export const auth = getAuth(app)
export const db = getFirestore(app)
```

---

## 🗄️ Firestore Data Model

```
users/{uid}
  displayName: string
  avatarUrl: string
  createdAt: timestamp

tierlists/{listId}
  ownerId: string
  title: string
  description: string
  isPublic: boolean
  createdAt: timestamp
  updatedAt: timestamp
  tiers: [
    { id, label, color, order }
  ]
  items: [
    {
      id, label, imageUrl, overlayText,
      overlayFont, overlaySize, overlayColor,
      overlayPosition, tierId, order
    }
  ]

tierlists/{listId}/snapshots/{snapshotId}
  createdAt: timestamp
  note: string
  tiers: [...] // full tier state clone
  items: [...] // full item state clone with tierId at time of snapshot

sessions/{sessionId}
  hostId: string
  mode: 'shared' | 'sidebyside'
  listId: string         // for shared mode
  listIds: [string, string]  // for side-by-side mode
  participants: [{ uid, displayName, avatarUrl, color }]
  createdAt: timestamp
  expiresAt: timestamp
```

---

## 🖼️ Cloudinary — Image Storage

- Images are uploaded directly from the browser to Cloudinary via a signed upload using a Next.js API route to generate the signature (keeping API secret server-side).
- The returned CDN URL is stored on the item object in Firestore.
- Transformations applied at the CDN level: auto format (`f_auto`), auto quality (`q_auto`), and thumbnail sizing for item cards (`w_120,h_120,c_fill`).
- Guest users upload images the same way — the CDN URL is stored in the item object in localStorage.

```ts
// app/api/cloudinary/upload/route.ts
// Generates a signed upload signature server-side
// Client POSTs image → receives CDN URL → stores on item
```

---

## 💾 Storage Strategy by User Type

| Feature | Guest (localStorage) | Logged-in (Firestore) |
|---|---|---|
| Tier list layout | ✅ | ✅ |
| Item positions | ✅ | ✅ |
| History snapshots | ✅ capped at 20 | ✅ unlimited |
| Sharing via URL | ❌ | ✅ |
| Collaboration | ❌ | ✅ |
| Image uploads | ✅ Cloudinary URL stored locally | ✅ Cloudinary URL in Firestore |

---

## 🎨 Tier Board — Frontend Architecture

- **Drag and drop**: `@dnd-kit/core` + `@dnd-kit/sortable` — works across tier rows and the item bank. Chosen over `react-beautiful-dnd` for better touch support and active maintenance.
- **Mobile interaction**: on touch devices, a tap-to-assign mode is activated automatically via a `useMediaQuery` hook. Tap an item to select it (highlighted border), then tap a tier to place it.
- **Undo/redo**: implemented with a local action history stack in `useTierList.ts` using a reducer pattern. Ctrl+Z / Ctrl+Y on desktop; undo/redo buttons on mobile.
- **Tier rows**: each row has an inline label editor, a color picker (swatches + hex input), and drag handles for reordering rows themselves.
- **Item cards**: `120×120px` squares. If an image exists it fills the card. Overlay text is rendered as an absolutely positioned element within the card with configurable font/size/color/position.

---

## 🖼️ Text Overlay Editor

- Triggered from the item edit modal.
- Canvas-free: overlay is a live CSS-positioned `<div>` over the image, so what you see in the editor matches what renders in the tier board exactly.
- Controls: text input, font family selector (subset of Google Fonts loaded via `next/font`), size slider, color picker, shadow toggle, vertical position (top / center / bottom).
- The overlay config is stored as fields on the item object, not baked into the image, so it remains editable after saving.

---

## 🕓 Tier Memory — History System

### Snapshots
- Auto-save snapshot triggered after 10 minutes of activity (debounced) or on manual save.
- Manual save shows a note input modal: *"What changed? (optional)"*
- Snapshots written to `tierlists/{listId}/snapshots/` in Firestore (or localStorage array for guests, capped at 20).

### History Timeline Page (`/list/:id/history`)
- Vertical timeline, newest at top.
- Each entry: timestamp, optional note, delta badge (`↑8 rose · ↓3 fell · 5 unchanged`).
- Clicking an entry opens a full read-only snapshot preview overlay.
- Restore button on any snapshot creates a new snapshot of the current state first, then replaces current state.

### Item Hover Tooltip
- Hovering any item for 500ms triggers a popover showing that item's full tier journey:
  - A row of tier badges in chronological order: `C → B → A → S`
  - Exact dates below each badge.
  - A small sparkline graph (rendered with `recharts`) showing tier level over time (S=6, A=5, B=4, C=3, D=2, F=1).
  - Total moves count and date first added.
- On mobile, the tooltip is triggered by long-press (500ms).

### Glow Mode (Delta View)
- Activated from a toolbar toggle: "Compare to: [snapshot selector dropdown]"
- Each item gets a colored glow computed from `currentTierRank - previousTierRank`:
  - `> 0`: green glow, upward arrow, `+N` badge. Glow opacity scales with distance.
  - `< 0`: red glow, downward arrow, `-N` badge.
  - `= 0`: faint white pulse.
  - First time in S tier: gold shimmer animation.
- Implemented as CSS custom properties on each item card (`--glow-color`, `--glow-intensity`) driven by computed delta values.

### Rewind Mode
- A play button in the history panel animates the tier board through snapshots in order.
- Items smoothly transition between tier rows using `@dnd-kit` programmatic moves + CSS transitions.
- Playback speed control: 0.5×, 1×, 2×.

---

## 🤝 Collaborative Editing

### Session Creation
- Host creates a session from their list's options menu, picks a mode, and gets a shareable `/session/:id` link.
- Sessions expire after 24 hours of inactivity.

### Mode 1 — Shared List
- Both users see and edit one tier list.
- Firestore real-time listeners sync all changes instantly.
- Each participant has a unique color (assigned on join). Their avatar floats near the item they are currently dragging.
- Conflict resolution: Firestore transactions used for item placement. Last write wins per item. Animated "tug" effect if two users grab the same item simultaneously.
- Live activity feed panel: *"Alex moved 'Redbone' → S Tier — just now"*

### Mode 2 — Side-by-Side
- Each user has their own list (same item pool, different placements).
- Split panel layout: your list left, partner's right. Stacks vertically on mobile.
- Partner's panel is live-updating but read-only.
- Items diverging by 2+ tiers get an amber outline as a disagreement indicator.
- Consensus bar at the bottom: shows items you both ranked identically vs. contested items.

### Presence System
- Built with Firestore presence pattern: each participant writes a heartbeat to `sessions/{id}/presence/{uid}` every 30 seconds.
- Status: `online` (heartbeat < 35s ago), `idle` (heartbeat < 3min), `offline`.
- Displayed as colored dot on avatar.

### Session Chat
- Minimal floating chat panel using Firestore `sessions/{id}/messages` subcollection.
- Text only, no file sharing. Shows participant avatar + name + message + timestamp.

---

## 🚀 Vercel Deployment

- **Framework preset**: Next.js (auto-detected by Vercel).
- **Environment variables** set in Vercel dashboard:
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  NEXT_PUBLIC_FIREBASE_PROJECT_ID
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  ```
- **API routes** (`/api/*`) deploy as Vercel serverless functions automatically.
- **Socket.io** for real-time collab: deployed as a separate lightweight Node server on Railway (Vercel serverless functions don't support persistent WebSocket connections). The Next.js app connects to it via `NEXT_PUBLIC_SOCKET_URL` env var.
- **Vercel Analytics** enabled for page view tracking.
- **Image optimization**: Cloudinary handles all image CDN — Next.js `next/image` configured with Cloudinary domain in `next.config.js`.

```js
// next.config.js
module.exports = {
  images: {
    domains: ['res.cloudinary.com'],
  },
}
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| `< 640px` (mobile) | Single column, tap-to-assign, stacked collab panels, bottom sheet modals |
| `640–1024px` (tablet) | Two column item bank, side drawer for history |
| `> 1024px` (desktop) | Full split panel collab, floating history sidebar, hover tooltips |

Tailwind breakpoints (`sm`, `md`, `lg`) used consistently. No custom breakpoints needed.

---

