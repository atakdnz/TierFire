'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Flame, Plus, History, Users, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

const STORAGE_KEY = 'tierfire_lists'

interface TierList {
  id: string
  title: string
  createdAt: number
}

export default function Home() {
  const { user, loading } = useAuth()
  const [showImportModal, setShowImportModal] = useState(false)
  const [guestLists, setGuestLists] = useState<TierList[]>([])
  const [imported, setImported] = useState(false)

  useEffect(() => {
    if (user && !loading && !imported) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const lists = JSON.parse(stored) as TierList[]
          if (lists.length > 0) {
            setGuestLists(lists)
            setShowImportModal(true)
          }
        }
      } catch {}
    }
  }, [user, loading, imported])

  const handleImport = () => {
    setImported(true)
    setShowImportModal(false)
  }

  const handleSkip = () => {
    localStorage.removeItem(STORAGE_KEY)
    setImported(true)
    setShowImportModal(false)
  }

  return (
    <>
      <div className="min-h-screen bg-[#0f0f0f]">
        <header className="border-b border-[#262626]">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-8 h-8 text-[#f97316]" />
              <span className="text-xl font-bold text-white">TierFire</span>
            </div>
            <div className="flex items-center gap-3">
              {!user && !loading && (
                <>
                  <Link href="/login">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary">Get Started</Button>
                  </Link>
                </>
              )}
              {user && (
                <Link href="/board">
                  <Button variant="primary">Go to Board</Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Make Tier Lists
              <span className="block text-[#f97316]">That Actually Look Good</span>
            </h1>
            <p className="text-xl text-[#a1a1a1] max-w-2xl mx-auto">
              Create beautiful tier lists with drag-and-drop, history tracking,
              and collaboration features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#262626]">
              <div className="w-12 h-12 rounded-lg bg-[#f97316]/20 flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-[#f97316]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Drag & Drop</h3>
              <p className="text-[#a1a1a1]">
                Easily arrange items between tiers with smooth drag and drop.
              </p>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#262626]">
              <div className="w-12 h-12 rounded-lg bg-[#f97316]/20 flex items-center justify-center mb-4">
                <History className="w-6 h-6 text-[#f97316]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">History</h3>
              <p className="text-[#a1a1a1]">
                Track changes with snapshots and rewind to any version.
              </p>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#262626]">
              <div className="w-12 h-12 rounded-lg bg-[#f97316]/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[#f97316]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Collab</h3>
              <p className="text-[#a1a1a1]">
                Work together in real-time with friends or teammates.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link href="/board">
              <Button variant="primary" size="lg">
                Start Creating
              </Button>
            </Link>
          </div>
        </main>

        <footer className="border-t border-[#262626] py-8 mt-16">
          <div className="max-w-5xl mx-auto px-4 text-center text-[#525252] text-sm">
            <p>TierFire — Built with Next.js</p>
          </div>
        </footer>
      </div>

      <Modal open={showImportModal} onClose={handleSkip} title="Import Your Lists">
        <div className="space-y-4">
          <p className="text-[#a1a1a1]">
            We found {guestLists.length} tier list{guestLists.length !== 1 ? 's' : ''} saved locally.
            Import them to back them up to your account?
          </p>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {guestLists.map((list) => (
              <div key={list.id} className="p-3 bg-[#262626] rounded-lg">
                {list.title}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
            <Button variant="primary" onClick={handleImport}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Import All
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}