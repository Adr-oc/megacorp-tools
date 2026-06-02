'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Clock3,
  Flame,
  FolderKanban,
  Lightbulb,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  addComment,
  createIdea,
  deleteIdea,
  toggleVote,
  updateIdeaStatus,
} from '@/lib/ideas-board/actions'
import {
  IDEA_CATEGORIES,
  IDEA_STATUSES,
  type Idea,
  type IdeaCategory,
  type IdeaStatus,
  type IdeasBoardView,
} from '@/lib/ideas-board/schema'

type Props = {
  initialBoard: IdeasBoardView
}

type SortMode = 'hot' | 'new' | 'comments' | 'status'
type StatusFilter = 'todos' | IdeaStatus

const statusLabels: Record<IdeaStatus, string> = {
  abierta: 'Abierta',
  'en revisión': 'En revisión',
  planificada: 'Planificada',
  resuelta: 'Resuelta',
}

const statusDescriptions: Record<IdeaStatus, string> = {
  abierta: 'Recibiendo votos y comentarios',
  'en revisión': 'El equipo la está evaluando',
  planificada: 'Entró al mapa de trabajo',
  resuelta: 'Ya fue atendida o cerrada',
}

const statusClassName: Record<IdeaStatus, string> = {
  abierta: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  'en revisión': 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
  planificada: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300',
  resuelta: 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',
}

const categoryAccent: Record<IdeaCategory, string> = {
  Sistemas: 'from-sky-500/20 to-cyan-500/10 text-sky-700 dark:text-sky-300',
  'Errores de Odoo': 'from-orange-500/20 to-amber-500/10 text-orange-700 dark:text-orange-300',
  'Errores de Sistema': 'from-rose-500/20 to-red-500/10 text-rose-700 dark:text-rose-300',
  'Ideas de actividades': 'from-fuchsia-500/20 to-pink-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  'Empresa en general': 'from-emerald-500/20 to-lime-500/10 text-emerald-700 dark:text-emerald-300',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function relativeDate(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  return formatDate(value)
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'
}

