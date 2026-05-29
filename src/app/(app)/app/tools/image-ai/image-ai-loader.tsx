'use client'

import dynamic from 'next/dynamic'

const ImageAi = dynamic(
  () => import('@/components/image-ai/image-ai').then((m) => ({ default: m.ImageAi })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Extractor IA de documentos</h1>
          <p className="text-sm text-muted-foreground">Cargando extractor…</p>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Preparando carga segura de documentos…
        </div>
      </div>
    ),
  },
)

export function ImageAiLoader() {
  return <ImageAi />
}
