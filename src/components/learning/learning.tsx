'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  Award,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  Flame,
  GraduationCap,
  Layers3,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  LEARNING_LEVEL_LABELS,
  LEARNING_LEVELS,
  LEARNING_PROGRESS_LABELS,
  LEARNING_PROGRESS_STATUSES,
  LEARNING_TYPE_LABELS,
  LEARNING_TYPES,
  type LearningContent,
  type LearningContentInput,
  type LearningLevel,
  type LearningProgressSet,
  type LearningProgressStatus,
  type LearningType,
} from '@/lib/learning/schema'
import {
  deleteLearningContent,
  saveLearningContent,
  updateLearningProgress,
  type LearningHubData,
} from '@/lib/learning/actions'

type FilterValue<T extends string> = 'todos' | T
type Draft = LearningContentInput

const emptyDraft: Draft = {
  title: '',
  description: '',
  type: 'curso',
  category: '',
  url: '',
  duration: '',
  level: 'básico',
  published: true,
}

const TYPE_ACCENTS: Record<LearningType, string> = {
  video: 'from-red-500/20 to-orange-500/10 text-red-700 dark:text-red-200',
  documento: 'from-sky-500/20 to-cyan-500/10 text-sky-700 dark:text-sky-200',
  enlace: 'from-violet-500/20 to-fuchsia-500/10 text-violet-700 dark:text-violet-200',
  curso: 'from-emerald-500/20 to-teal-500/10 text-emerald-700 dark:text-emerald-200',
  taller: 'from-amber-500/20 to-yellow-500/10 text-amber-700 dark:text-amber-200',
}

function progressMap(progress: LearningProgressSet) {
  return new Map(progress.progress.map((item) => [item.contentId, item.status]))
}

