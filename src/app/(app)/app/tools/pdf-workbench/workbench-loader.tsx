'use client'

import dynamic from 'next/dynamic'

const Workbench = dynamic(() => import('./workbench').then((m) => ({ default: m.Workbench })), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">PDF Workbench</h1>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        Cargando workbench…
      </div>
    </div>
  ),
})

export function WorkbenchLoader() {
  return <Workbench />
}
