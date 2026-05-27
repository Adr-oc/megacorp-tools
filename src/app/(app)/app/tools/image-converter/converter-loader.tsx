'use client'

import dynamic from 'next/dynamic'

const Converter = dynamic(
  () => import('@/components/image-converter/converter').then((m) => ({ default: m.Converter })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Conversor de imágenes</h1>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Cargando conversor…
        </div>
      </div>
    ),
  },
)

export function ConverterLoader() {
  return <Converter />
}