function pct(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export function Learning({ initialData }: { initialData: LearningHubData }) {
  const [contents, setContents] = useState<LearningContent[]>(initialData.library.contents)
  const [progress, setProgress] = useState<LearningProgressSet>(initialData.progress)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(initialData.isAdmin && contents.length === 0)
  const [typeFilter, setTypeFilter] = useState<FilterValue<LearningType>>('todos')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [levelFilter, setLevelFilter] = useState<FilterValue<LearningLevel>>('todos')
  const [statusFilter, setStatusFilter] = useState<FilterValue<LearningProgressStatus>>('todos')
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  const isAdmin = initialData.isAdmin
  const byContent = useMemo(() => progressMap(progress), [progress])
  const publishedContents = useMemo(
    () => contents.filter((content) => content.published),
    [contents]
  )
  const visibleContents = isAdmin ? contents : publishedContents
  const categories = useMemo(
    () => Array.from(new Set(visibleContents.map((content) => content.category))).sort(),
    [visibleContents]
  )

  const completedCount = publishedContents.filter(
    (content) => byContent.get(content.id) === 'completado'
  ).length
  const inProgressCount = publishedContents.filter(
    (content) => byContent.get(content.id) === 'en progreso'
  ).length
  const completionPercent = pct(completedCount, publishedContents.length)
  const activeContent = publishedContents.find(
    (content) => byContent.get(content.id) === 'en progreso'
  )
  const recommendation = activeContent ?? publishedContents.find(
    (content) => byContent.get(content.id) !== 'completado'
  )

  const filteredContents = visibleContents.filter((content) => {
    const status = byContent.get(content.id) ?? 'pendiente'
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || [
      content.title,
      content.description,
      content.category,
      LEARNING_TYPE_LABELS[content.type],
      LEARNING_LEVEL_LABELS[content.level],
    ].join(' ').toLowerCase().includes(term)

    return (
      matchesQuery &&
      (typeFilter === 'todos' || content.type === typeFilter) &&
      (categoryFilter === 'todos' || content.category === categoryFilter) &&
      (levelFilter === 'todos' || content.level === levelFilter) &&
      (statusFilter === 'todos' || status === statusFilter)
    )
  })

  const byCategory = categories.map((category) => {
    const items = publishedContents.filter((content) => content.category === category)
    const done = items.filter((content) => byContent.get(content.id) === 'completado').length
    return { category, total: items.length, done, percent: pct(done, items.length) }
  })

  function resetForm() {
    setDraft(emptyDraft)
    setEditingId(null)
    setShowForm(false)
  }

  function editContent(content: LearningContent) {
    setDraft({
      id: content.id,
      title: content.title,
      description: content.description,
      type: content.type,
      category: content.category,
      url: content.url ?? '',
      duration: content.duration ?? '',
      level: content.level,
      published: content.published,
    })
    setEditingId(content.id)
    setShowForm(true)
  }

  function saveContent() {
    startTransition(async () => {
      const result = await saveLearningContent(draft)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setContents((current) => {
        const exists = current.some((content) => content.id === result.content.id)
        return exists
          ? current.map((content) => (content.id === result.content.id ? result.content : content))
          : [result.content, ...current]
      })
      toast.success(editingId ? 'Contenido actualizado' : 'Contenido creado')
      resetForm()
    })
  }

  function removeContent(contentId: string) {
    startTransition(async () => {
      const result = await deleteLearningContent(contentId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setContents((current) => current.filter((content) => content.id !== contentId))
      toast.success('Contenido eliminado')
    })
  }

  function setContentProgress(contentId: string, status: LearningProgressStatus) {
    startTransition(async () => {
      const result = await updateLearningProgress({ contentId, status })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setProgress((current) => {
        const entry = { contentId, status, updatedAt: new Date().toISOString() }
        const exists = current.progress.some((item) => item.contentId === contentId)
        return {
          progress: exists
            ? current.progress.map((item) => (item.contentId === contentId ? entry : item))
            : [entry, ...current.progress],
        }
      })
      toast.success('Progreso actualizado')
    })
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.22),transparent_34%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.65))] p-6 shadow-sm md:p-8">
        <div className="absolute right-6 top-6 hidden rounded-full border bg-background/70 px-4 py-2 text-xs font-medium backdrop-blur md:block">
          Plataforma interna · MEGACORP Academy
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-5">
            <Badge className="w-fit gap-1" variant="secondary">
              <GraduationCap className="size-3.5" /> Learning OS
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                Aprendizaje interno, ordenado como plataforma.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Cursos, talleres, manuales y recursos de la empresa con progreso personal, rutas por tema y contenido destacado.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {recommendation ? (
                <Button
                  size="lg"
                  onClick={() => setContentProgress(recommendation.id, 'en progreso')}
                  disabled={isPending}
                >
                  <PlayCircle className="size-4" /> Continuar aprendizaje
                </Button>
              ) : null}
              {isAdmin ? (
                <Button size="lg" variant="outline" onClick={() => setShowForm((value) => !value)}>
                  <Plus className="size-4" /> Nuevo contenido
                </Button>
              ) : null}
            </div>
          </div>
          <Card className="bg-background/80 backdrop-blur">
            <CardHeader>
              <CardDescription>Tu avance general</CardDescription>
              <CardTitle className="text-5xl">{completionPercent}%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProgressBar value={completionPercent} />
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <MiniStat label="Publicados" value={publishedContents.length} />
                <MiniStat label="En curso" value={inProgressCount} />
                <MiniStat label="Listos" value={completedCount} />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<Layers3 className="size-5" />} label="Catálogo" value={`${publishedContents.length} contenidos`} hint="Cursos, talleres y recursos" />
        <MetricCard icon={<Flame className="size-5" />} label="En progreso" value={inProgressCount.toString()} hint="Seguimiento personal" />
        <MetricCard icon={<Award className="size-5" />} label="Completados" value={completedCount.toString()} hint={`${completionPercent}% del catálogo`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" /> Continuar ahora
                  </CardTitle>
                  <CardDescription>La plataforma te empuja al siguiente recurso útil.</CardDescription>
                </div>
                {recommendation ? <Badge>{LEARNING_PROGRESS_LABELS[byContent.get(recommendation.id) ?? 'pendiente']}</Badge> : null}
              </div>
            </CardHeader>
            <CardContent>
              {recommendation ? (
                <FeaturedLesson
                  content={recommendation}
                  status={byContent.get(recommendation.id) ?? 'pendiente'}
                  disabled={isPending}
                  onProgress={(status) => setContentProgress(recommendation.id, status)}
                />
              ) : (
                <EmptyState title="Todo al día" description="No hay contenidos pendientes publicados por el momento." />
              )}
            </CardContent>
          </Card>

          {isAdmin && showForm ? (
            <AdminContentForm
              draft={draft}
              editingId={editingId}
              disabled={isPending}
              onDraftChange={setDraft}
              onSave={saveContent}
              onCancel={resetForm}
            />
          ) : null}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>Catálogo de aprendizaje</CardTitle>
                  <CardDescription>Filtrá, abrí recursos y marcá tu avance.</CardDescription>
                </div>
                <div className="relative min-w-0 lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar curso, categoría, nivel…"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-4">
                <NativeSelect value={typeFilter} onChange={(value) => setTypeFilter(value as FilterValue<LearningType>)}>
                  <option value="todos">Todos los tipos</option>
                  {LEARNING_TYPES.map((type) => <option key={type} value={type}>{LEARNING_TYPE_LABELS[type]}</option>)}
                </NativeSelect>
                <NativeSelect value={categoryFilter} onChange={setCategoryFilter}>
                  <option value="todos">Todas las categorías</option>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </NativeSelect>
                <NativeSelect value={levelFilter} onChange={(value) => setLevelFilter(value as FilterValue<LearningLevel>)}>
                  <option value="todos">Todos los niveles</option>
                  {LEARNING_LEVELS.map((level) => <option key={level} value={level}>{LEARNING_LEVEL_LABELS[level]}</option>)}
                </NativeSelect>
                <NativeSelect value={statusFilter} onChange={(value) => setStatusFilter(value as FilterValue<LearningProgressStatus>)}>
                  <option value="todos">Todos los estados</option>
                  {LEARNING_PROGRESS_STATUSES.map((status) => <option key={status} value={status}>{LEARNING_PROGRESS_LABELS[status]}</option>)}
                </NativeSelect>
              </div>

              {filteredContents.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredContents.map((content) => (
                    <LearningCourseCard
                      key={content.id}
                      content={content}
                      isAdmin={isAdmin}
                      status={byContent.get(content.id) ?? 'pendiente'}
                      disabled={isPending}
                      onEdit={() => editContent(content)}
                      onDelete={() => removeContent(content.id)}
                      onProgress={(status) => setContentProgress(content.id, status)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="Sin resultados" description="No hay contenidos que coincidan con esos filtros." />
              )}
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rutas de aprendizaje</CardTitle>
              <CardDescription>Progreso por categoría.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {byCategory.length > 0 ? byCategory.map((item) => (
                <div key={item.category} className="rounded-2xl border p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.category}</p>
                      <p className="text-xs text-muted-foreground">{item.done}/{item.total} completados</p>
                    </div>
                    <span className="text-sm font-bold">{item.percent}%</span>
                  </div>
                  <ProgressBar value={item.percent} />
                </div>
              )) : <EmptyState title="Sin rutas" description="Creá contenido por categoría para formar rutas." compact />}
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardHeader>
              <CardTitle className="text-lg">Cómo se siente esto</CardTitle>
              <CardDescription>No es un folder con links. Es una plataforma interna de formación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Home con progreso y recomendación.</p>
              <p>• Catálogo con filtros como LMS.</p>
              <p>• Rutas por categoría para ordenar capacitaciones.</p>
              <p>• Admins publican; usuarios consumen y avanzan.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function FeaturedLesson({
  content,
  status,
  disabled,
  onProgress,
}: {
  content: LearningContent
  status: LearningProgressStatus
  disabled: boolean
  onProgress: (status: LearningProgressStatus) => void
}) {
  return (
    <div className="grid gap-4 rounded-3xl border bg-background p-5 md:grid-cols-[1fr_auto] md:items-center">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{LEARNING_TYPE_LABELS[content.type]}</Badge>
          <Badge variant="outline">{content.category}</Badge>
          <Badge variant="outline">{LEARNING_LEVEL_LABELS[content.level]}</Badge>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{content.title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{content.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {content.duration ? <span className="inline-flex items-center gap-1"><Clock3 className="size-4" /> {content.duration}</span> : null}
          {content.url ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={content.url} target="_blank" rel="noreferrer">Abrir recurso <ExternalLink className="size-3" /></a> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:flex-col">
        <Button disabled={disabled} onClick={() => onProgress('en progreso')}>
          <PlayCircle className="size-4" /> {status === 'en progreso' ? 'Continuar' : 'Empezar'}
        </Button>
        <Button disabled={disabled} variant="outline" onClick={() => onProgress('completado')}>
          <CheckCircle2 className="size-4" /> Marcar completado
        </Button>
      </div>
    </div>
  )
}

function LearningCourseCard({
  content,
  isAdmin,
  status,
  disabled,
  onEdit,
  onDelete,
  onProgress,
}: {
  content: LearningContent
  isAdmin: boolean
  status: LearningProgressStatus
  disabled: boolean
  onEdit: () => void
  onDelete: () => void
  onProgress: (status: LearningProgressStatus) => void
}) {
  const statusPercent = status === 'completado' ? 100 : status === 'en progreso' ? 50 : 0

  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`h-2 bg-gradient-to-r ${TYPE_ACCENTS[content.type]}`} />
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{LEARNING_TYPE_LABELS[content.type]}</Badge>
              <Badge variant="outline">{content.category}</Badge>
              {!content.published ? <Badge variant="destructive">Borrador</Badge> : null}
            </div>
            <div>
              <CardTitle className="text-xl">{content.title}</CardTitle>
              <CardDescription className="mt-1 line-clamp-3">{content.description}</CardDescription>
            </div>
          </div>
          {isAdmin ? (
            <div className="flex shrink-0 gap-1 opacity-70 transition group-hover:opacity-100">
              <Button variant="ghost" size="icon-sm" onClick={onEdit}><Edit3 className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={onDelete}><Trash2 className="size-4" /></Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{LEARNING_LEVEL_LABELS[content.level]}</Badge>
          {content.duration ? <span>{content.duration}</span> : null}
          {content.url ? (
            <a className="inline-flex items-center gap-1 text-primary hover:underline" href={content.url} target="_blank" rel="noreferrer">
              Abrir <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
        {content.published ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{LEARNING_PROGRESS_LABELS[status]}</span>
              <span className="text-muted-foreground">{statusPercent}%</span>
            </div>
            <ProgressBar value={statusPercent} />
            <div className="grid grid-cols-3 gap-2">
              {LEARNING_PROGRESS_STATUSES.map((item) => (
                <Button
                  key={item}
                  variant={status === item ? 'default' : 'outline'}
                  size="sm"
                  disabled={disabled}
                  onClick={() => onProgress(item)}
                  className="text-xs"
                >
                  {LEARNING_PROGRESS_LABELS[item]}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AdminContentForm({
  draft,
  editingId,
  disabled,
  onDraftChange,
  onSave,
  onCancel,
}: {
  draft: Draft
  editingId: string | null
  disabled: boolean
  onDraftChange: (draft: Draft) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>{editingId ? 'Editar contenido' : 'Crear contenido'}</CardTitle>
        <CardDescription>Los borradores se quedan visibles solo para administradores.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Título">
            <Input value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} />
          </Field>
          <Field label="Categoría / ruta">
            <Input value={draft.category} onChange={(event) => onDraftChange({ ...draft, category: event.target.value })} placeholder="Onboarding, Ventas, Producto…" />
          </Field>
          <Field label="Tipo">
            <NativeSelect value={draft.type} onChange={(value) => onDraftChange({ ...draft, type: value as LearningType })}>
              {LEARNING_TYPES.map((type) => <option key={type} value={type}>{LEARNING_TYPE_LABELS[type]}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Nivel">
            <NativeSelect value={draft.level} onChange={(value) => onDraftChange({ ...draft, level: value as LearningLevel })}>
              {LEARNING_LEVELS.map((level) => <option key={level} value={level}>{LEARNING_LEVEL_LABELS[level]}</option>)}
            </NativeSelect>
          </Field>
          <Field label="URL opcional">
            <Input value={draft.url ?? ''} onChange={(event) => onDraftChange({ ...draft, url: event.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Duración">
            <Input value={draft.duration ?? ''} onChange={(event) => onDraftChange({ ...draft, duration: event.target.value })} placeholder="45 min, 2 h, 3 módulos…" />
          </Field>
          <Field label="Descripción" className="lg:col-span-2">
            <textarea
              className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={draft.description}
              onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(event) => onDraftChange({ ...draft, published: event.target.checked })}
            />
            Publicado
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={onSave} disabled={disabled}>{disabled ? 'Guardando…' : 'Guardar'}</Button>
          <Button variant="outline" onClick={onCancel} disabled={disabled}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-muted/40 px-3 py-2">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={compact ? 'rounded-2xl border border-dashed p-5 text-center' : 'rounded-3xl border border-dashed p-10 text-center'}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className ? `grid gap-1.5 ${className}` : 'grid gap-1.5'}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function NativeSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <select
      className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  )
}
