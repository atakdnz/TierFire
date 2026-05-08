'use client'

import { useReducer, useEffect, useCallback } from 'react'
import { TierList, TierItem, Tier, HistoryAction } from '@/types'
import { createNewList, generateId } from '@/lib/utils'

const STORAGE_KEY = 'tierfire_lists'
const ACTIVE_LIST_KEY = 'tierfire_active_list'
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
  | { type: 'CREATE_LIST'; title: string }
  | { type: 'DELETE_LIST'; listId: string }
  | { type: 'UPDATE_LIST_TITLE'; listId: string; title: string }
  | { type: 'ADD_ITEM'; listId: string; item: TierItem }
  | { type: 'UPDATE_ITEM'; listId: string; item: TierItem; previous: TierItem }
  | { type: 'REMOVE_ITEM'; listId: string; item: TierItem }
  | { type: 'MOVE_ITEM'; listId: string; itemId: string; toTierId: string | null; order: number }
  | { type: 'REORDER_TIER'; listId: string; tierId: string; toOrder: number }
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
      const items = list.items.map(item =>
        item.id === action.itemId
          ? { ...item, tierId: action.toTierId ?? null, order: action.order ?? 0 }
          : item
      )
      return { ...list, items, updatedAt: Date.now() }
    }
    case 'UPDATE_ITEM':
      return {
        ...list,
        items: list.items.map(i => (i.id === action.item!.id ? action.item! : i)),
        updatedAt: Date.now(),
      }
    case 'REORDER_TIER': {
      const tiers = list.tiers.map(tier =>
        tier.id === action.tierId
          ? { ...tier, order: action.toOrder ?? tier.order }
          : tier
      )
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
      return { ...state, lists: action.lists, activeListId: action.activeListId }

    case 'SET_ACTIVE':
      return { ...state, activeListId: action.listId }

    case 'CREATE_LIST': {
      const newList = createNewList(action.title)
      return {
        ...state,
        lists: [...state.lists, newList],
        activeListId: newList.id,
        history: [],
        historyIndex: 0,
      }
    }

    case 'DELETE_LIST': {
      const lists = state.lists.filter(l => l.id !== action.listId)
      const activeListId = state.activeListId === action.listId
        ? lists[0]?.id || null
        : state.activeListId
      return { ...state, lists, activeListId }
    }

    case 'UPDATE_LIST_TITLE': {
      const lists = state.lists.map(l =>
        l.id === action.listId ? { ...l, title: action.title, updatedAt: Date.now() } : l
      )
      return { ...state, lists }
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

export function useTierList() {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load from localStorage on mount
  useEffect(() => {
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
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (state.lists.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lists))
      if (state.activeListId) {
        localStorage.setItem(ACTIVE_LIST_KEY, state.activeListId)
      }
    }
  }, [state.lists, state.activeListId])

  const activeList = state.lists.find(l => l.id === state.activeListId) || null
  const canUndo = state.historyIndex >= 0
  const canRedo = state.historyIndex < state.history.length - 1

  const createList = useCallback((title: string) => {
    dispatch({ type: 'CREATE_LIST', title })
  }, [])

  const deleteList = useCallback((listId: string) => {
    dispatch({ type: 'DELETE_LIST', listId })
  }, [])

  const setActiveList = useCallback((listId: string) => {
    dispatch({ type: 'SET_ACTIVE', listId })
    dispatch({ type: 'SET_ACTIVE', listId })
  }, [])

  const updateListTitle = useCallback((listId: string, title: string) => {
    dispatch({ type: 'UPDATE_LIST_TITLE', listId, title })
  }, [])

  const addItem = useCallback((listId: string, label: string, imageUrl?: string) => {
    const item: TierItem = {
      id: generateId(),
      label,
      imageUrl,
      tierId: null,
      order: 0,
    }
    dispatch({ type: 'ADD_ITEM', listId, item })
  }, [])

  const updateItem = useCallback((listId: string, item: TierItem, previous: TierItem) => {
    dispatch({ type: 'UPDATE_ITEM', listId, item, previous })
  }, [])

  const removeItem = useCallback((listId: string, item: TierItem) => {
    dispatch({ type: 'REMOVE_ITEM', listId, item })
  }, [])

  const moveItem = useCallback((listId: string, itemId: string, toTierId: string | null, order: number) => {
    dispatch({ type: 'MOVE_ITEM', listId, itemId, toTierId, order })
  }, [])

  const reorderTier = useCallback((listId: string, tierId: string, toOrder: number) => {
    dispatch({ type: 'REORDER_TIER', listId, tierId, toOrder })
  }, [])

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