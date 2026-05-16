'use client'

import { useEffect } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'
import { PageTile } from './page-tile'

export function PageGrid() {
  const { pages, selection } = useWorkspace()
  const dispatch = useDispatch()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fromIndex = pages.findIndex((p) => p.id === active.id)
    const toIndex = pages.findIndex((p) => p.id === over.id)
    if (fromIndex < 0 || toIndex < 0) return

    // Si la página arrastrada está en la selección, mover toda la selección
    const ids = selection.has(active.id as string)
      ? pages.filter((p) => selection.has(p.id)).map((p) => p.id)
      : [active.id as string]

    dispatch({ type: 'pages/move', ids, toIndex })
  }

  // Atajos de teclado globales del workbench
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      // Ignorar si el foco está en un input/textarea
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      const meta = e.metaKey || e.ctrlKey
      const selIds = Array.from(selection)

      if (meta && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        dispatch({ type: 'selection/all' })
        return
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'selection/clear' })
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selIds.length > 0) {
        e.preventDefault()
        dispatch({ type: 'pages/delete', ids: selIds })
        return
      }
      if (meta && (e.key === 'd' || e.key === 'D') && selIds.length > 0) {
        e.preventDefault()
        dispatch({ type: 'pages/duplicate', ids: selIds })
        return
      }
      if ((e.key === 'r' || e.key === 'R') && !meta && selIds.length > 0) {
        e.preventDefault()
        dispatch({ type: 'pages/rotate', ids: selIds, delta: 90 })
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, dispatch])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
        >
          {pages.map((p) => (
            <PageTile key={p.id} page={p} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
