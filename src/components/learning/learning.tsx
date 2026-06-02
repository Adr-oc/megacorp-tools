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
  FileText,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  LEARNING_LEVEL_LABELS,
  LEARNING_LEVELS,
  LEARNING_PROGRESS_LABELS,
  LEARNING_RESOURCE_TYPE_LABELS,
  LEARNING_RESOURCE_TYPES,
  LEARNING_PROGRESS_STATUSES,
  LEARNING_TYPE_LABELS,
  LEARNING_TYPES,
  type LearningContent,
  type LearningContentInput,
  type LearningCourse,
  type LearningLevel,
  type LearningResource,
  type LearningResourceType,
  type LearningRoute,
  type LearningRouteInput,
  type LearningProgressSet,
  type LearningProgressStatus,
  type LearningType,
} from '@/lib/learning/schema'
import {
  deleteLearningContent,
  deleteLearningRoute,
  saveLearningContent,
  saveLearningRoute,
  updateLearningProgress,
  type LearningHubData,
} from '@/lib/learning/actions'
import { cn } from '@/lib/utils'

type FilterValue<T extends string> = 'todos' | T
type Draft = LearningContentInput
type RouteDraft = LearningRouteInput
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

const emptyRouteDraft: RouteDraft = {
  title: '',
  description: '',
  category: '',
  level: 'básico',
  published: true,
  courses: [
    {
      title: '',
      description: '',
      level: 'básico',
      resources: [{ title: '', type: 'video', description: '', url: '', duration: '', required: true }],
    },
  ],
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
  const [routes, setRoutes] = useState<LearningRoute[]>(initialData.library.routes)
  const [progress, setProgress] = useState<LearningProgressSet>(initialData.progress)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [routeDraft, setRouteDraft] = useState<RouteDraft>(emptyRouteDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const [mode, setMode] = useState<LearningMode>('student')
  const [showForm, setShowForm] = useState(false)
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [typeFilter, setTypeFilter] = useState<FilterValue<LearningType>>('todos')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [levelFilter, setLevelFilter] = useState<FilterValue<LearningLevel>>('todos')
  const [statusFilter, setStatusFilter] = useState<FilterValue<LearningProgressStatus>>('todos')
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  const isAdmin = initialData.isAdmin
  const isAdminMode = isAdmin && mode === 'admin'
  const byContent = useMemo(() => progressMap(progress), [progress])
  const publishedRoutes = useMemo(() => routes.filter((route) => route.published), [routes])
  const draftRoutes = useMemo(() => routes.filter((route) => !route.published), [routes])
  const publishedContents = useMemo(() => contents.filter((content) => content.published), [contents])
  const draftContents = useMemo(() => contents.filter((content) => !content.published), [contents])
  const visibleContents = isAdminMode ? contents : publishedContents
  const categories = useMemo(
    () => Array.from(new Set(visibleContents.map((content) => content.category))).sort(),
    [visibleContents]
  )

  const publishedResources = publishedRoutes.flatMap((route) => route.courses).flatMap((course) => course.resources)
  const legacyCompletedCount = publishedContents.filter((content) => byContent.get(content.id) === 'completado').length
  const resourceCompletedCount = publishedResources.filter((resource) => byContent.get(resource.id) === 'completado').length
  const completedCount = legacyCompletedCount + resourceCompletedCount
  const inProgressCount = publishedContents.filter((content) => byContent.get(content.id) === 'en progreso').length + publishedResources.filter((resource) => byContent.get(resource.id) === 'en progreso').length
  const completionPercent = pct(completedCount, publishedContents.length + publishedResources.length)
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

  function editRoute(route: LearningRoute) {
    setRouteDraft({
      id: route.id,
      title: route.title,
      description: route.description,
      category: route.category,
      level: route.level,
      published: route.published,
      courses: route.courses,
    })
    setEditingRouteId(route.id)
    setMode('admin')
    setShowRouteForm(true)
    setShowForm(false)
  }

  function saveRoute() {
    startTransition(async () => {
      const result = await saveLearningRoute(routeDraft)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setRoutes((current) => {
        const exists = current.some((route) => route.id === result.route.id)
        return exists
          ? current.map((route) => (route.id === result.route.id ? result.route : route))
          : [result.route, ...current]
      })
      toast.success(editingRouteId ? 'Ruta actualizada' : 'Ruta creada')
      setRouteDraft(emptyRouteDraft)
      setEditingRouteId(null)
      setShowRouteForm(false)
    })
  }

  function removeRoute(routeId: string) {
    startTransition(async () => {
      const result = await deleteLearningRoute(routeId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setRoutes((current) => current.filter((route) => route.id !== routeId))
      toast.success('Ruta eliminada')
    })
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
    <div className="h-full min-h-[calc(100svh-76px)] w-full rounded-[1.35rem] border bg-background/95 p-1.5 shadow-2xl shadow-brand-accent/10 ring-1 ring-brand-accent/10">
      <div className="grid h-full min-h-[calc(100svh-88px)] overflow-hidden rounded-[1rem] bg-card md:grid-cols-[230px_minmax(0,1fr)]">
        <LearningSidebar
          isAdmin={isAdmin}
          isAdminMode={isAdminMode}
          completionPercent={completionPercent}
          unreadCount={inProgressCount}
          onModeChange={(next) => {
            setMode(next)
            if (next === 'student') {
              setShowForm(false)
              setShowRouteForm(false)
            }
          }}
        />

        <main className="min-w-0 bg-muted/25">
          <div className="flex flex-col gap-3 p-3 md:p-4">
            <LearningTopbar
              query={query}
              onQueryChange={setQuery}
              isAdmin={isAdmin}
              isAdminMode={isAdminMode}
              onCreate={() => {
                setMode('admin')
                setShowRouteForm((value) => !value)
                setShowForm(false)
              }}
            />

            {isAdminMode ? (
              <AdminDashboard
                contents={contents}
                routes={routes}
                publishedCount={publishedContents.length + publishedRoutes.length}
                draftCount={draftContents.length + draftRoutes.length}
                routeDraft={routeDraft}
                editingRouteId={editingRouteId}
                showRouteForm={showRouteForm}
                showForm={showForm}
                draft={draft}
                editingId={editingId}
                disabled={isPending}
                onDraftChange={setDraft}
                onRouteDraftChange={setRouteDraft}
                onSave={saveContent}
                onSaveRoute={saveRoute}
                onCancel={resetForm}
                onCancelRoute={() => { setRouteDraft(emptyRouteDraft); setEditingRouteId(null); setShowRouteForm(false) }}
                onEditRoute={editRoute}
                onDeleteRoute={removeRoute}
              />
            ) : (
              <StudentHero
                recommendation={recommendation}
                activeContents={activeContents}
                completedCount={completedCount}
                totalCount={publishedContents.length + publishedResources.length}
                completionPercent={completionPercent}
                isPending={isPending}
                byContent={byContent}
                onProgress={setContentProgress}
              />
            )}

            {!isAdminMode && publishedRoutes.length > 0 ? (
              <section className="rounded-[1rem] bg-background p-4 shadow-sm ring-1 ring-border/70">
                <div className="mb-4">
                  <h2 className="text-lg font-bold tracking-tight">Rutas de aprendizaje</h2>
                  <p className="text-xs text-muted-foreground">RUTAS → CURSOS → RECURSOS. Ahora sí, una estructura con columna vertebral.</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {publishedRoutes.map((route) => (
                    <LearningRouteCard
                      key={route.id}
                      route={route}
                      isAdmin={false}
                      byContent={byContent}
                      disabled={isPending}
                      onProgress={setContentProgress}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[1rem] bg-background p-4 shadow-sm ring-1 ring-border/70">
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
    <aside className="hidden border-r bg-background px-3 py-4 md:flex md:flex-col">
      <div className="mb-6 px-2">
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
    <header className="flex flex-col gap-4 rounded-[1rem] bg-background px-4 py-3 shadow-sm ring-1 ring-border/70 lg:flex-row lg:items-center lg:justify-between">
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
    <section className="rounded-[1rem] bg-background p-4 shadow-sm ring-1 ring-border/70">
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
  routes,
  publishedCount,
  draftCount,
  showForm,
  showRouteForm,
  draft,
  routeDraft,
  editingId,
  editingRouteId,
  disabled,
  onDraftChange,
  onRouteDraftChange,
  onSave,
  onSaveRoute,
  onCancel,
  onCancelRoute,
  onEditRoute,
  onDeleteRoute,
}: {
  contents: LearningContent[]
  routes: LearningRoute[]
  publishedCount: number
  draftCount: number
  showForm: boolean
  showRouteForm: boolean
  draft: Draft
  routeDraft: RouteDraft
  editingId: string | null
  editingRouteId: string | null
  disabled: boolean
  onDraftChange: (draft: Draft) => void
  onRouteDraftChange: (draft: RouteDraft) => void
  onSave: () => void
  onSaveRoute: () => void
  onCancel: () => void
  onCancelRoute: () => void
  onEditRoute: (route: LearningRoute) => void
  onDeleteRoute: (routeId: string) => void
}) {
  const courseCount = routes.reduce((sum, route) => sum + route.courses.length, 0)
  const resourceCount = routes.reduce(
    (sum, route) => sum + route.courses.reduce((inner, course) => inner + course.resources.length, 0),
    0
  )

  return (
    <section className="space-y-4 rounded-[1rem] bg-background p-4 shadow-sm ring-1 ring-border/70">
      <div className="grid gap-3 md:grid-cols-4">
        <AdminMetric label="Rutas" value={routes.length} hint="Programas completos" />
        <AdminMetric label="Cursos" value={courseCount} hint="Dentro de rutas" />
        <AdminMetric label="Recursos" value={resourceCount + contents.length} hint="Videos, texto, quizzes" />
        <AdminMetric label="Published" value={publishedCount} hint={`${draftCount} borradores`} />
      </div>

      {showRouteForm ? (
        <RouteBuilder
          draft={routeDraft}
          editingRouteId={editingRouteId}
          disabled={disabled}
          onDraftChange={onRouteDraftChange}
          onSave={onSaveRoute}
          onCancel={onCancelRoute}
        />
      ) : showForm ? (
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
          Estás en modo maestro. La estructura nueva es <strong>RUTAS → CURSOS → RECURSOS</strong>. El admin puede crear contenido aquí y cambiar a “My courses” para consumir cursos como estudiante.
        </div>
      )}

      {routes.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {routes.map((route) => (
            <LearningRouteCard
              key={route.id}
              route={route}
              isAdmin
              byContent={new Map()}
              disabled={disabled}
              onProgress={() => undefined}
              onEdit={() => onEditRoute(route)}
              onDelete={() => onDeleteRoute(route.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function RouteBuilder({
  draft,
  editingRouteId,
  disabled,
  onDraftChange,
  onSave,
  onCancel,
}: {
  draft: RouteDraft
  editingRouteId: string | null
  disabled: boolean
  onDraftChange: (draft: RouteDraft) => void
  onSave: () => void
  onCancel: () => void
}) {
  function updateCourse(index: number, next: Partial<LearningCourse>) {
    onDraftChange({
      ...draft,
      courses: draft.courses.map((course, courseIndex) => courseIndex === index ? { ...course, ...next } : course),
    })
  }

  function updateResource(courseIndex: number, resourceIndex: number, next: Partial<LearningResource>) {
    onDraftChange({
      ...draft,
      courses: draft.courses.map((course, index) => index === courseIndex ? {
        ...course,
        resources: course.resources.map((resource, innerIndex) => innerIndex === resourceIndex ? { ...resource, ...next } : resource),
      } : course),
    })
  }

  function addCourse() {
    onDraftChange({
      ...draft,
      courses: [...draft.courses, { title: '', description: '', level: draft.level, resources: [] }],
    })
  }

  function addResource(courseIndex: number, type: LearningResourceType = 'video') {
    onDraftChange({
      ...draft,
      courses: draft.courses.map((course, index) => index === courseIndex ? {
        ...course,
        resources: [...course.resources, { title: '', type, description: '', url: '', duration: '', required: true }],
      } : course),
    })
  }

  function removeCourse(courseIndex: number) {
    onDraftChange({ ...draft, courses: draft.courses.filter((_, index) => index !== courseIndex) })
  }

  function removeResource(courseIndex: number, resourceIndex: number) {
    onDraftChange({
      ...draft,
      courses: draft.courses.map((course, index) => index === courseIndex ? {
        ...course,
        resources: course.resources.filter((_, innerIndex) => innerIndex !== resourceIndex),
      } : course),
    })
  }

  return (
    <div className="rounded-[1rem] border border-brand-accent/25 bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-accent">{editingRouteId ? 'Editando ruta' : 'Nueva ruta'}</p>
          <h3 className="text-lg font-bold tracking-tight">Constructor académico</h3>
          <p className="text-xs text-muted-foreground">Ruta → cursos → recursos: videos, texto, clases, documentos, links y quizzes.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addCourse}>+ Curso</Button>
          <Button onClick={onSave} disabled={disabled} className="rounded-full">{disabled ? 'Guardando…' : 'Guardar ruta'}</Button>
          <Button variant="outline" onClick={onCancel} disabled={disabled} className="rounded-full">Cancelar</Button>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <input value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} placeholder="Nombre de la ruta" className="w-full border-0 bg-transparent text-4xl font-black tracking-tight outline-none placeholder:text-muted-foreground/45" />
          <textarea value={draft.description} onChange={(event) => onDraftChange({ ...draft, description: event.target.value })} placeholder="Qué aprenderá el estudiante en esta ruta…" className="min-h-24 w-full resize-none rounded-2xl border bg-muted/30 p-3 text-sm outline-none focus:border-brand-accent" />

          {draft.courses.map((course, courseIndex) => (
            <div key={course.id ?? `course-${courseIndex}`} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-start gap-2">
                <div className="mt-1 rounded-full bg-brand-accent/15 px-2 py-1 text-xs font-bold text-brand-accent">Curso {courseIndex + 1}</div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input value={course.title} onChange={(event) => updateCourse(courseIndex, { title: event.target.value })} placeholder="Título del curso" />
                  <textarea value={course.description} onChange={(event) => updateCourse(courseIndex, { description: event.target.value })} placeholder="Descripción corta del curso" className="min-h-16 w-full resize-none rounded-xl border bg-background p-2 text-xs outline-none focus:border-brand-accent" />
                </div>
                <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => removeCourse(courseIndex)}><Trash2 className="size-4" /></Button>
              </div>

              <div className="space-y-2">
                {course.resources.map((resource, resourceIndex) => (
                  <div key={resource.id ?? `resource-${courseIndex}-${resourceIndex}`} className="grid gap-2 rounded-xl bg-muted/35 p-3 md:grid-cols-[120px_minmax(0,1fr)_150px_auto] md:items-center">
                    <NativeSelect value={resource.type} onChange={(value) => updateResource(courseIndex, resourceIndex, { type: value as LearningResourceType })}>
                      {LEARNING_RESOURCE_TYPES.map((type) => <option key={type} value={type}>{LEARNING_RESOURCE_TYPE_LABELS[type]}</option>)}
                    </NativeSelect>
                    <Input value={resource.title} onChange={(event) => updateResource(courseIndex, resourceIndex, { title: event.target.value })} placeholder="Título del recurso" />
                    <Input value={resource.duration ?? ''} onChange={(event) => updateResource(courseIndex, resourceIndex, { duration: event.target.value })} placeholder="Duración" />
                    <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => removeResource(courseIndex, resourceIndex)}><Trash2 className="size-4" /></Button>
                    <textarea value={resource.description} onChange={(event) => updateResource(courseIndex, resourceIndex, { description: event.target.value })} placeholder="Texto, instrucciones o resumen de la clase" className="min-h-16 rounded-xl border bg-background p-2 text-xs outline-none focus:border-brand-accent md:col-span-2" />
                    <Input value={resource.url ?? ''} onChange={(event) => updateResource(courseIndex, resourceIndex, { url: event.target.value })} placeholder="https:// video/doc/link" className="md:col-span-2" />
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-1">
                  {LEARNING_RESOURCE_TYPES.map((type) => (
                    <Button key={type} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => addResource(courseIndex, type)}>
                      + {LEARNING_RESOURCE_TYPE_LABELS[type]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-4 rounded-2xl bg-muted/25 p-4">
          <Field label="Categoría">
            <Input value={draft.category} onChange={(event) => onDraftChange({ ...draft, category: event.target.value })} placeholder="Onboarding, Ventas, Producto…" />
          </Field>
          <Field label="Nivel">
            <NativeSelect value={draft.level} onChange={(value) => onDraftChange({ ...draft, level: value as LearningLevel })}>
              {LEARNING_LEVELS.map((level) => <option key={level} value={level}>{LEARNING_LEVEL_LABELS[level]}</option>)}
            </NativeSelect>
          </Field>
          <label className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
            <span>Publicado</span>
            <input type="checkbox" checked={draft.published} onChange={(event) => onDraftChange({ ...draft, published: event.target.checked })} className="accent-[var(--brand-accent)]" />
          </label>
          <div className="rounded-xl border bg-background p-3 text-xs text-muted-foreground">
            Este bloque separa el rol de maestro del rol de estudiante. Mismo usuario, dos sombreros. No magia. Solo orden.
          </div>
        </aside>
      </div>
    </div>
  )
}

function LearningRouteCard({
  route,
  isAdmin,
  byContent,
  disabled,
  onProgress,
  onEdit,
  onDelete,
}: {
  route: LearningRoute
  isAdmin: boolean
  byContent: Map<string, LearningProgressStatus>
  disabled: boolean
  onProgress: (contentId: string, status: LearningProgressStatus) => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const resources = route.courses.flatMap((course) => course.resources)
  const completed = resources.filter((resource) => byContent.get(resource.id) === 'completado').length
  const percent = pct(completed, resources.length)

  return (
    <article className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/70">
      <div className="bg-gradient-to-br from-brand-accent/30 via-brand-accent/10 to-muted p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2 bg-background/70">{route.category}</Badge>
            <h3 className="text-lg font-black tracking-tight">{route.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{route.description || 'Ruta sin descripción.'}</p>
          </div>
          {!route.published ? <Badge variant="destructive">Draft</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>{route.courses.length} cursos</span>
          <span>•</span>
          <span>{resources.length} recursos</span>
          <span>•</span>
          <span>{LEARNING_LEVEL_LABELS[route.level]}</span>
        </div>
        {!isAdmin ? <div className="mt-3"><ProgressBar value={percent} /></div> : null}
      </div>

      <div className="space-y-3 p-4">
        {route.courses.map((course, courseIndex) => (
          <div key={course.id} className="rounded-xl border bg-background p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-accent">Curso {courseIndex + 1}</p>
                <h4 className="font-semibold">{course.title || 'Curso sin título'}</h4>
                {course.description ? <p className="text-xs text-muted-foreground">{course.description}</p> : null}
              </div>
              <Badge variant="outline">{course.resources.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {course.resources.map((resource) => {
                const status = byContent.get(resource.id) ?? 'pendiente'
                const Icon = resource.type === 'video' || resource.type === 'clase' ? PlayCircle : resource.type === 'documento' || resource.type === 'texto' ? FileText : resource.type === 'link' ? ExternalLink : ClipboardList
                return (
                  <div key={resource.id} className="flex items-center gap-2 rounded-lg bg-muted/35 px-2 py-2 text-xs">
                    <Icon className="size-4 text-brand-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{resource.title || LEARNING_RESOURCE_TYPE_LABELS[resource.type]}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{LEARNING_RESOURCE_TYPE_LABELS[resource.type]}{resource.duration ? ` · ${resource.duration}` : ''}</div>
                    </div>
                    {resource.url ? <a href={resource.url} target="_blank" rel="noreferrer" className="text-brand-accent hover:underline">Abrir</a> : null}
                    {!isAdmin ? (
                      <Button size="sm" variant={status === 'completado' ? 'default' : 'outline'} className="h-7 rounded-full px-3 text-[11px]" disabled={disabled} onClick={() => onProgress(resource.id, status === 'completado' ? 'completado' : 'completado')}>
                        {status === 'completado' ? 'Listo' : 'Completar'}
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {isAdmin ? (
          <div className="flex gap-2 border-t pt-3">
            <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={onEdit}><Edit3 className="size-3" /> Editar ruta</Button>
            <Button variant="outline" size="sm" className="rounded-full text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="size-3" /></Button>
          </div>
        ) : null}
      </div>
    </article>
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
  function appendBlock(block: string) {
    const nextDescription = draft.description.trim()
      ? `${draft.description.trim()}\n\n${block}`
      : block
    onDraftChange({ ...draft, description: nextDescription })
  }

  return (
    <div className="rounded-[1rem] border border-brand-accent/25 bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-accent">{editingId ? 'Editando lección' : 'Nueva lección'}</p>
          <h3 className="text-lg font-bold tracking-tight">Editor tipo documento</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => appendBlock('Objetivo de aprendizaje: ')}>
            + Objetivo
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => appendBlock('Paso 1: ')}>
            + Paso
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => appendBlock('Nota importante: ')}>
            + Nota
          </Button>
        </div>
      </div>

      <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="px-5 py-5 md:px-8">
          <input
            value={draft.title}
            onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            placeholder="Título de la lección"
            className="w-full border-0 bg-transparent text-4xl font-black tracking-tight outline-none placeholder:text-muted-foreground/45 md:text-5xl"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="bg-brand-accent/15 text-foreground ring-1 ring-brand-accent/20" variant="secondary">
              {draft.category || 'Sin ruta'}
            </Badge>
            <Badge variant="outline">{LEARNING_TYPE_LABELS[draft.type]}</Badge>
            <Badge variant="outline">{LEARNING_LEVEL_LABELS[draft.level]}</Badge>
            {draft.duration ? <Badge variant="outline">{draft.duration}</Badge> : null}
          </div>

          <NotionLikeBodyEditor
            value={draft.description}
            onChange={(description) => onDraftChange({ ...draft, description })}
          />
        </div>

        <aside className="border-t bg-muted/25 p-4 lg:border-l lg:border-t-0">
          <div className="sticky top-4 space-y-4">
            <div>
              <h4 className="font-semibold">Propiedades</h4>
              <p className="text-xs text-muted-foreground">Metadata de catálogo. El contenido se edita directo a la izquierda.</p>
            </div>

            <Field label="Ruta / categoría">
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
            <Field label="Duración">
              <Input value={draft.duration ?? ''} onChange={(event) => onDraftChange({ ...draft, duration: event.target.value })} placeholder="45 min, 2 h, 3 módulos…" />
            </Field>
            <Field label="Recurso externo opcional">
              <Input value={draft.url ?? ''} onChange={(event) => onDraftChange({ ...draft, url: event.target.value })} placeholder="https://…" />
            </Field>

            <label className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
              <span>Publicado</span>
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(event) => onDraftChange({ ...draft, published: event.target.checked })}
                className="accent-[var(--brand-accent)]"
              />
            </label>

            <div className="flex gap-2 pt-2">
              <Button onClick={onSave} disabled={disabled} className="flex-1 rounded-full">
                {disabled ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={disabled} className="rounded-full">Cancelar</Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function NotionLikeBodyEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="mt-8 flex gap-3">
      <div className="hidden pt-2 text-muted-foreground md:block">⋮⋮</div>
      <div
        key="lesson-body-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Cuerpo de la lección"
        data-placeholder="Escribí la lección aquí. Enter para nuevos bloques. Sin markdown, sin preview, edición directa."
        className="min-h-[340px] flex-1 whitespace-pre-wrap rounded-xl border border-transparent px-2 py-1 text-base leading-8 outline-none transition empty:before:pointer-events-none empty:before:text-muted-foreground/55 empty:before:content-[attr(data-placeholder)] focus:border-brand-accent/25 focus:bg-brand-accent/5"
        onInput={(event) => onChange(event.currentTarget.innerText)}
        onBlur={(event) => onChange(event.currentTarget.innerText)}
      >
        {value}
      </div>
    </div>
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
