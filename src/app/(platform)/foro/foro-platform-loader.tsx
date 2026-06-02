'use client'

import dynamic from 'next/dynamic'
import type { IdeasBoardView } from '@/lib/ideas-board/schema'

const IdeasBoard = dynamic(
  () => import('@/components/ideas-board/ideas-board').then((m) => ({ default: m.IdeasBoard })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-dashed bg-background/70 p-12 text-center text-sm text-muted-foreground">
        Cargando foro…
      </div>
    ),
  }
)

export function ForoPlatformLoader({ initialBoard }: { initialBoard: IdeasBoardView }) {
  return <IdeasBoard initialBoard={initialBoard} />
}
