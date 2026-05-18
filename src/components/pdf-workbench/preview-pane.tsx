'use client'

import { useEffect, useState } from 'react'
import { Copy, Download, Minus, Plus, RotateCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'
import { buildFilename, downloadBytes, exportPages } from '@/lib/pdf/exporter'
import { toast } from 'sonner'

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const

function nextZoom(current: number, dir: 1 | -1): number {
  const idx = ZOOM_LEVELS.findIndex((z) => z >= current - 0.001)
  const target = idx + dir
  if (target < 0) return ZOOM_LEVELS[0]!
  if (target >= ZOOM_LEVELS.length) return ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!
  return ZOOM_LEVELS[target]!
}

export function PreviewPane() {
  const workspace = useWorkspace()
  const { pages, pdfs, thumbnails, selection } = workspace
  const dispatch = useDispatch()
  const [zoom, setZoom] = useState(1)

  // Resetear zoom cuando cambia la selección
  const selectionKey = Array.from(selection).join(',')
  useEffect(() => {
    setZoom(1)
  }, [selectionKey])

  if (selection.size === 0) return null

  // Multi-selección: resumen sin preview de página
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
  const pageInfo = isSource
    ? `Página ${page.sourceIndex + 1} del original`
    : `${page.width} × ${page.height} pt`
  const positionInfo = `Posición ${idx + 1} de ${pages.length}`

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

  return (
    <aside className="w-96 shrink-0 border-l pl-4 space-y-3 lg:w-[28rem] xl:w-[32rem]">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Preview</div>
        <div className="text-sm font-medium truncate" title={sourceLabel}>
          {sourceLabel}
        </div>
        <div className="text-xs text-muted-foreground">{pageInfo}</div>
        <div className="text-xs text-muted-foreground">{positionInfo}</div>
      </div>

      {/* Controles de zoom */}
      <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setZoom((z) => nextZoom(z, -1))}
          disabled={zoom <= ZOOM_LEVELS[0]!}
          aria-label="Alejar"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="text-xs font-medium tabular-nums hover:underline"
          title="Restablecer zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setZoom((z) => nextZoom(z, 1))}
          disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!}
          aria-label="Acercar"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border bg-muted/40 overflow-auto max-h-[70vh] flex items-center justify-center min-h-[400px]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={`Preview ${sourceLabel}`}
            className="block transition-transform"
            style={{
              transform: `scale(${zoom})${isSource ? ` rotate(${page.rotation}deg)` : ''}`,
              transformOrigin: 'center center',
              maxWidth: zoom <= 1 ? '100%' : 'none',
              maxHeight: zoom <= 1 ? '70vh' : 'none',
            }}
          />
        ) : (
          <div className="text-sm text-muted-foreground py-24">
            {page.kind === 'blank' ? 'En blanco' : 'Renderizando…'}
          </div>
        )}
      </div>

      {isSource && page.rotation !== 0 && (
        <div className="text-xs text-muted-foreground">Rotación: {page.rotation}°</div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => dispatch({ type: 'pages/rotate', ids: [page.id], delta: 90 })}
        >
          <RotateCw className="h-4 w-4" />
          Rotar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => dispatch({ type: 'pages/duplicate', ids: [page.id] })}
        >
          <Copy className="h-4 w-4" />
          Duplicar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void onDownloadOne()}
          disabled={workspace.exporting}
        >
          <Download className="h-4 w-4" />
          Descargar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => dispatch({ type: 'pages/delete', ids: [page.id] })}
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      </div>
    </aside>
  )
}
