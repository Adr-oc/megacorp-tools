'use client'

import dynamic from 'next/dynamic'

const QrGenerator = dynamic(
  () => import('@/components/qr-generator/qr-generator').then((m) => ({ default: m.QrGenerator })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Generador de QR</h1>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Cargando generador…
        </div>
      </div>
    ),
  },
)

export function QrGeneratorLoader() {
  return <QrGenerator />
}
