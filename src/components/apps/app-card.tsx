import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AppDefinition } from '@/lib/apps/types'

const appMeta: Record<string, { eyebrow: string; accent: string; detail: string }> = {
  settings: {
    eyebrow: 'Sistema',
    accent: 'from-slate-500/20 to-zinc-500/5 text-slate-700 dark:text-slate-300',
    detail: 'Preferencias y organización',
  },
  'pdf-workbench': {
    eyebrow: 'Documentos',
    accent: 'from-red-500/20 to-orange-500/5 text-red-700 dark:text-red-300',
    detail: 'PDF local y seguro',
  },
  'image-converter': {
    eyebrow: 'Multimedia',
    accent: 'from-fuchsia-500/20 to-pink-500/5 text-fuchsia-700 dark:text-fuchsia-300',
    detail: 'Formatos y compresión',
  },
  'qr-generator': {
    eyebrow: 'Utilidad',
    accent: 'from-emerald-500/20 to-lime-500/5 text-emerald-700 dark:text-emerald-300',
    detail: 'QR listos para descargar',
  },
  'pdf-sign': {
    eyebrow: 'Documentos',
    accent: 'from-blue-500/20 to-cyan-500/5 text-blue-700 dark:text-blue-300',
    detail: 'Firmas rápidas',
  },
  'units-converter': {
    eyebrow: 'Cálculo',
    accent: 'from-amber-500/20 to-yellow-500/5 text-amber-700 dark:text-amber-300',
    detail: 'Incluye moneda Banguat',
  },
  'email-signature': {
    eyebrow: 'Marca',
    accent: 'from-indigo-500/20 to-violet-500/5 text-indigo-700 dark:text-indigo-300',
    detail: 'Firmas corporativas',
  },
  admin: {
    eyebrow: 'Super Admin',
    accent: 'from-rose-500/20 to-red-500/5 text-rose-700 dark:text-rose-300',
    detail: 'Usuarios y permisos',
  },
  announcements: {
    eyebrow: 'Comunicación',
    accent: 'from-orange-500/20 to-amber-500/5 text-orange-700 dark:text-orange-300',
    detail: 'Avisos internos visibles',
  },
  'ideas-board': {
    eyebrow: 'Comunidad',
    accent: 'from-sky-500/20 to-cyan-500/5 text-sky-700 dark:text-sky-300',
    detail: 'Foro, votos y seguimiento',
  },
  'image-ai': {
    eyebrow: 'IA',
    accent: 'from-purple-500/20 to-fuchsia-500/5 text-purple-700 dark:text-purple-300',
    detail: 'Extractor vision-ready',
  },
  notas: {
    eyebrow: 'Conocimiento',
    accent: 'from-teal-500/20 to-emerald-500/5 text-teal-700 dark:text-teal-300',
    detail: 'Wiki y notas internas',
  },
  learning: {
    eyebrow: 'Academia',
    accent: 'from-violet-500/20 to-indigo-500/5 text-violet-700 dark:text-violet-300',
    detail: 'Cursos y progreso',
  },
}

export function AppCard({ app }: { app: AppDefinition }) {
  const Icon = app.icon
  const isAvailable = app.status === 'available'
  const meta = appMeta[app.id] ?? {
    eyebrow: 'App',
    accent: 'from-brand-accent/20 to-brand-accent/5 text-brand-accent',
    detail: 'Herramienta interna',
  }

  const card = (
    <Card
      className={cn(
        'group relative h-full overflow-hidden transition duration-200',
        isAvailable
          ? 'cursor-pointer bg-card/85 hover:-translate-y-1 hover:shadow-lg hover:ring-brand-accent/30'
          : 'h-full opacity-60',
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-80', meta.accent)} />
      <div className="absolute right-4 top-4 rounded-full border bg-background/70 p-2 shadow-sm backdrop-blur transition group-hover:scale-105">
        <Icon className="size-5" />
      </div>
      <CardHeader className="relative min-h-28 justify-end">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-background/75 backdrop-blur">
            {meta.eyebrow}
          </Badge>
          {app.status === 'coming-soon' ? (
            <Badge variant="secondary">
              <Clock3 className="size-3" /> Próximamente
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
              <CheckCircle2 className="size-3" /> Activa
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <div>
          <CardTitle className="mb-1 text-xl tracking-tight">{app.name}</CardTitle>
          <CardDescription className="line-clamp-3 leading-6">{app.description}</CardDescription>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Sparkles className="size-3.5 text-brand-accent" />
            <span className="truncate">{meta.detail}</span>
          </span>
          {isAvailable ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              Abrir <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )

  if (!isAvailable) {
    return <div>{card}</div>
  }

  return (
    <Link href={app.href} className="block h-full">
      {card}
    </Link>
  )
}