export function IdeasBoard({ initialBoard }: Props) {
  const [board, setBoard] = useState(initialBoard)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<IdeaCategory>(IDEA_CATEGORIES[0])
  const [selectedCategory, setSelectedCategory] = useState<'todas' | IdeaCategory>('todas')
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('todos')
  const [sortMode, setSortMode] = useState<SortMode>('hot')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const stats = useMemo(() => {
    const totalVotes = board.ideas.reduce((total, idea) => total + idea.votes.length, 0)
    const totalComments = board.ideas.reduce((total, idea) => total + idea.comments.length, 0)
    const activeIdeas = board.ideas.filter((idea) => idea.status !== 'resuelta').length
    const topIdea = [...board.ideas].sort((a, b) => b.votes.length - a.votes.length)[0]
    const contributors = new Set([
      ...board.ideas.map((idea) => idea.authorId),
      ...board.ideas.flatMap((idea) => idea.comments.map((comment) => comment.authorId)),
    ]).size

    return { totalVotes, totalComments, activeIdeas, topIdea, contributors }
  }, [board.ideas])

  const categoryStats = useMemo(() => {
    return IDEA_CATEGORIES.map((item) => {
      const ideas = board.ideas.filter((idea) => idea.category === item)
      return {
        name: item,
        count: ideas.length,
        votes: ideas.reduce((total, idea) => total + idea.votes.length, 0),
        open: ideas.filter((idea) => idea.status !== 'resuelta').length,
      }
    })
  }, [board.ideas])

  const ideas = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return board.ideas
      .filter((idea) => selectedCategory === 'todas' || idea.category === selectedCategory)
      .filter((idea) => selectedStatus === 'todos' || idea.status === selectedStatus)
      .filter((idea) => {
        if (!needle) return true
        return [idea.title, idea.description, idea.category, idea.authorName]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => {
        if (sortMode === 'new') return b.createdAt.localeCompare(a.createdAt)
        if (sortMode === 'comments') return b.comments.length - a.comments.length || b.updatedAt.localeCompare(a.updatedAt)
        if (sortMode === 'status') return IDEA_STATUSES.indexOf(a.status) - IDEA_STATUSES.indexOf(b.status)
        return b.votes.length * 3 + b.comments.length - (a.votes.length * 3 + a.comments.length) || b.createdAt.localeCompare(a.createdAt)
      })
  }, [board.ideas, query, selectedCategory, selectedStatus, sortMode])

  function applyResult(result: Awaited<ReturnType<typeof createIdea>>, success: string) {
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setBoard(result.board)
    toast.success(success)
  }

  function onCreate() {
    startTransition(async () => {
      const result = await createIdea({ title, description, category })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setBoard(result.board)
      setTitle('')
      setDescription('')
      setCategory(IDEA_CATEGORIES[0])
      toast.success('Tema publicado en el foro')
    })
  }

  function onVote(ideaId: string) {
    startTransition(async () => {
      const result = await toggleVote({ ideaId })
      applyResult(result, 'Voto actualizado')
    })
  }

  function onComment(ideaId: string) {
    const body = commentDrafts[ideaId] ?? ''
    startTransition(async () => {
      const result = await addComment({ ideaId, body })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setBoard(result.board)
      setCommentDrafts((current) => ({ ...current, [ideaId]: '' }))
      setExpanded((current) => ({ ...current, [ideaId]: true }))
      toast.success('Respuesta agregada')
    })
  }

  function onStatus(ideaId: string, status: IdeaStatus) {
    startTransition(async () => {
      const result = await updateIdeaStatus({ ideaId, status })
      applyResult(result, 'Estado actualizado')
    })
  }

  function onDelete(ideaId: string) {
    startTransition(async () => {
      const result = await deleteIdea({ ideaId })
      applyResult(result, 'Tema eliminado')
    })
  }

  function onOpenTopIdea() {
    const ideaId = stats.topIdea?.id
    if (!ideaId) return
    setExpanded((current) => ({ ...current, [ideaId]: true }))
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_top_left,hsl(var(--brand-accent)/0.18),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.55))] p-5 shadow-sm md:p-7">
        <div className="absolute right-6 top-6 hidden rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur md:block">
          Comunidad interna · ideas, bugs y mejoras
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <MessageSquareText className="size-3.5 text-brand-accent" />
              Foro MEGACORP
            </div>
            <div className="space-y-2">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
                Ideas, problemas y mejoras con orden. No gritos en el vacío.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Publicá temas, votá prioridades, comentá contexto y seguí cada propuesta por estado.
                El objetivo: convertir ruido operativo en decisiones visibles.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={FolderKanban} label="Temas" value={board.ideas.length.toString()} />
              <Metric icon={TrendingUp} label="Votos" value={stats.totalVotes.toString()} />
              <Metric icon={MessageCircle} label="Respuestas" value={stats.totalComments.toString()} />
              <Metric icon={Users} label="Participantes" value={stats.contributors.toString()} />
            </div>
          </div>
          <Card className="border-brand-accent/20 bg-background/75 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="size-4 text-brand-accent" /> Tema destacado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topIdea ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{stats.topIdea.category}</Badge>
                    <Badge className={cn('ring-1', statusClassName[stats.topIdea.status])}>
                      {statusLabels[stats.topIdea.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="line-clamp-2 text-base font-semibold">{stats.topIdea.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stats.topIdea.votes.length} votos · {stats.topIdea.comments.length} respuestas · {relativeDate(stats.topIdea.updatedAt)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={onOpenTopIdea}>
                    Ver conversación
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Todavía no hay temas. Excelente oportunidad para ser el primer sospechoso.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)_300px]">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="size-4" /> Nuevo tema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={title}
                maxLength={120}
                placeholder="Título claro: qué pasa o qué proponés"
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                value={description}
                maxLength={2000}
                rows={7}
                placeholder="Contexto, impacto, ejemplo, propuesta. Mientras más claro, menos telepatía corporativa."
                className="w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                onChange={(event) => setDescription(event.target.value)}
              />
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                Categoría
                <select
                  value={category}
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  onChange={(event) => setCategory(event.target.value as IdeaCategory)}
                >
                  {IDEA_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                Buen formato: problema → evidencia → impacto → solución sugerida. Reddit, pero con nómina.
              </div>
              <Button
                className="h-10 w-full"
                disabled={isPending || !title.trim() || !description.trim()}
                onClick={onCreate}
              >
                Publicar tema
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4" /> Categorías
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <CategoryButton
                active={selectedCategory === 'todas'}
                name="Todas"
                count={board.ideas.length}
                votes={stats.totalVotes}
                onClick={() => setSelectedCategory('todas')}
              />
              {categoryStats.map((item) => (
                <CategoryButton
                  key={item.name}
                  active={selectedCategory === item.name}
                  name={item.name}
                  count={item.count}
                  votes={item.votes}
                  accent={categoryAccent[item.name]}
                  onClick={() => setSelectedCategory(item.name)}
                />
              ))}
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0 space-y-4">
          <Card className="bg-card/80">
            <CardContent className="space-y-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    className="h-10 pl-9"
                    placeholder="Buscar por título, descripción, categoría o autor…"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={selectedStatus}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    onChange={(event) => setSelectedStatus(event.target.value as StatusFilter)}
                  >
                    <option value="todos">Todos los estados</option>
                    {IDEA_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sortMode}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                  >
                    <option value="hot">Más relevantes</option>
                    <option value="new">Más recientes</option>
                    <option value="comments">Más comentados</option>
                    <option value="status">Por estado</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterPill active={selectedStatus === 'todos'} label="Todos" onClick={() => setSelectedStatus('todos')} />
                {IDEA_STATUSES.map((status) => (
                  <FilterPill
                    key={status}
                    active={selectedStatus === status}
                    label={statusLabels[status]}
                    onClick={() => setSelectedStatus(status)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
            <span>
              {ideas.length} tema{ideas.length === 1 ? '' : 's'} encontrado{ideas.length === 1 ? '' : 's'}
            </span>
            <span className="hidden sm:inline">Orden: {sortLabel(sortMode)}</span>
          </div>

          {ideas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground">
                <div className="rounded-3xl bg-muted p-5">
                  <Lightbulb className="size-12 opacity-50" />
                </div>
                <div>
                  <p className="font-medium text-foreground">No hay temas con estos filtros</p>
                  <p>Ajustá búsqueda, estado o categoría. O publicá algo mejor que el silencio.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {ideas.map((idea, index) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  rank={index + 1}
                  currentUserId={board.currentUserId}
                  canModerate={board.canModerate}
                  expanded={expanded[idea.id] ?? false}
                  commentDraft={commentDrafts[idea.id] ?? ''}
                  disabled={isPending}
                  onToggleExpanded={() =>
                    setExpanded((current) => ({ ...current, [idea.id]: !(current[idea.id] ?? false) }))
                  }
                  onCommentDraft={(body) =>
                    setCommentDrafts((current) => ({ ...current, [idea.id]: body }))
                  }
                  onVote={() => onVote(idea.id)}
                  onComment={() => onComment(idea.id)}
                  onStatus={(status) => onStatus(idea.id, status)}
                  onDelete={() => onDelete(idea.id)}
                />
              ))}
            </div>
          )}
        </main>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4" /> Estados del foro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {IDEA_STATUSES.map((status) => {
                const count = board.ideas.filter((idea) => idea.status === status).length
                return (
                  <div key={status} className="rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={cn('ring-1', statusClassName[status])}>{statusLabels[status]}</Badge>
                      <span className="text-sm font-semibold tabular-nums">{count}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{statusDescriptions[status]}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4" /> Reglas útiles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <Rule number="01" text="Un tema por problema. Mezclar cinco incendios crea sopa, no foro." />
              <Rule number="02" text="Votá por impacto real, no por cariño al autor. Democracia mínimamente funcional." />
              <Rule number="03" text="Comentá con evidencia: captura, ejemplo, área afectada o frecuencia." />
              <Rule number="04" text="Los admins mueven estados; el historial queda visible en el hilo." />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

type MetricProps = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <div className="rounded-2xl border bg-background/75 p-3 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <Icon className="size-4 text-brand-accent" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

type CategoryButtonProps = {
  active: boolean
  name: string
  count: number
  votes: number
  accent?: string
  onClick: () => void
}

function CategoryButton({ active, name, count, votes, accent, onClick }: CategoryButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-xl border p-3 text-left transition hover:bg-muted/60',
        active ? 'border-brand-accent bg-brand-accent/10 shadow-sm' : 'bg-background/40',
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('size-2.5 rounded-full bg-gradient-to-br from-muted-foreground to-muted', accent)} />
          <span className="truncate text-sm font-medium">{name}</span>
        </div>
        <Badge variant={active ? 'default' : 'secondary'}>{count}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{votes} votos acumulados</p>
    </button>
  )
}

type FilterPillProps = {
  active: boolean
  label: string
  onClick: () => void
}

function FilterPill({ active, label, onClick }: FilterPillProps) {
  return (
    <Button size="sm" variant={active ? 'default' : 'outline'} onClick={onClick}>
      {label}
    </Button>
  )
}

function sortLabel(sortMode: SortMode) {
  if (sortMode === 'new') return 'más recientes'
  if (sortMode === 'comments') return 'más comentados'
  if (sortMode === 'status') return 'estado'
  return 'más relevantes'
}

type RuleProps = {
  number: string
  text: string
}

function Rule({ number, text }: RuleProps) {
  return (
    <div className="flex gap-3 rounded-xl border bg-muted/20 p-3">
      <span className="font-mono text-xs font-semibold text-brand-accent">{number}</span>
      <p className="leading-5">{text}</p>
    </div>
  )
}

type IdeaCardProps = {
  idea: Idea
  rank: number
  currentUserId: string
  canModerate: boolean
  expanded: boolean
  commentDraft: string
  disabled: boolean
  onVote: () => void
  onToggleExpanded: () => void
  onCommentDraft: (value: string) => void
  onComment: () => void
  onStatus: (status: IdeaStatus) => void
  onDelete: () => void
}

function IdeaCard({
  idea,
  rank,
  currentUserId,
  canModerate,
  expanded,
  commentDraft,
  disabled,
  onVote,
  onToggleExpanded,
  onCommentDraft,
  onComment,
  onStatus,
  onDelete,
}: IdeaCardProps) {
  const voted = idea.votes.includes(currentUserId)
  const score = idea.votes.length * 3 + idea.comments.length

  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-0">
        <article className="grid grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[88px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-2 border-r bg-muted/30 px-2 py-5">
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-foreground/10">
              #{rank}
            </span>
            <Button
              size="icon-lg"
              variant={voted ? 'default' : 'outline'}
              disabled={disabled}
              aria-label={voted ? 'Quitar voto' : 'Votar'}
              onClick={onVote}
            >
              <ArrowUp />
            </Button>
            <span className="text-2xl font-bold tabular-nums">{idea.votes.length}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">votos</span>
            <div className="mt-2 hidden rounded-lg bg-background px-2 py-1 text-center text-[11px] text-muted-foreground ring-1 ring-foreground/10 md:block">
              score<br />{score}
            </div>
          </div>

          <div className="min-w-0 space-y-4 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="max-w-full truncate">{idea.category}</Badge>
                  <Badge className={cn('ring-1', statusClassName[idea.status])}>
                    {statusLabels[idea.status]}
                  </Badge>
                  {idea.votes.length >= 3 ? (
                    <Badge className="bg-brand-accent/10 text-brand-accent ring-1 ring-brand-accent/20">
                      <Flame className="size-3" /> Popular
                    </Badge>
                  ) : null}
                </div>
                <button type="button" className="block text-left" onClick={onToggleExpanded}>
                  <h2 className="text-xl font-semibold leading-tight tracking-tight transition group-hover:text-brand-accent">
                    {idea.title}
                  </h2>
                </button>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand-accent/10 text-[10px] font-semibold text-brand-accent ring-1 ring-brand-accent/20">
                      {initials(idea.authorName)}
                    </span>
                    {idea.authorName}
                  </span>
                  <span>·</span>
                  <span title={formatDate(idea.createdAt)}>{relativeDate(idea.createdAt)}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> actualizado {relativeDate(idea.updatedAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canModerate ? (
                  <>
                    <select
                      value={idea.status}
                      className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      disabled={disabled}
                      onChange={(event) => onStatus(event.target.value as IdeaStatus)}
                    >
                      {IDEA_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      disabled={disabled}
                      aria-label="Borrar tema"
                      onClick={onDelete}
                    >
                      <Trash2 />
                    </Button>
                  </>
                ) : (
                  <MoreHorizontal className="size-4 text-muted-foreground" />
                )}
              </div>
            </div>

            <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {idea.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" /> {idea.comments.length} respuestas</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" /> {statusDescriptions[idea.status]}</span>
              </div>
              <Button size="sm" variant={expanded ? 'secondary' : 'outline'} onClick={onToggleExpanded}>
                <MessageCircle />
                {expanded ? 'Ocultar hilo' : 'Abrir hilo'}
              </Button>
            </div>

            {expanded ? (
              <div className="space-y-4 rounded-2xl border bg-muted/20 p-3 md:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Conversación</p>
                    <p className="text-xs text-muted-foreground">Respuestas, contexto y seguimiento del tema.</p>
                  </div>
                  <Badge variant="secondary">{idea.comments.length}</Badge>
                </div>

                {idea.comments.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
                    Todavía no hay respuestas. Podés agregar la primera y arruinar el récord de silencio.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {idea.comments.map((comment) => (
                      <div key={comment.id} className="grid grid-cols-[32px_1fr] gap-3 rounded-xl bg-background p-3 ring-1 ring-foreground/10">
                        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {initials(comment.authorName)}
                        </span>
                        <div className="min-w-0 text-sm">
                          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <strong className="text-foreground">{comment.authorName}</strong>
                            <span>·</span>
                            <span title={formatDate(comment.createdAt)}>{relativeDate(comment.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-6">{comment.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Input
                    value={commentDraft}
                    placeholder="Responder al hilo…"
                    disabled={disabled}
                    onChange={(event) => onCommentDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey && commentDraft.trim()) {
                        event.preventDefault()
                        onComment()
                      }
                    }}
                  />
                  <Button disabled={disabled || !commentDraft.trim()} onClick={onComment}>
                    <Send />
                    Responder
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </article>
      </CardContent>
    </Card>
  )
}
