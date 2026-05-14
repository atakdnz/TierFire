<div align="center">
  <h1>TierFire</h1>
  <p><strong>A modern tier list maker with guest drafts, cloud persistence, image uploads, history snapshots, and sharing workflows.</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/Firebase-Auth_&_Firestore-FFCA28?style=for-the-badge&logo=firebase" alt="Firebase" />
  </p>
</div>

---

## Overview

**TierFire** is a tier list creation platform built with modern web technologies. Whether you are a guest making a quick draft or a registered user managing a collection of tier lists, TierFire provides a drag-and-drop interface to visualize your rankings.

It aims to replace clunky legacy tier list makers with a fluid, accessible, and feature-rich experience.

---

## Key Features

- **Modern Drag & Drop Interface:** Powered by `@dnd-kit` for buttery-smooth interactions across desktop and mobile devices.
- **Cloud & Guest Modes:** Start drafting immediately as a guest (saved to `localStorage`), and seamlessly migrate your work to the cloud once authenticated via Firebase Auth.
- **Cloudinary Integration:** Effortlessly upload images directly to your item bank with automatic optimization and resizing.
- **High-Quality PNG Export:** Generate crisp, native Canvas exports of your tier board—complete with custom image cropping—perfect for sharing on social media.
- **Snapshots & History:** Never lose your work. Manually save snapshots and restore them with a built-in history manager.
- **Live Sessions:** Share a session room for read-only viewing or collaborative editing.
- **Premium Customization:** Fully customizable tier rows, intuitive color pickers, and inline editing for a flawless authoring experience.

---

## Tech Stack

TierFire is built with the React ecosystem:

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
- **UI & React:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Interactions:** `@dnd-kit/core` & `@dnd-kit/sortable`
- **Backend/Auth:** [Firebase Auth & Firestore](https://firebase.google.com/)
- **Media Storage:** [Cloudinary](https://cloudinary.com/)

---

## Getting Started

### Prerequisites

You will need **Node.js** (v18+) and your preferred package manager (`npm`, `yarn`, `pnpm`, or `bun`).

### Environment Variables

Create a `.env.local` file in the root directory and populate it with your Firebase and Cloudinary credentials:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/tierfire.git
   cd tierfire
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application in action.

---

## Project Structure

```text
tierfire-mvp/
├── app/                  # Next.js App Router pages & API routes
├── components/           # Reusable UI components
│   ├── tier/             # Core tier board components (Board, Row, Item, Bank)
│   ├── ui/               # Generic UI components (Buttons, Inputs, Modals)
│   └── collab/           # Collaboration & session UI
├── hooks/                # Custom React hooks (useTierList, useAuth, useHistory)
├── lib/                  # Utilities, Firebase config, & Firestore helpers
└── types/                # TypeScript interfaces and definitions
```

---

## Usage Highlights

### Creating a Tier List
- **Drag and Drop:** Easily drag items from your item bank directly into any tier row. Reorder items within tiers or drag them back to the bank to remove them.
- **Tap-to-Assign:** On mobile devices, tap an item in the bank to select it, then tap a tier row to assign it instantly.
- **Customization:** Click on a tier label to edit its name or change its color block. Long-press or click an item to adjust its label or replace its image.

### Exporting your List
Click the **Download** icon in the board header to instantly trigger a Canvas-based export of your tier board. It perfectly renders your customized tiers and images into a high-quality PNG, ignoring the UI clutter.

---

## Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

No license file is included yet. Add one before accepting external contributions or reuse.
