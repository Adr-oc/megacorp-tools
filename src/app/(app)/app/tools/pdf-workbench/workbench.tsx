'use client'

import { useRef } from 'react'
import { WorkspaceProvider, useLoadPdf, useStateBridge, useWorkspace } from '@/lib/pdf/document-store'
import { EmptyState } from '@/components/pdf-workbench/empty-state'

function WorkbenchInner() {
  useStateBridge()
  const { pages } = useWorkspace()
  const loadPdf = useLoadPdf()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onFilesPicked(files: FileList | null) {
    if (!files) return
    for (const f of Array.from(files)) await loadPdf(f)
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => onFilesPicked(e.target.files)}
      />
      {pages.length === 0 ? (
        <EmptyState onChoose={() => fileInputRef.current?.click()} />
      ) : (
        <div className="text-sm text-muted-foreground">
          {pages.length} página{pages.length === 1 ? '' : 's'} cargada{pages.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}

export function Workbench() {
  return (
    <WorkspaceProvider>
      <WorkbenchInner />
    </WorkspaceProvider>
  )
}
