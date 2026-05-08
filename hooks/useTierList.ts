'use client'

import { useReducer, useEffect, useCallback, useRef } from 'react'
import { TierList, TierItem, Tier, HistoryAction } from '@/types'
import { createNewList, generateId } from '@/lib/utils'
import { saveList, getUserLists, deleteList as deleteCloudList } from '@/lib/firestore'
import { useAuth } from './useAuth'

const STORAGE_KEY = 'tierfire_lists'
const ACTIVE_LIST_KEY = 'tierfire_active_list'
const IMPORTED_USER_KEY = 'tierfire_imported_user'
const MAX_HISTORY = 50

interface State {
  lists: TierList[]
  activeListId: string | null
  history: HistoryAction[]
  historyIndex: number
}

type Action =
  | { type: 'LOAD'; lists: TierList[]; activeListId: string | null }
  | { type: 'SET_ACTIVE'; listId: string }
  | { type: 'CREATE_LIST'; title: string; ownerId?: string }
  | { type: 'DELETE_LIST'; listId: string }
  | { type: 'UPDATE_LIST_TITLE'; listId: string; title: string }
  | { type: 'TOGGLE_PUBLIC'; listId: string }
  | { type: 'REPLACE_LIST'; list: TierList }
  | { type: 'ADD_ITEM'; listId: string; item: TierItem }
  | { type: 'UPDATE_ITEM'; listId: string; item: TierItem; previous: TierItem }
  | { type: 'REMOVE_ITEM'; listId: string; item: TierItem }
  | {
      type: 'MOVE_ITEM'
      listId: string
      itemId: string
      fromTierId?: string | null
      fromOrder?: number
      toTierId: string | null
      order: number
    }
  | { type: 'REORDER_TIER'; listId: string; tierId: string; fromOrder?: number; toOrder: number }
  | { type: 'UPDATE_TIER'; listId: string; tier: Tier; previous: Tier }
  | { type: 'UNDO' }
  | { type: 'REDO' }

function findList(state: State, listId: string): TierList | undefined {
  return state.lists.find(l => l.id === listId)
}

function applyAction(list: TierList, action: HistoryAction): TierList {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...list, items: [...list.items, action.item!], updatedAt: Date.now() }
    case 'REMOVE_ITEM':
      return { ...list, items: list.items.filter(i => i.id !== action.item!.id), updatedAt: Date.now() }
    case 'MOVE_ITEM': {
      const movingItem = list.items.find((item) => item.id === action.itemId)
      if (!movingItem) return list

      const targetTierId = action.toTierId ?? null
      const targetOrder = Math.max(0, action.order ?? 0)
      const otherItems = list.items.filter((item) => item.id !== action.itemId)
      const updatedMovingItem = { ...movingItem, tierId: targetTierId }

      const items = [...otherItems, updatedMovingItem].map((item) => {
        const peers = [...otherItems, updatedMovingItem]
          .filter((peer) => peer.tierId === item.tierId)
          .sort((a, b) => {
            if (a.id === updatedMovingItem.id) return 1
            if (b.id === updatedMovingItem.id) return -1
            return a.order - b.order
          })

        const withoutMoving = peers.filter((peer) => peer.id !== updatedMovingItem.id)
        const orderedPeers = item.tierId === targetTierId
          ? [
              ...withoutMoving.slice(0, Math.min(targetOrder, withoutMoving.length)),
              updatedMovingItem,
              ...withoutMoving.slice(Math.min(targetOrder, withoutMoving.length)),
            ]
          : peers

        const order = orderedPeers.findIndex((peer) => peer.id === item.id)
        return { ...item, order: order === -1 ? item.order : order }
      })

      return { ...list, items, updatedAt: Date.now() }
    }
    case 'UPDATE_ITEM':
      return {
        ...list,
        items: list.items.map(i => (i.id === action.item!.id ? action.item! : i)),
        updatedAt: Date.now(),
      }
    case 'REORDER_TIER': {
      const movingTier = list.tiers.find((tier) => tier.id === action.tierId)
      if (!movingTier) return list

      const otherTiers = list.tiers
        .filter((tier) => tier.id !== action.tierId)
        .sort((a, b) => a.order - b.order)
      const targetOrder = Math.max(0, Math.min(action.toOrder ?? otherTiers.length, otherTiers.length))
      const tiers = [
        ...otherTiers.slice(0, targetOrder),
        movingTier,
        ...otherTiers.slice(targetOrder),
      ].map((tier, order) => ({ ...tier, order }))

      return { ...list, tiers, updatedAt: Date.now() }
    }
    case 'UPDATE_TIER':
      return {
        ...list,
        tiers: list.tiers.map(t => (t.id === action.tier!.id ? action.tier! : t)),
        updatedAt: Date.now(),
      }
    default:
      return list
  }
}

