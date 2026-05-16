'use client'

import { useRef } from 'react'
import { WorkspaceProvider, useLoadPdf, useStateBridge, useWorkspace } from '@/lib/pdf/document-store'
import { EmptyState } from '@/components/pdf-workbench/empty-state'
import { UploadZone } from '@/components/pdf-workbench/upload-zone'

function WorkbenchInner() {
  useStateBridge()
  const { pages } = useWorkspace()
  const loadPdf = useLoadPdf()
  const triggerPickerRef = useRef<() => void>(() => {})

  async function onFiles(files: File[]) {
    for (const f of files) await loadPdf(f)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PDF Workbench</h1>
        {pages.length > 0 && (
          <UploadZone onFiles={onFiles} registerTrigger={(fn) => { triggerPickerRef.current = fn }} />
        )}
      </div>
      {pages.length === 0 ? (
        <>
          <UploadZone onFiles={onFiles} showButton={false} registerTrigger={(fn) => { triggerPickerRef.current = fn }} />
          <EmptyState onChoose={() => triggerPickerRef.current()} />
        </>
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
