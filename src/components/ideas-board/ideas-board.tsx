'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ChevronUp,
  MessageCircle,
  Send,
  Trash2,
  Lightbulb,
  Plus,
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

const statusLabels: Record<IdeaStatus, string> = {
  abierta: 'Abierta',
  'en revisión': 'En revisión',
  planificada: 'Planificada',
  resuelta: 'Resuelta',
}

const statusClassName: Record<IdeaStatus, string> = {
  abierta: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'en revisión': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  planificada: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  resuelta: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function IdeasBoard({ initialBoard }: Props) {
  const [board, setBoard] = useState(initialBoard)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<IdeaCategory>(IDEA_CATEGORIES[0])
  const [selectedCategory, setSelectedCategory] = useState<'todas' | IdeaCategory>('todas')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const ideas = useMemo(() => {
    if (selectedCategory === 'todas') return board.ideas
    return board.ideas.filter((idea) => idea.category === selectedCategory)
  }, [board.ideas, selectedCategory])

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
      toast.success('Propuesta publicada')
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
      toast.success('Comentario agregado')
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
      applyResult(result, 'Propuesta eliminada')
    })
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="size-7 text-brand-accent" />
            <h1 className="text-2xl font-bold">Foro de ideas</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Proponé mejoras, votá lo más útil y seguí el estado de las ideas del equipo.
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2 text-sm">
          <strong>{board.ideas.length}</strong> propuestas ·{' '}
          <strong>{board.ideas.reduce((total, idea) => total + idea.votes.length, 0)}</strong> votos
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="size-4" /> Nueva propuesta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={title}
                maxLength={120}
                placeholder="Título breve"
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                value={description}
                maxLength={2000}
                rows={5}
                placeholder="Describí el problema, idea o beneficio esperado…"
                className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                onChange={(event) => setDescription(event.target.value)}
              />
              <select
                value={category}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                onChange={(event) => setCategory(event.target.value as IdeaCategory)}
              >
                {IDEA_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <Button
                className="w-full"
                disabled={isPending || !title.trim() || !description.trim()}
                onClick={onCreate}
              >
                Publicar idea
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categorías</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategory === 'todas' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('todas')}
              >
                Todas
              </Button>
              {IDEA_CATEGORIES.map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={selectedCategory === item ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(item)}
                >
                  {item}
                </Button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-3">
          {ideas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                <Lightbulb className="size-12 opacity-40" />
                <div>
                  <p className="font-medium text-foreground">Aún no hay propuestas</p>
                  <p>Publicá la primera idea para que el equipo pueda votar y comentar.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            ideas.map((idea, index) => (
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
            ))
          )}
        </main>
      </div>
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

  return (
    <Card>
      <CardContent className="p-0">
        <article className="grid grid-cols-[64px_1fr] gap-0">
          <div className="flex flex-col items-center gap-2 border-r bg-muted/30 px-2 py-4">
            <span className="text-xs font-medium text-muted-foreground">#{rank}</span>
            <Button
              size="icon-sm"
              variant={voted ? 'default' : 'outline'}
              disabled={disabled}
              aria-label={voted ? 'Quitar voto' : 'Votar'}
              onClick={onVote}
            >
              <ChevronUp />
            </Button>
            <span className="text-lg font-bold tabular-nums">{idea.votes.length}</span>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{idea.category}</Badge>
                  <Badge className={cn('border-transparent', statusClassName[idea.status])}>
                    {statusLabels[idea.status]}
                  </Badge>
                </div>
                <h2 className="text-lg font-semibold leading-tight">{idea.title}</h2>
              </div>
              {canModerate ? (
                <div className="flex items-center gap-2">
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
                    aria-label="Borrar propuesta"
                    onClick={onDelete}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </div>

            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {idea.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Por <strong className="text-foreground">{idea.authorName}</strong> · {formatDate(idea.createdAt)}
              </span>
              <Button size="sm" variant="ghost" onClick={onToggleExpanded}>
                <MessageCircle />
                {idea.comments.length} comentario{idea.comments.length === 1 ? '' : 's'}
              </Button>
            </div>

            {expanded ? (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                {idea.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todavía no hay comentarios.</p>
                ) : (
                  <div className="space-y-3">
                    {idea.comments.map((comment) => (
                      <div key={comment.id} className="rounded-lg bg-background p-3 text-sm">
                        <div className="mb-1 text-xs text-muted-foreground">
                          <strong className="text-foreground">{comment.authorName}</strong> ·{' '}
                          {formatDate(comment.createdAt)}
                        </div>
                        <p className="whitespace-pre-wrap leading-6">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={commentDraft}
                    placeholder="Sumar comentario…"
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
                    Enviar
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
