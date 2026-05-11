'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, LayoutDashboard, PlusSquare, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTierList } from '@/hooks/useTierList'

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()
  const { createList } = useTierList()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleNewBoard = (e: React.MouseEvent) => {
    e.preventDefault()
    createList('Untitled List')
    router.push('/board')
  }

  return (
    <aside className="w-16 md:w-20 lg:w-64 flex-shrink-0 h-screen bg-[#111111] border-r border-[#262626] flex flex-col transition-all duration-300">
      {/* Header/Logo */}
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-[#262626]">
        <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
          <Flame className="w-8 h-8 text-[#f97316]" />
          <span className="text-xl font-bold hidden lg:block">TierFire</span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
            pathname.startsWith('/dashboard')
              ? 'bg-[#262626] text-white'
              : 'text-[#a1a1a1] hover:text-white hover:bg-[#1a1a1a]'
          }`}
          title="Dashboard"
        >
          <LayoutDashboard className="w-6 h-6 flex-shrink-0" />
          <span className="font-medium hidden lg:block">Dashboard</span>
        </Link>

        <a
          href="/board"
          onClick={handleNewBoard}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group text-[#a1a1a1] hover:text-white hover:bg-[#1a1a1a]`}
          title="New Board"
        >
          <PlusSquare className="w-6 h-6 flex-shrink-0" />
          <span className="font-medium hidden lg:block">New Board</span>
        </a>
      </nav>

      {/* Footer / User */}
      <div className="p-3 border-t border-[#262626]">
        {user ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[#a1a1a1] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors"
            title="Log Out"
          >
            <LogOut className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium hidden lg:block truncate">{user.displayName || user.email}</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#a1a1a1] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            title="Sign In"
          >
            <UserIcon className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium hidden lg:block">Sign In</span>
          </Link>
        )}
      </div>
    </aside>
  )
}
