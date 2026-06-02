'use client'

import dynamic from 'next/dynamic'
import type { LearningHubData } from '@/lib/learning/actions'

const Learning = dynamic(
  () => import('@/components/learning/learning').then((module) => ({ default: module.Learning })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-dashed bg-background/70 p-12 text-center text-sm text-muted-foreground">
        Cargando academia…
      </div>
    ),
  }
)

export function LearningPlatformLoader({ initialData }: { initialData: LearningHubData }) {
  return <Learning initialData={initialData} />
}
