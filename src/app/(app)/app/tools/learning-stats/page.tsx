import { redirect } from 'next/navigation'
import { GraduationCap, ExternalLink, Trophy, Flame, Sparkles } from 'lucide-react'

import { getLearningStats, goToLearnhouseUrl } from '@/lib/learning/stats-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { requireApp } from '@/lib/permissions/require-app'

/**
 * Tool de supervision de Learning.
 *
 * En fase 1 muestra el leaderboard vacío + un minilink "Ir a Learn" que
 * abre LearnHouse en nueva pestaña. Cuando lleguen webhooks (fase 3),
 * el ranking se recalcula automáticamente desde la tabla learning_event.
 */
export default async function LearningStatsPage() {
  await requireApp('learning-stats')
  const stats = await getLearningStats().catch(() => null)
  if (!stats) redirect('/login')

  const learnhouseHref = await goToLearnhouseUrl().catch(() => '#')
  const isReady = stats.configured

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-[1rem] bg-gradient-to-br from-brand-accent/25 via-brand-accent/5 to-muted p-5 ring-1 ring-brand-accent/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">MEGACORP Academy</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Learning</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {isReady
                ? 'Aprende en LearnHouse, compite acá. Rutas, cursos y quizzes viven en la plataforma externa; nosotros mostramos quién la está rompiendo.'
                : 'Aprende en LearnHouse, compite acá. La integración está casi lista: falta configurar el subdominio DNS. Mientras tanto, esto es un placeholder honesto.'}
            </p>
          </div>
          <a href={learnhouseHref} target="_blank" rel="noreferrer">
            <Button size="lg" className="rounded-full">
              Ir a Learn <ExternalLink className="size-4" />
            </Button>
          </a>
        </div>
        {!isReady ? (
          <Badge variant="secondary" className="w-fit bg-background/80 text-muted-foreground">
            <Sparkles className="mr-1 size-3" /> Integración pendiente de DNS
          </Badge>
        ) : null}
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MyProgressCard label="Mi XP" value="0" hint="Empieza tu primera clase en Learn" icon={Sparkles} />
        <MyProgressCard label="Mi racha" value="0 días" hint="Una clase al día mantiene la racha viva" icon={Flame} />
        <MyProgressCard label="Mi ranking" value="—" hint="Aún sin eventos registrados" icon={Trophy} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Leaderboard title="Ranking semanal" entries={stats.weekly} />
        <Leaderboard title="Ranking mensual" entries={stats.monthly} />
      </section>

      <section className="rounded-[1rem] border border-dashed border-brand-accent/30 bg-brand-accent/5 p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">¿Cómo se llena esto?</p>
        <p className="mt-1 max-w-2xl">
          Cada vez que completes una clase o un curso en LearnHouse, MegaTools recibe un webhook firmado (RS256) y recalcula el ranking. No hace falta hacer nada acá: solo seguí aprendiendo allá y los puntos caen solos.
        </p>
      </section>
    </div>
  )
}

function MyProgressCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint: string
  icon: typeof GraduationCap
}) {
  return (
    <div className="rounded-[1rem] bg-card p-4 shadow-sm ring-1 ring-border/70">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
        <Icon className="size-4" /> {label}
      </div>
      <div className="text-3xl font-black tracking-tight">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function Leaderboard({ title, entries }: { title: string; entries: Array<{ userExternalId: string; displayName: string; xp: number; streakDays: number; coursesCompleted: number }> }) {
  return (
    <div className="rounded-[1rem] bg-card p-4 shadow-sm ring-1 ring-border/70">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <Badge variant="outline">{entries.length}</Badge>
      </div>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
          <Trophy className="size-8 text-brand-accent/60" />
          <p>El leaderboard se llena con la primera cohorte.</p>
          <p className="text-xs">Por ahora todos estamos empatados en cero.</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, index) => (
            <li key={entry.userExternalId} className="flex items-center gap-3 rounded-2xl bg-muted/30 p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-xs font-black ring-1 ring-border/70">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{entry.displayName}</div>
                <div className="text-xs text-muted-foreground">
                  {entry.coursesCompleted} cursos · {entry.streakDays} días de racha
                </div>
              </div>
              <div className="text-lg font-black text-brand-accent">{entry.xp} XP</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
