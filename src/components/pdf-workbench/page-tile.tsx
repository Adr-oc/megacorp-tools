'use client'

import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, RotateCw, Trash2 } from 'lucide-react'
import { useDispatch } from '@/lib/pdf/document-store'
import type { WorkspacePage } from '@/lib/pdf/types'
import { cn } from '@/lib/utils'

type Props = {
  page: WorkspacePage
  selected: boolean
  thumb: string | undefined
  badgeColor: string | null
  badgeLabel: string | null
  sourceLabel: string
  onDownloadOne: (id: string) => void
}

function PageTileBase({ page, selected, thumb, badgeColor, badgeLabel, sourceLabel, onDownloadOne }: Props) {
  const dispatch = useDispatch()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  function onClick(e: React.MouseEvent) {
    const mode = e.shiftKey ? 'range' : e.metaKey || e.ctrlKey ? 'add' : 'single'
    dispatch({ type: 'selection/toggle', id: page.id, mode })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'group relative aspect-[0.7] rounded-md border-2 bg-card overflow-hidden cursor-pointer',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-foreground/30',
      )}
      onClick={onClick}
      role="checkbox"
      aria-checked={selected}
      aria-label={sourceLabel}
      data-page-id={page.id}
    >
      {/* Drag handle: la zona central es donde se agarra para arrastrar */}
      <div {...listeners} className="absolute inset-0 z-0" />

      {/* Thumbnail / placeholder */}
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={sourceLabel}
          draggable={false}
          className="w-full h-full object-contain bg-muted pointer-events-none"
          style={{ transform: page.kind === 'source' ? `rotate(${page.rotation}deg)` : undefined }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
          {page.kind === 'blank' ? 'En blanco' : 'Cargando…'}
        </div>
      )}

      {/* Badge de PDF origen */}
      {badgeColor && badgeLabel && (
        <span
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow z-10"
          style={{ backgroundColor: badgeColor }}
        >
          {badgeLabel}
        </span>
      )}

      {/* Número de página origen */}
      {page.kind === 'source' && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] z-10">
          p.{page.sourceIndex + 1}
        </span>
      )}

      {/* Acciones rápidas (hover o seleccionado) */}
      <div
        className={cn(
          'absolute top-1 right-1 flex gap-0.5 z-10 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'pages/rotate', ids: [page.id], delta: 90 })
          }}
          className="rounded bg-background/90 hover:bg-background p-1 shadow"
          aria-label="Rotar 90°"
          title="Rotar 90°"
        >
          <RotateCw className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'pages/duplicate', ids: [page.id] })
          }}
          className="rounded bg-background/90 hover:bg-background p-1 shadow"
          aria-label="Duplicar"
          title="Duplicar"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDownloadOne(page.id)
          }}
          className="rounded bg-background/90 hover:bg-background p-1 shadow text-xs px-1.5"
          aria-label="Descargar esta página"
          title="Descargar esta página"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'pages/delete', ids: [page.id] })
          }}
          className="rounded bg-background/90 hover:bg-destructive hover:text-destructive-foreground p-1 shadow"
          aria-label="Eliminar"
          title="Eliminar"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export const PageTile = memo(PageTileBase)
