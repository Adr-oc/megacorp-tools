'use client'

import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'
import { runWorkspaceExport } from './export-menu'

/**
 * Botón visible al lado de "Exportar" cuando hay al menos 1 página seleccionada.
 * Descarga sólo las páginas seleccionadas usando la calidad activa del workspace.
 */
export function DownloadSelectionButton() {
  const state = useWorkspace()
  const dispatch = useDispatch()
  if (state.selection.size === 0) return null

  return (
    <Button
      variant="default"
      className="gap-2"
      disabled={state.exporting}
      onClick={() => void runWorkspaceExport(state, dispatch, 'selection')}
      title={`Descargar las ${state.selection.size} páginas seleccionadas`}
    >
      {state.exporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Descargar selección ({state.selection.size})
    </Button>
  )
}
