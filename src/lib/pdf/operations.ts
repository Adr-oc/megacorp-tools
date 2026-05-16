import { ulid } from 'ulid'
import type { PageId, WorkspaceState, WorkspacePage } from './types'

export type Action =
  | {
      type: 'pdf/load'
      pdfId: string
      name: string
      bytes: Uint8Array
      pageCount: number
      badge: { label: string; color: string }
      pageIds: string[]
    }
  | { type: 'pdf/remove'; pdfId: string }
  | { type: 'pages/delete'; ids: PageId[] }
  | { type: 'pages/move'; ids: PageId[]; toIndex: number }
  | { type: 'pages/rotate'; ids: PageId[]; delta: 90 | -90 | 180 }
  | { type: 'pages/duplicate'; ids: PageId[] }
  | { type: 'pages/insertBlank'; index: number; preset: 'a4' | 'letter' }
  | { type: 'selection/toggle'; id: PageId; mode: 'single' | 'add' | 'range' }
  | { type: 'selection/all' }
  | { type: 'selection/clear' }
  | { type: 'thumbnail/set'; id: PageId; dataUrl: string }
  | { type: 'export/start' }
  | { type: 'export/end' }

function pageSize(preset: 'a4' | 'letter'): { width: number; height: number } {
  // switch agota la unión — el compilador sabe que el retorno es siempre definido,
  // a diferencia de indexar un Record bajo noUncheckedIndexedAccess.
  switch (preset) {
    case 'a4':
      return { width: 595, height: 842 }
    case 'letter':
      return { width: 612, height: 792 }
  }
}

function normalizeRotation(
  current: 0 | 90 | 180 | 270,
  delta: 90 | -90 | 180,
): 0 | 90 | 180 | 270 {
  const next = (current + delta + 360) % 360
  return next as 0 | 90 | 180 | 270
}

export function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'pdf/load': {
      const newPages: WorkspacePage[] = []
      for (let i = 0; i < action.pageCount; i++) {
        newPages.push({
          id: action.pageIds[i] ?? ulid(),
          kind: 'source',
          sourceId: action.pdfId,
          sourceIndex: i,
          rotation: 0,
        })
      }
      return {
        ...state,
        pdfs: {
          ...state.pdfs,
          [action.pdfId]: {
            id: action.pdfId,
            name: action.name,
            bytes: action.bytes,
            pageCount: action.pageCount,
            badge: action.badge,
            loadedAt: Date.now(),
          },
        },
        pages: [...state.pages, ...newPages],
      }
    }

    case 'pdf/remove': {
      const remainingPages = state.pages.filter(
        (p) => p.kind !== 'source' || p.sourceId !== action.pdfId,
      )
      const nextPdfs = { ...state.pdfs }
      delete nextPdfs[action.pdfId]
      const nextSelection = new Set(state.selection)
      for (const p of state.pages) {
        if (p.kind === 'source' && p.sourceId === action.pdfId) nextSelection.delete(p.id)
      }
      return { ...state, pdfs: nextPdfs, pages: remainingPages, selection: nextSelection }
    }

    case 'pages/delete': {
      const idsSet = new Set(action.ids)
      const remaining = state.pages.filter((p) => !idsSet.has(p.id))
      const nextSelection = new Set(state.selection)
      for (const id of action.ids) nextSelection.delete(id)
      return { ...state, pages: remaining, selection: nextSelection }
    }

    case 'pages/move': {
      const idsSet = new Set(action.ids)
      const moving = state.pages.filter((p) => idsSet.has(p.id))
      const remaining = state.pages.filter((p) => !idsSet.has(p.id))
      // toIndex es relativo al array original — ajustamos contando cuántos seleccionados quedan antes
      const targetBeforeRemoval = action.toIndex
      let adjustedIndex = targetBeforeRemoval
      for (const p of state.pages.slice(0, targetBeforeRemoval)) {
        if (idsSet.has(p.id)) adjustedIndex--
      }
      const next = [...remaining]
      next.splice(adjustedIndex, 0, ...moving)
      return { ...state, pages: next }
    }

    case 'pages/rotate': {
      const idsSet = new Set(action.ids)
      const next = state.pages.map<WorkspacePage>((p) => {
        if (!idsSet.has(p.id) || p.kind !== 'source') return p
        return { ...p, rotation: normalizeRotation(p.rotation, action.delta) }
      })
      return { ...state, pages: next }
    }

    case 'pages/duplicate': {
      const idsSet = new Set(action.ids)
      const result: WorkspacePage[] = []
      for (const p of state.pages) {
        result.push(p)
        if (idsSet.has(p.id)) {
          result.push({ ...p, id: ulid() })
        }
      }
      return { ...state, pages: result }
    }

    case 'pages/insertBlank': {
      const size = pageSize(action.preset)
      const blank: WorkspacePage = {
        id: ulid(),
        kind: 'blank',
        width: size.width,
        height: size.height,
      }
      const next = [...state.pages]
      next.splice(action.index, 0, blank)
      return { ...state, pages: next }
    }

    case 'selection/toggle': {
      const { id, mode } = action
      if (mode === 'single') {
        return { ...state, selection: new Set([id]), lastSelectedId: id }
      }
      if (mode === 'add') {
        const next = new Set(state.selection)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return { ...state, selection: next, lastSelectedId: id }
      }
      // range
      if (!state.lastSelectedId) {
        return { ...state, selection: new Set([id]), lastSelectedId: id }
      }
      const start = state.pages.findIndex((p) => p.id === state.lastSelectedId)
      const end = state.pages.findIndex((p) => p.id === id)
      if (start < 0 || end < 0) return state
      const [lo, hi] = start < end ? [start, end] : [end, start]
      const range = state.pages.slice(lo, hi + 1).map((p) => p.id)
      return { ...state, selection: new Set(range), lastSelectedId: id }
    }

    case 'selection/all':
      return { ...state, selection: new Set(state.pages.map((p) => p.id)) }

    case 'selection/clear':
      return { ...state, selection: new Set(), lastSelectedId: null }

    case 'thumbnail/set':
      return { ...state, thumbnails: { ...state.thumbnails, [action.id]: action.dataUrl } }

    case 'export/start':
      return { ...state, exporting: true }

    case 'export/end':
      return { ...state, exporting: false }

    default:
      return state
  }
}