function reverseAction(action: HistoryAction): HistoryAction | null {
  switch (action.type) {
    case 'ADD_ITEM':
      return { type: 'REMOVE_ITEM', item: action.item!, listId: action.listId }
    case 'REMOVE_ITEM':
      return { type: 'ADD_ITEM', item: action.item!, listId: action.listId }
    case 'MOVE_ITEM':
      return {
        type: 'MOVE_ITEM',
        itemId: action.itemId!,
        toTierId: action.fromTierId!,
        order: action.fromOrder!,
        listId: action.listId,
      }
    case 'UPDATE_ITEM':
      return { type: 'UPDATE_ITEM', item: action.previousItem!, previousItem: action.item!, listId: action.listId }
    case 'REORDER_TIER':
      return {
        type: 'REORDER_TIER',
        tierId: action.tierId,
        toOrder: action.fromOrder,
        listId: action.listId,
      }
    case 'UPDATE_TIER':
      return null
    default:
      return null
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { ...state, lists: action.lists, activeListId: action.activeListId, history: [], historyIndex: -1 }

    case 'SET_ACTIVE':
      return { ...state, activeListId: action.listId }

    case 'CREATE_LIST': {
      const newList = createNewList(action.title)
      if (action.ownerId) {
        newList.ownerId = action.ownerId
        newList.isPublic = false
      }
      return {
        ...state,
        lists: [...state.lists, newList],
        activeListId: newList.id,
        history: [],
        historyIndex: -1,
      }
    }

    case 'DELETE_LIST': {
      let lists = state.lists.filter(l => l.id !== action.listId)
      if (lists.length === 0) {
        lists = [createNewList('My Tier List')]
      }
      const activeListId = state.activeListId === action.listId
        ? lists[0]?.id || null
        : state.activeListId
      return { ...state, lists, activeListId, history: [], historyIndex: -1 }
    }

    case 'UPDATE_LIST_TITLE': {
      const lists = state.lists.map(l =>
        l.id === action.listId ? { ...l, title: action.title, updatedAt: Date.now() } : l
      )
      return { ...state, lists }
    }

    case 'TOGGLE_PUBLIC': {
      const lists = state.lists.map(l =>
        l.id === action.listId ? { ...l, isPublic: !l.isPublic, updatedAt: Date.now() } : l
      )
      return { ...state, lists }
    }

    case 'REPLACE_LIST': {
      const lists = state.lists.map(l =>
        l.id === action.list.id ? { ...action.list, updatedAt: Date.now() } : l
      )
      return { ...state, lists, activeListId: action.list.id, history: [], historyIndex: -1 }
    }

    case 'ADD_ITEM': {
      const lists = state.lists.map(l =>
        l.id === action.listId ? applyAction(l, action) : l
      )
      const newHistory = state.history.slice(0, state.historyIndex + 1).concat({ ...action, type: 'ADD_ITEM' } as HistoryAction)
      return {
        ...state,
        lists,
        history: newHistory.slice(-MAX_HISTORY),
        historyIndex: newHistory.length - 1,
      }
    }

    case 'REMOVE_ITEM':
    case 'UPDATE_ITEM':
    case 'MOVE_ITEM':
    case 'REORDER_TIER':
    case 'UPDATE_TIER': {
      const lists = state.lists.map(l =>
        l.id === action.listId ? applyAction(l, action) : l
      )
      const histories = state.history.slice(0, state.historyIndex + 1)
      let newAction: HistoryAction
      if (action.type === 'REMOVE_ITEM') {
        newAction = { ...action, type: 'REMOVE_ITEM' } as HistoryAction
      } else if (action.type === 'UPDATE_ITEM') {
        newAction = { ...action, type: 'UPDATE_ITEM', previousItem: action.previous, item: action.item } as HistoryAction
      } else if (action.type === 'MOVE_ITEM') {
        newAction = { ...action, type: 'MOVE_ITEM' } as HistoryAction
      } else if (action.type === 'REORDER_TIER') {
        newAction = { ...action, type: 'REORDER_TIER' } as HistoryAction
      } else {
        newAction = { ...action, type: 'UPDATE_TIER', previousTier: action.previous, tier: action.tier } as HistoryAction
      }
      return {
        ...state,
        lists,
        history: histories.concat(newAction).slice(-MAX_HISTORY),
        historyIndex: histories.length,
      }
    }

    case 'UNDO': {
      if (state.historyIndex < 0 || !state.activeListId) return state
      const actionToReverse = state.history[state.historyIndex]
      const reverse = reverseAction(actionToReverse)
      if (!reverse) return state

      const list = findList(state, state.activeListId)!
      const reversedList = applyAction(list, reverse)

      const lists = state.lists.map(l =>
        l.id === state.activeListId ? reversedList : l
      )

      return { ...state, lists, historyIndex: state.historyIndex - 1 }
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1 || !state.activeListId) return state
      const actionToRedo = state.history[state.historyIndex + 1]
      const list = findList(state, state.activeListId)!
      const redoneList = applyAction(list, actionToRedo)

      const lists = state.lists.map(l =>
        l.id === state.activeListId ? redoneList : l
      )

      return { ...state, lists, historyIndex: state.historyIndex + 1 }
    }

    default:
      return state
  }
}

