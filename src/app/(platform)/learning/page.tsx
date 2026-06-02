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
      <div className="flex min-h-svh flex-col gap-2 p-2 md:p-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/80 px-4 py-3 backdrop-blur">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver al portal
          </Link>
          <div className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            Plataforma Learning · sesión MEGACORP
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <LearningPlatformLoader initialData={initialData} />
        </div>
      </div>
    </main>
  )
}
