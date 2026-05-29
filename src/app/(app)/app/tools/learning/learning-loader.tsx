'use client'

import dynamic from 'next/dynamic'

import type { LearningHubData } from '@/lib/learning/actions'

const Learning = dynamic(
  () => import('@/components/learning/learning').then((module) => ({ default: module.Learning })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-primary">MegaTools Learning</p>
          <h1 className="text-3xl font-bold tracking-tight">Centro de aprendizaje</h1>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Cargando biblioteca…
        </div>
      </div>
    ),
  }
)

export function LearningLoader({ initialData }: { initialData: LearningHubData }) {
  return <Learning initialData={initialData} />
}
