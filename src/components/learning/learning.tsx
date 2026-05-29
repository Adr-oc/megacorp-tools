'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  Plus,
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

function progressMap(progress: LearningProgressSet) {
  return new Map(progress.progress.map((item) => [item.contentId, item.status]))
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

  const filteredContents = visibleContents.filter((content) => {
    const status = byContent.get(content.id) ?? 'pendiente'
    return (
      (typeFilter === 'todos' || content.type === typeFilter) &&
      (categoryFilter === 'todos' || content.category === categoryFilter) &&
      (levelFilter === 'todos' || content.level === levelFilter) &&
      (statusFilter === 'todos' || status === statusFilter)
    )
  })

  const completedCount = publishedContents.filter(
    (content) => byContent.get(content.id) === 'completado'
  ).length
  const inProgressCount = publishedContents.filter(
    (content) => byContent.get(content.id) === 'en progreso'
  ).length
  const recommendation = publishedContents.find(
    (content) => byContent.get(content.id) === 'en progreso'
  ) ?? publishedContents.find((content) => byContent.get(content.id) !== 'completado')

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">MegaTools Learning</p>
          <h1 className="text-3xl font-bold tracking-tight">Centro de aprendizaje</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Biblioteca interna para cursos, talleres, documentos y recursos clave de tu organización.
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus className="size-4" />
            Nuevo contenido
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<BookOpen className="size-5" />} label="Publicados" value={publishedContents.length} />
        <MetricCard icon={<CheckCircle2 className="size-5" />} label="Completados" value={completedCount} />
        <MetricCard icon={<Clock3 className="size-5" />} label="En progreso" value={inProgressCount} />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Próximo contenido recomendado</CardTitle>
          <CardDescription>Continuá con el recurso más relevante según tu avance.</CardDescription>
        </CardHeader>
        <CardContent>
          {recommendation ? (
            <div className="flex flex-col gap-3 rounded-lg bg-background p-4 ring-1 ring-foreground/10 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{recommendation.title}</h2>
                  <Badge variant="secondary">{LEARNING_TYPE_LABELS[recommendation.type]}</Badge>
                  <Badge variant="outline">{LEARNING_LEVEL_LABELS[recommendation.level]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{recommendation.description}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setContentProgress(recommendation.id, 'en progreso')}
                disabled={isPending}
              >
                Empezar ahora
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay contenidos pendientes publicados por el momento.
            </p>
          )}
        </CardContent>
      </Card>

      {isAdmin && showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar contenido' : 'Crear contenido'}</CardTitle>
            <CardDescription>Los borradores solo son visibles para administradores.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Título">
                <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </Field>
              <Field label="Categoría">
                <Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Onboarding, Ventas, Producto…" />
              </Field>
              <Field label="Tipo">
                <NativeSelect value={draft.type} onChange={(value) => setDraft({ ...draft, type: value as LearningType })}>
                  {LEARNING_TYPES.map((type) => <option key={type} value={type}>{LEARNING_TYPE_LABELS[type]}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Nivel">
                <NativeSelect value={draft.level} onChange={(value) => setDraft({ ...draft, level: value as LearningLevel })}>
                  {LEARNING_LEVELS.map((level) => <option key={level} value={level}>{LEARNING_LEVEL_LABELS[level]}</option>)}
                </NativeSelect>
              </Field>
              <Field label="URL opcional">
                <Input value={draft.url ?? ''} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://…" />
              </Field>
              <Field label="Duración">
                <Input value={draft.duration ?? ''} onChange={(event) => setDraft({ ...draft, duration: event.target.value })} placeholder="45 min, 2 h, 3 módulos…" />
              </Field>
              <Field label="Descripción" className="lg:col-span-2">
                <textarea
                  className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(event) => setDraft({ ...draft, published: event.target.checked })}
                />
                Publicado
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={saveContent} disabled={isPending}>{isPending ? 'Guardando…' : 'Guardar'}</Button>
              <Button variant="outline" onClick={resetForm} disabled={isPending}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Biblioteca de contenidos</CardTitle>
          <CardDescription>Filtrá por tipo, categoría, nivel o estado personal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredContents.map((content) => (
                <ContentCard
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
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No hay contenidos que coincidan con los filtros.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-1">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ContentCard({
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
  return (
    <Card className="min-h-64">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{LEARNING_TYPE_LABELS[content.type]}</Badge>
              <Badge variant="outline">{content.category}</Badge>
              <Badge variant="outline">{LEARNING_LEVEL_LABELS[content.level]}</Badge>
              {!content.published ? <Badge variant="destructive">Borrador</Badge> : null}
            </div>
            <CardTitle className="text-xl">{content.title}</CardTitle>
          </div>
          {isAdmin ? (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm" onClick={onEdit}><Edit3 className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={onDelete}><Trash2 className="size-4" /></Button>
            </div>
          ) : null}
        </div>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {content.duration ? <span>Duración: {content.duration}</span> : null}
          {content.url ? (
            <a className="inline-flex items-center gap-1 text-primary hover:underline" href={content.url} target="_blank" rel="noreferrer">
              Abrir recurso <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
        {content.published ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Estado:</span>
            {LEARNING_PROGRESS_STATUSES.map((item) => (
              <Button
                key={item}
                variant={status === item ? 'default' : 'outline'}
                size="sm"
                disabled={disabled}
                onClick={() => onProgress(item)}
              >
                {LEARNING_PROGRESS_LABELS[item]}
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
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
      className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  )
}
