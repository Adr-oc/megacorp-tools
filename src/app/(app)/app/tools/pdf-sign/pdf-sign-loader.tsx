'use client'

import dynamic from 'next/dynamic'

const PdfSign = dynamic(
  () => import('@/components/pdf-sign/pdf-sign').then((m) => ({ default: m.PdfSign })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Firma de PDF</h1>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Cargando herramienta…
        </div>
      </div>
    ),
  },
)

export function PdfSignLoader() {
  return <PdfSign />
}
