'use client'

import dynamic from 'next/dynamic'
import type { IdeasBoardView } from '@/lib/ideas-board/schema'

const IdeasBoard = dynamic(
  () => import('@/components/ideas-board/ideas-board').then((m) => ({ default: m.IdeasBoard })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Foro de ideas</h1>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Cargando foro…
        </div>
      </div>
    ),
  }
)

export function IdeasBoardLoader({ initialBoard }: { initialBoard: IdeasBoardView }) {
  return <IdeasBoard initialBoard={initialBoard} />
}
