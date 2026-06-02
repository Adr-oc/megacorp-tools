import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LearningPlatformLoader } from './learning-platform-loader'
import { requireApp } from '@/lib/permissions/require-app'
import { getLearningHubData } from '@/lib/learning/actions'

export default async function LearningPlatformPage() {
  await requireApp('learning')
  const initialData = await getLearningHubData()

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,hsl(var(--brand-accent)/0.14),transparent_32%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.25))]">
      <div className="mx-auto max-w-[1800px] px-4 py-4 md:px-6">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border bg-background/80 px-4 py-3 backdrop-blur">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver al portal
          </Link>
          <div className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            Plataforma Learning · sesión MEGACORP
          </div>
        </div>
        <LearningPlatformLoader initialData={initialData} />
      </div>
    </main>
  )
}
