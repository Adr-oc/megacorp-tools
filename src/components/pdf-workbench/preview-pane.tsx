'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, Download, Minus, Plus, RotateCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'
import { buildFilename, downloadBytes, exportPages } from '@/lib/pdf/exporter'
import { toast } from 'sonner'

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const
const MIN_ZOOM: number = ZOOM_LEVELS[0]
const MAX_ZOOM: number = ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!

function nextZoom(current: number, dir: 1 | -1): number {
  const idx = ZOOM_LEVELS.findIndex((z) => z >= current - 0.001)
  const target = idx + dir
  if (target < 0) return MIN_ZOOM
  if (target >= ZOOM_LEVELS.length) return MAX_ZOOM
  return ZOOM_LEVELS[target]!
}

export function PreviewPane() {
  const workspace = useWorkspace()
  const { pages, pdfs, thumbnails, selection } = workspace
  const dispatch = useDispatch()
  const [zoom, setZoom] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  // Resetear zoom cuando cambia la selección
  const selectionKey = Array.from(selection).join(',')
  useEffect(() => {
    setZoom(1)
  }, [selectionKey])

  // Scroll del mouse sobre el preview hace zoom (intercepta el scroll del scroll-container)
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) {
      // sin modificador: deja el scroll normal del container
      return
    }
    e.preventDefault()
    setZoom((z) => nextZoom(z, e.deltaY < 0 ? 1 : -1))
  }, [])

  // Drag-to-pan cuando hay zoom > 1
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el || zoom <= 1) return
    el.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
  }, [zoom])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    const start = dragRef.current
    if (!el || !start) return
    el.scrollLeft = start.left - (e.clientX - start.x)
    el.scrollTop = start.top - (e.clientY - start.y)
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  if (selection.size === 0) return null

  // Multi-selección: resumen + acciones bulk
  if (selection.size > 1) {
    const ids = Array.from(selection)
    return (
      <aside className="w-96 shrink-0 border-l pl-4 space-y-4 lg:w-[28rem]">
        <div>
          <div className="text-sm text-muted-foreground">Selección</div>
          <div className="text-2xl font-bold">{selection.size} páginas</div>
        </div>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => dispatch({ type: 'pages/rotate', ids, delta: 90 })}
          >
            <RotateCw className="h-4 w-4" />
            Rotar 90° todas
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => dispatch({ type: 'pages/duplicate', ids })}
          >
            <Copy className="h-4 w-4" />
            Duplicar todas
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={() => dispatch({ type: 'pages/delete', ids })}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar todas
          </Button>
        </div>
      </aside>
    )
  }

  // selection.size === 1
  const [onlyId] = Array.from(selection)
  if (!onlyId) return null
  const idx = pages.findIndex((p) => p.id === onlyId)
  const page = pages[idx]
  if (!page) return null

  const thumb = thumbnails[page.id]
  const isSource = page.kind === 'source'
  const sourcePdf = isSource ? pdfs[page.sourceId] : null
  const sourceLabel = isSource ? sourcePdf?.name ?? 'PDF' : 'Página en blanco'
  const compactMeta = isSource
    ? `pág. ${page.sourceIndex + 1} · pos. ${idx + 1}/${pages.length}${page.rotation !== 0 ? ` · ${page.rotation}°` : ''}`
    : `${page.width} × ${page.height} pt · pos. ${idx + 1}/${pages.length}`

  async function onDownloadOne() {
    if (!page) return
    dispatch({ type: 'export/start' })
    try {
      const bytes = await exportPages(workspace, [page.id])
      downloadBytes(bytes, buildFilename(workspace, [page.id], 'single'))
      toast.success('Descarga iniciada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo descargar')
    } finally {
      dispatch({ type: 'export/end' })
    }
  }

  const onDoubleClick = () => setZoom((z) => (z === 1 ? 2 : 1))
  const isZoomed = zoom > 1
  const cursorClass = isZoomed
    ? dragRef.current
      ? 'cursor-grabbing'
      : 'cursor-grab'
    : 'cursor-zoom-in'

  return (
    <aside className="w-96 shrink-0 border-l pl-4 space-y-3 lg:w-[28rem] xl:w-[32rem]">
      {/* Header compacto: PDF origen en 1 línea, metadata en otra */}
      <div className="space-y-0.5">
        <div className="text-sm font-medium truncate" title={sourceLabel}>
          {sourceLabel}
        </div>
        <div className="text-xs text-muted-foreground">{compactMeta}</div>
      </div>

      {/* Preview area — protagonista visual */}
      <div
        ref={scrollRef}
        className={`relative rounded-md border bg-muted/40 overflow-auto h-[60vh] flex items-center justify-center select-none ${cursorClass}`}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title={isZoomed ? 'Arrastrá para mover · doble clic para volver a 100%' : 'Doble clic o Ctrl+rueda para acercar'}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={`Preview ${sourceLabel}`}
            draggable={false}
            className="block transition-transform duration-150 pointer-events-none"
            style={{
              transform: `scale(${zoom})${isSource ? ` rotate(${page.rotation}deg)` : ''}`,
              transformOrigin: 'center center',
              maxWidth: zoom <= 1 ? '100%' : 'none',
              maxHeight: zoom <= 1 ? '60vh' : 'none',
            }}
          />
        ) : (
          <div className="text-sm text-muted-foreground">
            {page.kind === 'blank' ? 'En blanco' : 'Renderizando…'}
          </div>
        )}

        {/* Badge de zoom flotante (solo si != 100%, no ensucia cuando está en default) */}
        {zoom !== 1 && (
          <div className="absolute bottom-2 right-2 rounded bg-background/90 backdrop-blur px-2 py-1 text-xs font-medium tabular-nums shadow border pointer-events-none">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      {/* Controles de zoom debajo, no compitiendo con el header */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="text-[10px] uppercase tracking-wide">Zoom</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setZoom((z) => nextZoom(z, -1))}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Alejar"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-xs font-medium tabular-nums hover:underline min-w-12 text-center"
            title="Restablecer a 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setZoom((z) => nextZoom(z, 1))}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Acercar"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Acción principal — Descargar destacada */}
      <Button
        className="w-full gap-2"
        onClick={() => void onDownloadOne()}
        disabled={workspace.exporting}
      >
        <Download className="h-4 w-4" />
        Descargar esta página
      </Button>

      {/* Acciones secundarias en una sola fila */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => dispatch({ type: 'pages/rotate', ids: [page.id], delta: 90 })}
          title="Rotar 90°"
        >
          <RotateCw className="h-4 w-4" />
          Rotar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => dispatch({ type: 'pages/duplicate', ids: [page.id] })}
          title="Duplicar página"
        >
          <Copy className="h-4 w-4" />
          Duplicar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => dispatch({ type: 'pages/delete', ids: [page.id] })}
          title="Eliminar página"
        >
          <Trash2 className="h-4 w-4" />
          Quitar
        </Button>
      </div>
    </aside>
  )
}
