'use client'

import { Copy, FilePlus, RotateCw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'

export function Toolbar() {
  const { pages, selection } = useWorkspace()
  const dispatch = useDispatch()
  if (selection.size === 0) return null

  const ids = Array.from(selection)

  // Posición para insertar en blanco: justo después de la última página seleccionada
  const lastSelectedIndex = pages
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => selection.has(p.id))
    .map(({ i }) => i)
    .reduce((max, i) => (i > max ? i : max), -1)

  return (
    <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-md border bg-card/95 backdrop-blur px-3 py-2 shadow-sm">
      <span className="text-sm font-medium">
        {selection.size} página{selection.size === 1 ? '' : 's'} seleccionada{selection.size === 1 ? '' : 's'}
      </span>
      <div className="h-4 w-px bg-border mx-1" />
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => dispatch({ type: 'pages/rotate', ids, delta: 90 })}>
        <RotateCw className="h-4 w-4" />
        Rotar
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => dispatch({ type: 'pages/duplicate', ids })}>
        <Copy className="h-4 w-4" />
        Duplicar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => dispatch({ type: 'pages/insertBlank', index: lastSelectedIndex + 1, preset: 'a4' })}
        title="Insertar página en blanco después de la selección"
      >
        <FilePlus className="h-4 w-4" />
        Insertar blanco
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => dispatch({ type: 'pages/delete', ids })}>
        <Trash2 className="h-4 w-4" />
        Eliminar
      </Button>
      <div className="ml-auto">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => dispatch({ type: 'selection/clear' })}>
          <X className="h-4 w-4" />
          Limpiar selección
        </Button>
      </div>
    </div>
  )
}
