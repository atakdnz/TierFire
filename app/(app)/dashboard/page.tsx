'use client'

import { useRouter } from 'next/navigation'
import { Plus, List, Trash2, Globe, Lock } from 'lucide-react'
import { useTierList } from '@/hooks/useTierList'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const router = useRouter()
  const { lists, setActiveList, createList, deleteList } = useTierList()
  const { user } = useAuth()

  const handleOpenList = (listId: string) => {
    setActiveList(listId)
    router.push('/board')
  }

  const handleCreateNew = () => {
    createList('Untitled List')
    router.push('/board')
  }

  const handleDeleteList = (e: React.MouseEvent, listId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this list?')) {
      deleteList(listId)
    }
  }

  return (
    <div className="h-full bg-[#0f0f0f] p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Your Tier Lists</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create New Card */}
          <button
            onClick={handleCreateNew}
            className="group flex flex-col items-center justify-center h-56 rounded-xl border-2 border-dashed border-[#262626] bg-[#111111] hover:bg-[#1a1a1a] hover:border-[#f97316] transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-[#262626] group-hover:bg-[#f97316]/20 flex items-center justify-center mb-4 transition-colors">
              <Plus className="w-6 h-6 text-[#a1a1a1] group-hover:text-[#f97316]" />
            </div>
            <span className="text-[#a1a1a1] group-hover:text-white font-medium">Create New List</span>
          </button>

          {/* List Cards */}
          {lists.map((list) => (
            <div
              key={list.id}
              onClick={() => handleOpenList(list.id)}
              className="group flex flex-col h-56 rounded-xl border border-[#262626] bg-[#111111] hover:bg-[#1a1a1a] hover:border-[#525252] transition-all cursor-pointer relative"
            >
              <div className="flex-1 p-6 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#262626] text-[#f97316] group-hover:scale-110 transition-transform">
                    <List className="w-5 h-5" />
                  </div>
                  {user && (
                    <div title={list.isPublic ? 'Public' : 'Private'}>
                      {list.isPublic ? (
                        <Globe className="w-4 h-4 text-[#525252]" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#525252]" />
                      )}
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-white line-clamp-2 mt-2 leading-tight">
                  {list.title}
                </h3>
                
                <div className="mt-auto pt-4 flex flex-col gap-1">
                  <p className="text-sm text-[#a1a1a1]">
                    {list.items.length} items • {list.tiers.length} tiers
                  </p>
                  <p className="text-xs text-[#525252]">
                    Updated {new Date(list.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Hover Action Bar */}
              <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleDeleteList(e, list.id)}
                  className="p-2 text-[#a1a1a1] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors bg-[#111111]/80 backdrop-blur"
                  title="Delete List"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
