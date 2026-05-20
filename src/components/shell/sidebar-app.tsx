'use client'

import Link from 'next/link'
import { ArrowLeft, Download, FileText, Upload } from 'lucide-react'
import { SidebarSection } from './sidebar-section'

type Props = {
  appLabel: string
  docs?: number | null
  pages?: number | null
  onUpload?: () => void
  onExport?: () => void
}

export function SidebarApp({ appLabel, docs = null, pages = null, onUpload, onExport }: Props) {
  return (
    <div className="space-y-5">
      <Link
        href="/app"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a apps
      </Link>

      <SidebarSection label={appLabel}>
        <div className="px-2.5 py-1 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>
            {docs === null ? 'Workspace abierto' : `${docs} documento${docs === 1 ? '' : 's'}`}
            {pages !== null && <> · {pages} pág.</>}
          </span>
        </div>
      </SidebarSection>

      <SidebarSection label="Acciones">
        <button
          type="button"
          onClick={onUpload}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition w-full text-left"
        >
          <Upload className="h-4 w-4" />
          Añadir PDFs
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition w-full text-left"
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
      </SidebarSection>
    </div>
  )
}
