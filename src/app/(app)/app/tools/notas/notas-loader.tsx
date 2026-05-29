'use client'

import dynamic from 'next/dynamic'

const Notas = dynamic(() => import('@/components/notas/notas').then((m) => ({ default: m.Notas })), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">NOTAS</h1>
        <p className="text-sm text-muted-foreground">Cargando workspace de notas…</p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        Preparando mini wiki…
      </div>
    </div>
  ),
})

export function NotasLoader() {
  return <Notas />
}
