'use client'

import { useRef } from 'react'
import { WorkspaceProvider, useLoadPdf, useStateBridge, useWorkspace } from '@/lib/pdf/document-store'
import { DownloadSelectionButton } from '@/components/pdf-workbench/download-selection-button'
import { EmptyState } from '@/components/pdf-workbench/empty-state'
import { ExportMenu } from '@/components/pdf-workbench/export-menu'
import { PageGrid } from '@/components/pdf-workbench/page-grid'
import { PreviewPane } from '@/components/pdf-workbench/preview-pane'
import { Toolbar } from '@/components/pdf-workbench/toolbar'
import { UploadZone } from '@/components/pdf-workbench/upload-zone'

function WorkbenchInner() {
  useStateBridge()
  const { pages, pdfs, selection } = useWorkspace()
  const loadPdf = useLoadPdf()
  const triggerPickerRef = useRef<() => void>(() => {})

  async function onFiles(files: File[]) {
    for (const f of files) await loadPdf(f)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">PDF Workbench</h1>
        <div className="flex items-center gap-2">
          {pages.length > 0 && <UploadZone onFiles={onFiles} registerTrigger={(fn) => { triggerPickerRef.current = fn }} />}
          {pages.length > 0 && <DownloadSelectionButton />}
          {pages.length > 0 && <ExportMenu />}
        </div>
      </div>
      {pages.length === 0 ? (
        <>
          <UploadZone onFiles={onFiles} showButton={false} registerTrigger={(fn) => { triggerPickerRef.current = fn }} />
          <EmptyState onChoose={() => triggerPickerRef.current()} />
        </>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {Object.keys(pdfs).length} PDF{Object.keys(pdfs).length === 1 ? '' : 's'} · {pages.length} página{pages.length === 1 ? '' : 's'}
            {selection.size > 0 && ` · ${selection.size} seleccionada${selection.size === 1 ? '' : 's'}`}
          </div>
          <Toolbar />
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <PageGrid />
            </div>
            <PreviewPane />
          </div>
        </>
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
