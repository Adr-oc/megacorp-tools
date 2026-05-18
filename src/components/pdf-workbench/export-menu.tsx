'use client'

import { Check, Download, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'
import {
  buildFilename,
  downloadBytes,
  exportPages,
  findOrphanPdfIds,
  type ExportQuality,
} from '@/lib/pdf/exporter'
import { toast } from 'sonner'

const QUALITY_OPTIONS: Array<{
  value: ExportQuality
  label: string
  hint: string
}> = [
  { value: 'high', label: 'Alta (original)', hint: 'Mantiene texto seleccionable y peso original' },
  { value: 'medium', label: 'Media', hint: '~30-50% del peso · texto pasa a imagen' },
  { value: 'low', label: 'Baja', hint: '~10-20% del peso · ideal para email' },
]

function qualitySuffix(q: ExportQuality): string {
  if (q === 'medium') return '-media'
  if (q === 'low') return '-baja'
  return ''
}

function applyQualitySuffix(filename: string, q: ExportQuality): string {
  const suffix = qualitySuffix(q)
  if (!suffix) return filename
  return filename.replace(/\.pdf$/i, `${suffix}.pdf`)
}

/**
 * Ejecuta el export con la calidad del state. Se exporta para que también
 * lo use el botón "Descargar selección" externo (sin volver a abrir el menú).
 */
export async function runWorkspaceExport(
  state: import('@/lib/pdf/types').WorkspaceState,
  dispatch: (a: import('@/lib/pdf/operations').Action) => void,
  mode: 'all' | 'selection',
): Promise<void> {
  const ids =
    mode === 'all'
      ? state.pages.map((p) => p.id)
      : state.pages.filter((p) => state.selection.has(p.id)).map((p) => p.id)
  if (ids.length === 0) return
  dispatch({ type: 'export/start' })
  try {
    const bytes = await exportPages(state, ids, state.exportQuality)
    const baseName = buildFilename(state, ids, mode)
    downloadBytes(bytes, applyQualitySuffix(baseName, state.exportQuality))
    toast.success('Descarga iniciada')
    const orphans = findOrphanPdfIds(state)
    for (const id of orphans) dispatch({ type: 'pdf/remove', pdfId: id })
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Error al exportar')
  } finally {
    dispatch({ type: 'export/end' })
  }
}

export function ExportMenu() {
  const state = useWorkspace()
  const dispatch = useDispatch()
  const quality = state.exportQuality
  const hasPages = state.pages.length > 0
  const hasSelection = state.selection.size > 0

  function setQuality(q: ExportQuality) {
    dispatch({ type: 'export/setQuality', quality: q })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button disabled={!hasPages || state.exporting} className="gap-2">
            {state.exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Calidad
        </div>
        {QUALITY_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={(e) => {
              // Mantener el menú abierto al cambiar calidad
              e.preventDefault()
              setQuality(opt.value)
            }}
            className="flex items-start gap-2 py-2"
          >
            <Check
              className={`h-4 w-4 mt-0.5 shrink-0 ${quality === opt.value ? 'opacity-100' : 'opacity-0'}`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.hint}</div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void runWorkspaceExport(state, dispatch, 'all')}
          disabled={!hasPages}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Descargar documento completo
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void runWorkspaceExport(state, dispatch, 'selection')}
          disabled={!hasSelection}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Descargar selección ({state.selection.size})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
