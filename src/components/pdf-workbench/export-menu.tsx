'use client'

import { Download, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'
import { buildFilename, downloadBytes, exportPages } from '@/lib/pdf/exporter'
import { toast } from 'sonner'

export function ExportMenu() {
  const state = useWorkspace()
  const dispatch = useDispatch()
  const hasPages = state.pages.length > 0
  const hasSelection = state.selection.size > 0

  async function runExport(mode: 'all' | 'selection') {
    const ids =
      mode === 'all'
        ? state.pages.map((p) => p.id)
        : state.pages.filter((p) => state.selection.has(p.id)).map((p) => p.id)
    if (ids.length === 0) return
    dispatch({ type: 'export/start' })
    try {
      const bytes = await exportPages(state, ids)
      downloadBytes(bytes, buildFilename(state, ids, mode))
      toast.success('Descarga iniciada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      dispatch({ type: 'export/end' })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button disabled={!hasPages || state.exporting} className="gap-2">
            {state.exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={() => runExport('all')} disabled={!hasPages}>
          <FileDown className="h-4 w-4 mr-2" />
          Descargar documento completo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runExport('selection')} disabled={!hasSelection}>
          <FileDown className="h-4 w-4 mr-2" />
          Descargar selección ({state.selection.size})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
