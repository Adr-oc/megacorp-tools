'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ulid } from 'ulid'
import { toast } from 'sonner'
import type { Action } from './operations'
import { reducer } from './operations'
import { createInitialState, type WorkspaceState } from './types'
import { buildBadge } from './badges'
import { renderThumbnail } from './thumbnail-renderer'

type Dispatch = (a: Action) => void

const StateCtx = createContext<WorkspaceState | null>(null)
const DispatchCtx = createContext<Dispatch | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  // beforeunload guard
  useEffect(() => {
    if (state.pages.length === 0) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state.pages.length])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        {children}
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useWorkspace(): WorkspaceState {
  const v = useContext(StateCtx)
  if (!v) throw new Error('useWorkspace fuera de WorkspaceProvider')
  return v
}

export function useDispatch(): Dispatch {
  const v = useContext(DispatchCtx)
  if (!v) throw new Error('useDispatch fuera de WorkspaceProvider')
  return v
}

/**
 * Hook con la acción async loadPdf — porque carga + parseo + thumbnails son side effects.
 * Devuelve una función que toma un File y dispatcha pdf/load + render thumbnails en background.
 */
export function useLoadPdf() {
  const state = useWorkspace()
  const dispatch = useDispatch()
  return useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Solo se aceptan archivos .pdf')
        return
      }
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let pageCount: number
      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: false })
        pageCount = doc.getPageCount()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('encrypted')) {
          toast.error('El PDF está protegido con contraseña; quitá la protección antes de cargarlo')
        } else {
          toast.error(`No se pudo leer ${file.name}`)
        }
        return
      }
      const pdfId = ulid()
      const badge = buildBadge(file.name, Object.keys(state.pdfs).length)
      dispatch({ type: 'pdf/load', pdfId, name: file.name, bytes, pageCount, badge })

      // Render thumbnails en background (no esperamos)
      ;(async () => {
        // Las pages recién agregadas son las últimas `pageCount` del state futuro;
        // como dispatch ya corrió, leemos del próximo render via callback ref.
        // Para evitar carrera, lanzamos render por cada (pdfId, sourceIndex) y dispatchamos thumbnail/set
        // usando el pageId que ya conocemos del state actualizado en el siguiente tick.
        await new Promise((r) => setTimeout(r, 0))
        // Lectura via state cerrado: tomamos las pages del pdfId
        // TODO(sprint 1.5): reemplazar bridge global con cierre adecuado
        const pagesOfThisPdf = (window as unknown as { __mtState?: () => WorkspaceState }).__mtState?.()
          ?.pages.filter((p) => p.kind === 'source' && p.sourceId === pdfId) ?? []
        for (const p of pagesOfThisPdf) {
          if (p.kind !== 'source') continue
          renderThumbnail({ pageId: p.id, bytes, sourceIndex: p.sourceIndex, rotation: p.rotation })
            .then((r) => dispatch({ type: 'thumbnail/set', id: r.pageId, dataUrl: r.dataUrl }))
            .catch(() => {
              // tile mostrará placeholder; no rompe el flow
            })
        }
      })()
    },
    [state.pdfs, dispatch],
  )
}

/**
 * Bridge para que el hook async useLoadPdf pueda leer el state actual.
 * En lugar de pasar pages por argumento (lo cual obliga al caller a coordinarlo),
 * exponemos un lookup en window. Es un trade-off consciente para el MVP.
 * TODO(sprint 1.5): reemplazar bridge global con cierre adecuado
 */
export function useStateBridge() {
  const state = useWorkspace()
  useEffect(() => {
    ;(window as unknown as { __mtState?: () => WorkspaceState }).__mtState = () => state
    return () => {
      delete (window as unknown as { __mtState?: () => WorkspaceState }).__mtState
    }
  }, [state])
}

export function useTotalSize(): number {
  const { pdfs } = useWorkspace()
  return useMemo(() => Object.values(pdfs).reduce((acc, p) => acc + p.bytes.length, 0), [pdfs])
}
