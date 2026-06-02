'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  ExternalLink,
  Filter,
  GraduationCap,
  Layers3,
  MessageSquare,
  PlayCircle,
  Plus,
  Search,
  Settings,
  Trash2,
  Trophy,
  UserRound,
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
import { cn } from '@/lib/utils'

type FilterValue<T extends string> = 'todos' | T
type Draft = LearningContentInput
type LearningMode = 'student' | 'admin'

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

const TYPE_LABEL_FALLBACK: Record<LearningType, string> = {
  video: 'Contenido visual',
  documento: 'Material de lectura',
  enlace: 'Recurso externo',
  curso: 'Curso guiado',
  taller: 'Taller práctico',
}

function progressMap(progress: LearningProgressSet) {
  return new Map(progress.progress.map((item) => [item.contentId, item.status]))
}

function pct(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

function progressPercent(status: LearningProgressStatus) {
  if (status === 'completado') return 100
  if (status === 'en progreso') return 50
  return 0
}

export function Learning({ initialData }: { initialData: LearningHubData }) {
  const [contents, setContents] = useState<LearningContent[]>(initialData.library.contents)
  const [progress, setProgress] = useState<LearningProgressSet>(initialData.progress)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mode, setMode] = useState<LearningMode>('student')
  const [showForm, setShowForm] = useState(false)
  const [typeFilter, setTypeFilter] = useState<FilterValue<LearningType>>('todos')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [levelFilter, setLevelFilter] = useState<FilterValue<LearningLevel>>('todos')
  const [statusFilter, setStatusFilter] = useState<FilterValue<LearningProgressStatus>>('todos')
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  const isAdmin = initialData.isAdmin
  const isAdminMode = isAdmin && mode === 'admin'
  const byContent = useMemo(() => progressMap(progress), [progress])
  const publishedContents = useMemo(() => contents.filter((content) => content.published), [contents])
  const draftContents = useMemo(() => contents.filter((content) => !content.published), [contents])
  const visibleContents = isAdminMode ? contents : publishedContents
  const categories = useMemo(
    () => Array.from(new Set(visibleContents.map((content) => content.category))).sort(),
    [visibleContents]
  )

  const completedCount = publishedContents.filter((content) => byContent.get(content.id) === 'completado').length
  const inProgressCount = publishedContents.filter((content) => byContent.get(content.id) === 'en progreso').length
  const completionPercent = pct(completedCount, publishedContents.length)
  const activeContents = publishedContents.filter((content) => byContent.get(content.id) === 'en progreso')
  const recommendation = activeContents[0] ?? publishedContents.find((content) => byContent.get(content.id) !== 'completado')

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
    setMode('admin')
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
    <div className="mx-auto max-w-[1480px] rounded-[2rem] border bg-background/95 p-2 shadow-2xl shadow-brand-accent/10 ring-1 ring-brand-accent/10">
      <div className="grid min-h-[780px] overflow-hidden rounded-[1.5rem] bg-card md:grid-cols-[210px_minmax(0,1fr)]">
        <LearningSidebar
          isAdmin={isAdmin}
          isAdminMode={isAdminMode}
          completionPercent={completionPercent}
          unreadCount={inProgressCount}
          onModeChange={(next) => {
            setMode(next)
            if (next === 'student') setShowForm(false)
          }}
        />

        <main className="min-w-0 bg-muted/25">
          <div className="flex flex-col gap-5 p-4 md:p-6">
            <LearningTopbar
              query={query}
              onQueryChange={setQuery}
              isAdmin={isAdmin}
              isAdminMode={isAdminMode}
              onCreate={() => {
                setMode('admin')
                setShowForm((value) => !value)
              }}
            />

            {isAdminMode ? (
              <AdminDashboard
                contents={contents}
                publishedCount={publishedContents.length}
                draftCount={draftContents.length}
                showForm={showForm}
                draft={draft}
                editingId={editingId}
                disabled={isPending}
                onDraftChange={setDraft}
                onSave={saveContent}
                onCancel={resetForm}
              />
            ) : (
              <StudentHero
                recommendation={recommendation}
                activeContents={activeContents}
                completedCount={completedCount}
                totalCount={publishedContents.length}
                completionPercent={completionPercent}
                isPending={isPending}
                byContent={byContent}
                onProgress={setContentProgress}
              />
            )}

            <section className="rounded-[1.35rem] bg-background p-4 shadow-sm ring-1 ring-border/70 md:p-5">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    {isAdminMode ? 'Biblioteca docente' : 'Cursos'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isAdminMode
                      ? 'Administra publicaciones y borradores sin tocar el progreso de estudiante.'
                      : 'Elige un curso, avanza y deja rastro. Civilización básica.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <NativeSelect value={levelFilter} onChange={(value) => setLevelFilter(value as FilterValue<LearningLevel>)}>
                    <option value="todos">Todos los niveles</option>
                    {LEARNING_LEVELS.map((level) => <option key={level} value={level}>{LEARNING_LEVEL_LABELS[level]}</option>)}
                  </NativeSelect>
                  <NativeSelect value={statusFilter} onChange={(value) => setStatusFilter(value as FilterValue<LearningProgressStatus>)}>
                    <option value="todos">Estados</option>
                    {LEARNING_PROGRESS_STATUSES.map((status) => <option key={status} value={status}>{LEARNING_PROGRESS_LABELS[status]}</option>)}
                  </NativeSelect>
                  <Button variant="outline" size="icon-sm" aria-label="Filtros">
                    <Filter className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                <Chip active={categoryFilter === 'todos'} onClick={() => setCategoryFilter('todos')}>All courses</Chip>
                {categories.map((category) => (
                  <Chip key={category} active={categoryFilter === category} onClick={() => setCategoryFilter(category)}>
                    {category}
                  </Chip>
                ))}
                <Chip active={typeFilter !== 'todos'} onClick={() => setTypeFilter(typeFilter === 'todos' ? 'curso' : 'todos')}>
                  {typeFilter === 'todos' ? 'Tipos' : LEARNING_TYPE_LABELS[typeFilter]}
                </Chip>
              </div>

              {filteredContents.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredContents.map((content) => (
                    <LearningCourseCard
                      key={content.id}
                      content={content}
                      isAdmin={isAdminMode}
                      status={byContent.get(content.id) ?? 'pendiente'}
                      disabled={isPending}
                      onEdit={() => editContent(content)}
                      onDelete={() => removeContent(content.id)}
                      onProgress={(status) => setContentProgress(content.id, status)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="Sin cursos" description="No hay contenidos que coincidan con esos filtros." />
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

function LearningSidebar({
  isAdmin,
  isAdminMode,
  completionPercent,
  unreadCount,
  onModeChange,
}: {
  isAdmin: boolean
  isAdminMode: boolean
  completionPercent: number
  unreadCount: number
  onModeChange: (mode: LearningMode) => void
}) {
  return (
    <aside className="hidden border-r bg-background px-3 py-5 md:flex md:flex-col">
      <div className="mb-8 px-2">
        <div className="text-2xl font-black tracking-tight">
          Mega<span className="text-brand-accent">Learn</span>
        </div>
        <p className="text-[11px] text-muted-foreground">MEGACORP Academy</p>
      </div>

      <nav className="space-y-1 text-sm">
        <SidebarItem icon={BookOpen} label="My courses" active={!isAdminMode} onClick={() => onModeChange('student')} />
        <SidebarItem icon={ClipboardList} label="Assignments" />
        <SidebarItem icon={Trophy} label="Quizzes" />
        <SidebarItem icon={Award} label="Certificates" />
        <SidebarItem icon={MessageSquare} label="Community" badge="New" />
        {isAdmin ? (
          <SidebarItem icon={Layers3} label="Teacher studio" active={isAdminMode} onClick={() => onModeChange('admin')} />
        ) : null}
      </nav>

      <div className="mt-6 rounded-2xl bg-brand-accent/10 p-3 text-xs ring-1 ring-brand-accent/20">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">Progress</span>
          <span className="font-bold text-brand-accent">{completionPercent}%</span>
        </div>
        <ProgressBar value={completionPercent} />
        <p className="mt-2 text-muted-foreground">{unreadCount} cursos en progreso.</p>
      </div>

      <div className="mt-auto space-y-1 text-sm">
        <SidebarItem icon={Settings} label="Settings" />
      </div>
    </aside>
  )
}

function LearningTopbar({
  query,
  onQueryChange,
  isAdmin,
  isAdminMode,
  onCreate,
}: {
  query: string
  onQueryChange: (query: string) => void
  isAdmin: boolean
  isAdminMode: boolean
  onCreate: () => void
}) {
  return (
    <header className="flex flex-col gap-4 rounded-[1.35rem] bg-background px-4 py-4 shadow-sm ring-1 ring-border/70 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{isAdminMode ? 'Teacher studio' : 'My courses'}</h1>
        <p className="text-xs text-muted-foreground">
          {isAdminMode
            ? 'Publica contenido sin perder tu experiencia como estudiante.'
            : 'Keep growing your IT skills — your next milestone is just a lesson away.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search"
            className="rounded-full border-0 bg-muted/70 pl-9 shadow-none"
          />
        </div>
        <Button variant="outline" size="icon-sm" className="rounded-full bg-background" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" className="rounded-full bg-background" aria-label="Profile">
          <UserRound className="size-4" />
        </Button>
        {isAdmin ? (
          <Button onClick={onCreate} className="rounded-full" variant={isAdminMode ? 'default' : 'outline'}>
            <Plus className="size-4" /> Nuevo
          </Button>
        ) : null}
      </div>
    </header>
  )
}

function StudentHero({
  recommendation,
  activeContents,
  completedCount,
  totalCount,
  completionPercent,
  isPending,
  byContent,
  onProgress,
}: {
  recommendation?: LearningContent
  activeContents: LearningContent[]
  completedCount: number
  totalCount: number
  completionPercent: number
  isPending: boolean
  byContent: Map<string, LearningProgressStatus>
  onProgress: (contentId: string, status: LearningProgressStatus) => void
}) {
  const featured = activeContents.length > 0 ? activeContents.slice(0, 2) : recommendation ? [recommendation] : []

  return (
    <section className="rounded-[1.35rem] bg-background p-4 shadow-sm ring-1 ring-border/70 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold tracking-tight">Continue watching</h2>
          <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} completados · {completionPercent}% total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon-sm" className="rounded-full"><ChevronLeft className="size-4" /></Button>
          <Button variant="ghost" size="icon-sm" className="rounded-full"><ChevronRight className="size-4" /></Button>
        </div>
      </div>

      {featured.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {featured.map((content) => (
            <ContinueCard
              key={content.id}
              content={content}
              status={byContent.get(content.id) ?? 'pendiente'}
              disabled={isPending}
              onProgress={(status) => onProgress(content.id, status)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Sin cursos pendientes" description="Cuando se publique contenido aparecerá aquí." compact />
      )}
    </section>
  )
}

function AdminDashboard({
  contents,
  publishedCount,
  draftCount,
  showForm,
  draft,
  editingId,
  disabled,
  onDraftChange,
  onSave,
  onCancel,
}: {
  contents: LearningContent[]
  publishedCount: number
  draftCount: number
  showForm: boolean
  draft: Draft
  editingId: string | null
  disabled: boolean
  onDraftChange: (draft: Draft) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <section className="space-y-4 rounded-[1.35rem] bg-background p-4 shadow-sm ring-1 ring-border/70 md:p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <AdminMetric label="Total content" value={contents.length} hint="Biblioteca completa" />
        <AdminMetric label="Published" value={publishedCount} hint="Visible para alumnos" />
        <AdminMetric label="Drafts" value={draftCount} hint="Solo docentes" />
      </div>
      {showForm ? (
        <AdminContentForm
          draft={draft}
          editingId={editingId}
          disabled={disabled}
          onDraftChange={onDraftChange}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <div className="rounded-2xl border border-dashed bg-brand-accent/5 p-5 text-sm text-muted-foreground">
          Estás en modo maestro. Administra contenido aquí; cambia a “My courses” para vivir la experiencia de estudiante.
        </div>
      )}
    </section>
  )
}

function ContinueCard({
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
  const percent = progressPercent(status)
  return (
    <div className="grid gap-4 rounded-2xl bg-muted/35 p-3 sm:grid-cols-[136px_minmax(0,1fr)] sm:items-center">
      <CourseVisual content={content} large />
      <div className="min-w-0 space-y-3">
        <div>
          <Badge className="mb-2 bg-brand-accent/20 text-foreground ring-1 ring-brand-accent/20" variant="secondary">
            {content.category || LEARNING_TYPE_LABELS[content.type]}
          </Badge>
          <h3 className="line-clamp-2 font-bold tracking-tight">{content.title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Progress</span><span>{percent}%</span>
            </div>
            <ProgressBar value={percent} />
          </div>
          <Button size="sm" className="rounded-full px-5" disabled={disabled} onClick={() => onProgress(status === 'completado' ? 'completado' : 'en progreso')}>
            Continue
          </Button>
        </div>
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
  const percent = progressPercent(status)

  return (
    <article className="group overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/70 transition hover:-translate-y-0.5 hover:shadow-lg">
      <CourseVisual content={content} />
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <Badge variant="secondary" className="bg-brand-accent/15 text-foreground ring-1 ring-brand-accent/20">
            {content.category || LEARNING_TYPE_LABELS[content.type]}
          </Badge>
          <span className="shrink-0 text-muted-foreground">{content.duration ?? 'Self paced'}</span>
        </div>
        <div>
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 tracking-tight">{content.title}</h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{content.description || TYPE_LABEL_FALLBACK[content.type]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{LEARNING_LEVEL_LABELS[content.level]}</span>
          {!content.published ? <Badge variant="destructive" className="text-[10px]">Draft</Badge> : null}
          {content.url ? (
            <a className="inline-flex items-center gap-1 text-brand-accent hover:underline" href={content.url} target="_blank" rel="noreferrer">
              Open <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
        {content.published ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{status === 'pendiente' ? 'Not started' : `Progress: ${percent}%`}</span>
              <Button size="sm" variant={status === 'pendiente' ? 'outline' : 'default'} className="h-8 rounded-full px-4" disabled={disabled} onClick={() => onProgress(status === 'completado' ? 'completado' : 'en progreso')}>
                {status === 'pendiente' ? 'Start' : 'Continue'}
              </Button>
            </div>
            <ProgressBar value={percent} />
            {status !== 'completado' ? (
              <Button variant="ghost" size="sm" className="h-7 w-full rounded-full text-[11px]" disabled={disabled} onClick={() => onProgress('completado')}>
                <CheckCircle2 className="size-3" /> Mark complete
              </Button>
            ) : null}
          </div>
        ) : null}
        {isAdmin ? (
          <div className="flex gap-2 border-t pt-3">
            <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={onEdit}><Edit3 className="size-3" /> Edit</Button>
            <Button variant="outline" size="sm" className="rounded-full text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="size-3" /></Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function CourseVisual({ content, large = false }: { content: LearningContent; large?: boolean }) {
  const Icon = content.type === 'video' ? PlayCircle : content.type === 'documento' ? BookOpen : content.type === 'taller' ? ClipboardList : content.type === 'enlace' ? ExternalLink : GraduationCap
  const art = {
    video: 'from-rose-200 via-orange-100 to-stone-300 dark:from-rose-950 dark:via-orange-950 dark:to-stone-900',
    documento: 'from-sky-200 via-slate-100 to-blue-300 dark:from-sky-950 dark:via-slate-900 dark:to-blue-950',
    enlace: 'from-violet-200 via-fuchsia-100 to-indigo-300 dark:from-violet-950 dark:via-fuchsia-950 dark:to-indigo-950',
    curso: 'from-brand-accent/70 via-brand-accent/25 to-muted dark:from-brand-accent/50 dark:via-brand-accent/20 dark:to-muted',
    taller: 'from-amber-200 via-lime-100 to-brand-accent/60 dark:from-amber-950 dark:via-lime-950 dark:to-brand-accent/30',
  } satisfies Record<LearningType, string>

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-gradient-to-br', art[content.type], large ? 'h-24 sm:h-24' : 'h-28')}>
      <div className="absolute -right-8 -top-8 size-28 rounded-full bg-background/35 blur-sm" />
      <div className="absolute bottom-3 left-3 rounded-2xl bg-background/70 p-2 shadow-sm backdrop-blur">
        <Icon className="size-5 text-brand-accent" />
      </div>
      <div className="absolute bottom-3 right-3 rounded-full bg-background/75 px-2 py-1 text-[10px] font-medium backdrop-blur">
        {LEARNING_TYPE_LABELS[content.type]}
      </div>
    </div>
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
    <Card className="border-brand-accent/30 bg-background">
      <CardHeader>
        <CardTitle>{editingId ? 'Editar contenido' : 'Crear contenido'}</CardTitle>
        <CardDescription>Los borradores quedan visibles solo para administradores.</CardDescription>
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
              className="accent-[var(--brand-accent)]"
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

function SidebarItem({ icon: Icon, label, active, badge, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean; badge?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition',
        active ? 'bg-brand-accent/30 font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? <span className="rounded-full bg-brand-accent/35 px-2 py-0.5 text-[10px] text-foreground">{badge}</span> : null}
    </button>
  )
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-4 py-2 text-xs font-medium transition',
        active ? 'bg-brand-accent text-brand-accent-foreground shadow-sm' : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

function AdminMetric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl bg-muted/35 p-4 ring-1 ring-border/60">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-brand-accent transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
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
      className="h-9 min-w-32 rounded-full border border-transparent bg-muted/70 px-3 text-xs outline-none transition focus-visible:border-brand-accent focus-visible:ring-3 focus-visible:ring-brand-accent/30"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  )
}
