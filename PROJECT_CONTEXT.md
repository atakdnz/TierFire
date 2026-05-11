# TierFire Project Context

## Project Summary

TierFire is a Next.js App Router application for creating TierMaker-style tier lists with Firebase-backed accounts, guest drafts, Cloudinary image uploads, snapshots, sharing, and a partially scaffolded collaboration/session system.

The repository root for active development is `tierfire-mvp/`.

## Tech Stack

- Framework: Next.js 16.2.4, App Router
- React: 19.2.4
- Styling: Tailwind CSS v4 utility classes in components
- Drag and drop: `@dnd-kit/core`, `@dnd-kit/sortable`
- Auth: Firebase Authentication
- Database: Firebase Firestore
- Images: Cloudinary signed upload route plus CDN URLs in list items
- Icons: `lucide-react`
- Persistence fallback: `localStorage` for logged-out guest drafts only

## Important Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Commit rules live in `githubCommitProcess.md`. Use present-tense commit messages and always push immediately after committing.

## Environment Variables

Required for Firebase and Cloudinary:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Cloudinary signing route: `app/api/cloudinary/upload/route.ts`.

## Core Data Model

Types live in `types/index.ts`.

`TierList` contains:

- `id`
- `title`
- optional `description`
- optional `isPublic`
- optional `ownerId`
- `tiers`
- `items`
- numeric `createdAt`, `updatedAt`

`TierItem` contains:

- `id`
- `label`
- optional `imageUrl`
- optional image crop fields: `imageFit`, `imagePositionX`, `imagePositionY`, `imageScale`
- overlay text fields retained from original spec, not fully surfaced in UI
- `tierId`
- `order`

Firestore list documents are stored in `tierlists/{listId}`. Snapshot documents are stored in `tierlists/{listId}/snapshots/{snapshotId}`.

## Current Storage Rules

`hooks/useTierList.ts` is the main board state hook.

- Logged-out users use `localStorage` key `tierfire_lists`.
- Logged-in users load lists from Firestore only.
- Guest drafts without `ownerId` are imported into the signed-in account once, then local guest drafts are cleared.
- Lists with an existing `ownerId` that does not match the active user are not saved by the current user. This prevents account switching from stealing ownership.
- Firestore saves use `saveList` in `lib/firestore.ts`, which strips `undefined` values before `setDoc`.
- Board list loading intentionally avoids live `onSnapshot` listeners because earlier versions triggered Firebase internal assertion failures under rapid writes.

## Main Board UI

Primary component: `components/tier/TierBoard.tsx`.

Important child components:

- `components/tier/TierRow.tsx`
- `components/tier/TierItem.tsx`
- `components/tier/ItemBank.tsx`
- `components/ui/ImageUpload.tsx`

Current behavior:

- Tier rows are compact and use a colored left label rail.
- Drag/drop uses pointer-based collision detection for easier row dropping.
- Item cards are `96x96` with slightly rounded corners.
- Image items show a small bottom label overlay.
- Tier color does not tint item cards or item images.
- Item images can be repositioned by dragging inside the edit modal preview.
- Item image zoom remains a slider.
- Items can be duplicated from the edit modal.
- Empty tier rows do not show placeholder text.
- Item Bank can be shown below the board or as a fixed right-side scrollable panel. Preference is saved in `localStorage` under `tierfire_bank_layout`.

## PNG Export

`TierBoard.tsx` includes a client-side Canvas PNG export.

- Export button is in the board header with a download icon.
- Export draws the tier board from list data, not DOM screenshots.
- It exports tiers and tiered items, not the item bank.
- It draws Cloudinary images where browser CORS permits loading them with `crossOrigin = 'anonymous'`.
- Image crop fields are respected during export.
- The output filename is based on the list title.

If exported images are missing, check CORS/source image behavior first.

## Auth

Auth context: `hooks/useAuth.tsx`.

Auth pages:

- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`

Firebase initialization: `lib/firebase.ts`.

## Firestore Helpers

`lib/firestore.ts`:

- `getList`
- `saveList`
- `deleteList`
- `getUserLists`
- `getSharedList`
- subscription helpers exist but board avoids live list subscriptions

`lib/snapshots.ts`:

- snapshot create/load/delete helpers
- live snapshot subscription exists but main history hook now uses explicit loads

## History

`hooks/useHistory.ts` handles snapshots.

Current behavior:

- Guest snapshots stored in localStorage and capped at 20.
- Logged-in snapshots stored in Firestore.
- Manual snapshot save exists from the board header.
- History page: `app/list/[id]/history/page.tsx`.
- Owner can restore a snapshot. Current state is snapshotted before restoration.

Known warnings:

- `useHistory.ts` has an ESLint warning for synchronous setState in an effect. It is a warning, not a build blocker.

## Sharing

Public read-only list page: `app/list/[id]/page.tsx`.

Sharing requires:

- signed-in cloud list
- `isPublic = true`

Local guest lists are not shareable by URL.

## Sessions / Collaboration

Session page: `app/session/[id]/page.tsx`.
Session helpers: `lib/sessions.ts`.
Session UI: `components/collab/*`.

Current status:

- Session links can be created and copied from the board.
- Session pages load the list read-only.
- Host can end session; participants can leave.
- Session list is not a real-time editable collaboration surface.
- Side-by-side mode, chat, live movement, presence heartbeat, and conflict resolution are not fully implemented.

Treat current sessions as read-only review rooms unless deliberately building collaboration.

## Known Gaps / Not Fully Implemented

The original spec is much larger than the current app. Missing or partial areas:

- Full real-time collaborative editing
- Side-by-side comparison/consensus workflow
- Session chat and presence heartbeat
- Full text overlay editor UI
- Glow/delta comparison mode
- Full rewind animation through snapshots
- Polished lint cleanup for scaffolded history/collab files
- Middleware-based protected routes and auth cookie flow from original spec

## UI Direction

The user prefers a dense TierMaker-like working UI over spacious modern dashboard styling.

Current preferences established through iteration:

- Compact rows and items
- Minimal row placeholders
- Left tier label rail should focus on tier name, not utility icons
- Item bank as square plus tile, not a big separate Add Item button
- Optional fixed right-side item bank for long tier lists
- Image labels visible but small enough not to hide too much image
- No tier-color tint over item cards/images

## Recent Stability Fixes

- Firestore `undefined` save errors fixed with `stripUndefined`.
- Firebase internal assertion issues reduced by removing live list listener usage on board.
- Account ownership stealing fixed by refusing to import/save cloud-owned lists under another user.
- Guest localStorage drafts are cleared after import.
- Session end button now deletes host sessions and disables while processing.

## Recommended Next Work

1. Manually test PNG export with text-only items and Cloudinary image items.
2. Clean lint warnings in scaffolded unused components when convenient.
3. Decide whether sessions should remain read-only or be rebuilt as proper collaboration.
4. Add a clearer recovery/admin path for correcting wrong list ownership if pre-fix data exists.
5. Consider a more robust export path if non-Cloudinary external images need to export reliably.