const initialState: State = {
  lists: [],
  activeListId: null,
  history: [],
  historyIndex: -1,
}

function readLocalLists(): TierList[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as TierList[]
  } catch {
    return []
  }
}

function mergeListsById(primary: TierList[], secondary: TierList[]): TierList[] {
  const listsById = new Map<string, TierList>()
  primary.forEach((list) => listsById.set(list.id, list))
  secondary.forEach((list) => listsById.set(list.id, list))
  return Array.from(listsById.values()).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function useTierList() {
  const { user, loading: authLoading } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  const hasLoadedRef = useRef(false)
  const lastSyncedByIdRef = useRef<Record<string, string>>({})
  const pendingSaveIdsRef = useRef<Set<string>>(new Set())

  const loadGuestLists = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const activeId = localStorage.getItem(ACTIVE_LIST_KEY)
      if (stored) {
        const lists = JSON.parse(stored)
        dispatch({ type: 'LOAD', lists, activeListId: activeId || lists[0]?.id || null })
      } else {
        dispatch({ type: 'CREATE_LIST', title: 'My Tier List' })
      }
    } catch {
      dispatch({ type: 'CREATE_LIST', title: 'My Tier List' })
    }
    hasLoadedRef.current = true
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (user) {
      let cancelled = false

      async function loadCloudLists() {
        try {
          const cloudLists = await getUserLists(user!.uid)
          const importedUserId = localStorage.getItem(IMPORTED_USER_KEY)
          const shouldImportLocal = importedUserId !== user!.uid
          const localLists = shouldImportLocal ? readLocalLists() : []
          const importedLocalLists = localLists.map((list) => ({
            ...list,
            id: list.ownerId ? list.id : generateId(),
            ownerId: user!.uid,
            isPublic: false,
            updatedAt: Date.now(),
          }))

          if (cancelled) return

          const mergedLists = mergeListsById(cloudLists, importedLocalLists)

          if (shouldImportLocal) {
            localStorage.setItem(IMPORTED_USER_KEY, user!.uid)
            importedLocalLists.forEach((list) => {
              void saveList(list)
            })
          }

          if (mergedLists.length === 0) {
            const newList = createNewList('My Tier List')
            newList.ownerId = user!.uid
            newList.isPublic = false
            dispatch({ type: 'LOAD', lists: [newList], activeListId: newList.id })
            void saveList(newList)
            hasLoadedRef.current = true
            return
          }

          const activeId = localStorage.getItem(ACTIVE_LIST_KEY)
          const activeListId = mergedLists.some((list) => list.id === activeId)
            ? activeId
            : mergedLists[0]?.id || null
          lastSyncedByIdRef.current = Object.fromEntries(
            mergedLists.map((list) => [list.id, JSON.stringify(list)])
          )
          dispatch({ type: 'LOAD', lists: mergedLists, activeListId })
          hasLoadedRef.current = true
        } catch (error) {
          console.error('Failed to load cloud lists:', error)
          loadGuestLists()
        }
      }

      void loadCloudLists()

      return () => {
        cancelled = true
      }
    }

    loadGuestLists()
  }, [authLoading, user, loadGuestLists])

  useEffect(() => {
    if (!hasLoadedRef.current || state.lists.length === 0) return

    if (!user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lists))
      if (state.activeListId) {
        localStorage.setItem(ACTIVE_LIST_KEY, state.activeListId)
      }
      return
    }

    if (state.activeListId) {
      localStorage.setItem(ACTIVE_LIST_KEY, state.activeListId)
    }

    const dirtyLists = state.lists.filter((list) => {
      const listWithOwner = {
        ...list,
        ownerId: user.uid,
        isPublic: list.isPublic ?? false,
      }
      return JSON.stringify(listWithOwner) !== lastSyncedByIdRef.current[list.id]
    })

    if (dirtyLists.length === 0) return

    dirtyLists.forEach((list) => pendingSaveIdsRef.current.add(list.id))

    void Promise.all(
      dirtyLists.map(async (list) => {
        const listWithOwner = {
          ...list,
          ownerId: user.uid,
          isPublic: list.isPublic ?? false,
        }
        await saveList(listWithOwner)
        return listWithOwner
      })
    )
      .then((savedLists) => {
        savedLists.forEach((list) => {
          lastSyncedByIdRef.current[list.id] = JSON.stringify(list)
          pendingSaveIdsRef.current.delete(list.id)
        })
      })
      .catch((error) => {
        console.error('Failed to save tier lists:', error)
      })
  }, [state.lists, state.activeListId, user])

  const activeList = state.lists.find(l => l.id === state.activeListId) || null
  const canUndo = state.historyIndex >= 0
  const canRedo = state.historyIndex < state.history.length - 1

  const createList = useCallback((title: string) => {
    dispatch({ type: 'CREATE_LIST', title, ownerId: user?.uid })
  }, [user])

  const deleteList = useCallback((listId: string) => {
    if (user) {
      void deleteCloudList(listId)
    }
    dispatch({ type: 'DELETE_LIST', listId })
  }, [user])

  const setActiveList = useCallback((listId: string) => {
    dispatch({ type: 'SET_ACTIVE', listId })
  }, [])

  const updateListTitle = useCallback((listId: string, title: string) => {
    dispatch({ type: 'UPDATE_LIST_TITLE', listId, title })
  }, [])

  const togglePublic = useCallback((listId: string) => {
    dispatch({ type: 'TOGGLE_PUBLIC', listId })
  }, [])

  const replaceList = useCallback((list: TierList) => {
    dispatch({ type: 'REPLACE_LIST', list })
  }, [])

  const addItem = useCallback((listId: string, label: string, imageUrl?: string) => {
    const list = state.lists.find((l) => l.id === listId)
    const nextOrder = list?.items.filter((item) => item.tierId === null).length ?? 0
    const item: TierItem = {
      id: generateId(),
      label,
      imageUrl,
      tierId: null,
      order: nextOrder,
    }
    dispatch({ type: 'ADD_ITEM', listId, item })
  }, [state.lists])

  const updateItem = useCallback((listId: string, item: TierItem, previous: TierItem) => {
    dispatch({ type: 'UPDATE_ITEM', listId, item, previous })
  }, [])

  const removeItem = useCallback((listId: string, item: TierItem) => {
    dispatch({ type: 'REMOVE_ITEM', listId, item })
  }, [])

  const moveItem = useCallback((listId: string, itemId: string, toTierId: string | null, order: number) => {
    const list = state.lists.find((l) => l.id === listId)
    const item = list?.items.find((i) => i.id === itemId)
    if (!item) return
    if (item.tierId === toTierId && item.order === order) return
    dispatch({
      type: 'MOVE_ITEM',
      listId,
      itemId,
      fromTierId: item.tierId,
      fromOrder: item.order,
      toTierId,
      order,
    })
  }, [state.lists])

  const reorderTier = useCallback((listId: string, tierId: string, toOrder: number) => {
    const list = state.lists.find((l) => l.id === listId)
    const tier = list?.tiers.find((t) => t.id === tierId)
    if (!tier || tier.order === toOrder) return
    dispatch({ type: 'REORDER_TIER', listId, tierId, fromOrder: tier.order, toOrder })
  }, [state.lists])

  const updateTier = useCallback((listId: string, tier: Tier, previous: Tier) => {
    dispatch({ type: 'UPDATE_TIER', listId, tier, previous })
  }, [])

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' })
  }, [])

  return {
    lists: state.lists,
    activeList,
    canUndo,
    canRedo,
    createList,
    deleteList,
    setActiveList,
    updateListTitle,
    togglePublic,
    replaceList,
    addItem,
    updateItem,
    removeItem,
    moveItem,
    reorderTier,
    updateTier,
    undo,
    redo,
  }
}
