'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  Archive,
  BookOpen,
  Copy,
  FileText,
  Hash,
  Heading2,
  LayoutPanelLeft,
  ListChecks,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Tags,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  deleteNotasPage,
  duplicateNotasPage,
  getNotasWorkspace,
  saveNotasPage,
  toggleNotasFavorite,
} from '@/lib/notas/actions'
import { NOTAS_TEMPLATES, type NotasPage } from '@/lib/notas/schema'
import { cn } from '@/lib/utils'

type DraftPage = {
  id?: string
  title: string
  icon: string
  tagsText: string
  content: string
}

const EMPTY_DRAFT: DraftPage = {
  title: 'Nueva página',
  icon: '📝',
  tagsText: '',
  content: '',
}

const QUICK_BLOCKS = [
  { label: 'Título', icon: Heading2, text: '\n## Nuevo título\n\n' },
  { label: 'Checklist', icon: ListChecks, text: '\n- [ ] Pendiente\n- [ ] Responsable — fecha\n' },
  { label: 'Decisión', icon: Sparkles, text: '\n## Decisión\n\n**Contexto:** \n\n**Decisión:** \n\n**Próximo paso:** \n' },
  { label: 'Tabla simple', icon: LayoutPanelLeft, text: '\n## Tabla\n\n| Campo | Valor |\n| --- | --- |\n| Responsable |  |\n| Estado |  |\n' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function relativeDate(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}

function pageToDraft(page: NotasPage): DraftPage {
  return { id: page.id, title: page.title, icon: page.icon, tagsText: page.tags.join(', '), content: page.content }
}

function draftFromTemplate(template: (typeof NOTAS_TEMPLATES)[number]): DraftPage {
  return { title: template.title, icon: template.icon, tagsText: template.tags.join(', '), content: template.content }
}

export function Notas() {
  const [pages, setPages] = useState<NotasPage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPage>(EMPTY_DRAFT)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [userId, setUserId] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [message, setMessage] = useState('Cargando workspace…')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let mounted = true
    startTransition(async () => {
      const result = await getNotasWorkspace()
      if (!mounted) return
      if (result.ok) {
        const loadedPages = result.data.workspace.pages
          .filter((page) => !page.archived)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        setPages(loadedPages)
        setUserId(result.data.userId)
        setCanDelete(result.data.canDelete)
        if (loadedPages[0]) {
          setSelectedId(loadedPages[0].id)
          setDraft(pageToDraft(loadedPages[0]))
        } else {
          setSelectedId(null)
          setDraft(EMPTY_DRAFT)
        }
        setMessage('')
      } else {
        setMessage(result.error)
      }
    })
    return () => { mounted = false }
  }, [])

  const filteredPages = useMemo(() => {
    const term = query.trim().toLowerCase()
    const visible = [...pages].sort((a, b) => {
      const aFav = userId ? a.favoriteBy.includes(userId) : false
      const bFav = userId ? b.favoriteBy.includes(userId) : false
      if (aFav !== bFav) return aFav ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    if (!term) return visible
    return visible.filter((page) => [page.title, page.content, page.tags.join(' ')].join(' ').toLowerCase().includes(term))
  }, [pages, query, userId])

  const selectedPage = selectedId ? pages.find((page) => page.id === selectedId) : undefined
  const favoritePages = userId ? pages.filter((page) => page.favoriteBy.includes(userId)).length : 0
  const tags = draft.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean)
  const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0
  const sectionCount = draft.content.split('\n').filter((line) => line.trim().startsWith('##')).length

  function selectPage(page: NotasPage) {
    setSelectedId(page.id)
    setDraft(pageToDraft(page))
    setMessage('')
  }

  function updateSavedPage(page: NotasPage) {
    setPages((current) => {
      const exists = current.some((item) => item.id === page.id)
      const next = exists ? current.map((item) => (item.id === page.id ? page : item)) : [page, ...current]
      return next.filter((item) => !item.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    })
    setSelectedId(page.id)
    setDraft(pageToDraft(page))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveNotasPage({ id: draft.id, title: draft.title, icon: draft.icon || '📝', content: draft.content, tags })
      if (result.ok) {
        updateSavedPage(result.data)
        setMessage('Página guardada')
        toast.success('Página guardada')
      } else {
        setMessage(result.error)
        toast.error(result.error)
      }
    })
  }

  function handleFavorite(page: NotasPage) {
    startTransition(async () => {
      const result = await toggleNotasFavorite({ id: page.id })
      if (result.ok) {
        updateSavedPage(result.data)
        toast.success(result.data.favoriteBy.includes(userId ?? '') ? 'Favorita marcada' : 'Favorita quitada')
      } else toast.error(result.error)
    })
  }

  function handleDuplicate(page: NotasPage) {
    startTransition(async () => {
      const result = await duplicateNotasPage({ id: page.id })
      if (result.ok) {
        updateSavedPage(result.data)
        toast.success('Página duplicada')
      } else toast.error(result.error)
    })
  }

  function handleDelete(page: NotasPage) {
    if (!canDelete) return
    startTransition(async () => {
      const result = await deleteNotasPage({ id: page.id })
      if (result.ok) {
        const remaining = pages.filter((item) => item.id !== page.id)
        setPages(remaining)
        const next = remaining[0]
        setSelectedId(next?.id ?? null)
        setDraft(next ? pageToDraft(next) : EMPTY_DRAFT)
        toast.success('Página archivada')
      } else toast.error(result.error)
    })
  }

  function newPage(from?: DraftPage) {
    setSelectedId(null)
    setDraft(from ?? EMPTY_DRAFT)
    setView('edit')
    setMessage('Nueva página lista')
  }

  function insertBlock(text: string) {
    setDraft((current) => ({ ...current, content: `${current.content}${text}` }))
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="grid min-h-[calc(100vh-8rem)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className="border-r bg-muted/20">
          <div className="space-y-4 border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-accent/10 text-2xl">🗒️</div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">NOTAS</h1>
                  <p className="text-xs text-muted-foreground">Workspace de conocimiento</p>
                </div>
              </div>
              <Button size="icon-sm" onClick={() => newPage()} aria-label="Nueva página">
                <Plus />
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={query} placeholder="Buscar notas…" onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <MiniStat label="Páginas" value={pages.length.toString()} />
              <MiniStat label="Favoritas" value={favoritePages.toString()} />
              <MiniStat label="Tags" value={Array.from(new Set(pages.flatMap((page) => page.tags))).length.toString()} />
            </div>
          </div>

          <div className="max-h-[calc(100vh-22rem)] space-y-2 overflow-auto p-3">
            {filteredPages.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">No hay páginas. Creá una o usá una plantilla.</div>
            ) : filteredPages.map((page) => {
              const favorite = userId ? page.favoriteBy.includes(userId) : false
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => selectPage(page)}
                  className={cn('w-full rounded-2xl border p-3 text-left transition hover:bg-muted/60', selectedId === page.id ? 'border-brand-accent bg-brand-accent/10' : 'bg-background/70')}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{page.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{page.title}</p>
                        {favorite ? <Star className="size-3 fill-brand-accent text-brand-accent" /> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{page.content || 'Sin contenido todavía'}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {page.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">#{tag}</Badge>)}
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">Actualizada hace {relativeDate(page.updatedAt)}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <main className="min-w-0 bg-background">
          <div className="sticky top-0 z-10 border-b bg-background/90 p-4 backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[72px_1fr]">
                <Input className="h-14 text-center text-3xl" value={draft.icon} maxLength={8} onChange={(event) => setDraft({ ...draft, icon: event.target.value })} />
                <Input className="h-14 border-0 bg-transparent px-0 text-3xl font-semibold shadow-none focus-visible:ring-0" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant={view === 'edit' ? 'default' : 'outline'} onClick={() => setView('edit')}>Editar</Button>
                <Button variant={view === 'preview' ? 'default' : 'outline'} onClick={() => setView('preview')}>Leer</Button>
                {selectedPage ? <Button variant="outline" onClick={() => handleFavorite(selectedPage)} disabled={isPending}><Star /> Favorita</Button> : null}
                {selectedPage ? <Button variant="outline" onClick={() => handleDuplicate(selectedPage)} disabled={isPending}><Copy /> Duplicar</Button> : null}
                {selectedPage && canDelete ? <Button variant="destructive" onClick={() => handleDelete(selectedPage)} disabled={isPending}><Archive /> Archivar</Button> : null}
                <Button onClick={handleSave} disabled={isPending}><Save /> {isPending ? 'Guardando…' : 'Guardar'}</Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Tags className="size-4 text-muted-foreground" />
              <Input className="h-8 max-w-xl" value={draft.tagsText} placeholder="Tags: ventas, soporte, procedimiento" onChange={(event) => setDraft({ ...draft, tagsText: event.target.value })} />
              {tags.map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}
            </div>
          </div>

          <div className="p-4 md:p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {QUICK_BLOCKS.map((block) => {
                const Icon = block.icon
                return <Button key={block.label} variant="outline" size="sm" onClick={() => insertBlock(block.text)}><Icon /> {block.label}</Button>
              })}
            </div>

            {view === 'edit' ? (
              <textarea
                value={draft.content}
                placeholder="Escribí aquí. Usá los bloques rápidos arriba: títulos, checklists, decisiones, tablas. Ya no sos rehén de un textarea pelón. Casi."
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                className="min-h-[620px] w-full resize-y rounded-2xl border bg-card px-5 py-4 font-mono text-sm leading-7 outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
              />
            ) : (
              <DocumentPreview title={draft.title} icon={draft.icon} content={draft.content} tags={tags} />
            )}
          </div>
        </main>

        <aside className="hidden border-l bg-muted/20 p-4 xl:block">
          <div className="space-y-4">
            <Card className="space-y-3 p-4">
              <div className="flex items-center gap-2 font-semibold"><BookOpen className="size-4" /> Documento</div>
              <MetaRow icon={FileText} label="Palabras" value={wordCount.toString()} />
              <MetaRow icon={Hash} label="Secciones" value={sectionCount.toString()} />
              <MetaRow icon={Tags} label="Tags" value={`${tags.length}/12`} />
              {selectedPage ? <p className="text-xs leading-5 text-muted-foreground">Editada {formatDate(selectedPage.updatedAt)}{selectedPage.lastEditedByName ? ` por ${selectedPage.lastEditedByName}` : ''}</p> : <p className="text-xs text-muted-foreground">Página nueva sin guardar.</p>}
              {message ? <p className="rounded-xl bg-brand-accent/10 p-2 text-xs text-brand-accent">{message}</p> : null}
            </Card>

            <Card className="space-y-3 p-4">
              <div className="flex items-center gap-2 font-semibold"><Sparkles className="size-4" /> Plantillas</div>
              <div className="grid gap-2">
                {NOTAS_TEMPLATES.map((template) => (
                  <button key={template.id} type="button" className="rounded-xl border bg-background/70 p-3 text-left text-sm transition hover:bg-muted" onClick={() => newPage(draftFromTemplate(template))}>
                    <span className="mr-2 text-lg">{template.icon}</span>{template.name}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="space-y-2 p-4 text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">Cómo usarlo</div>
              <p>1. Creá una página desde plantilla o desde cero.</p>
              <p>2. Insertá bloques rápidos para estructura.</p>
              <p>3. Cambiá a “Leer” para revisar como documento.</p>
              <p>4. Guardá. Parece obvio. Lo era.</p>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-background/70 p-2"><p className="font-semibold tabular-nums">{value}</p><p className="text-muted-foreground">{label}</p></div>
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-xl border bg-background/70 p-3 text-sm"><span className="inline-flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /> {label}</span><span className="font-semibold tabular-nums">{value}</span></div>
}

function DocumentPreview({ title, icon, content, tags }: { title: string; icon: string; content: string; tags: string[] }) {
  const lines = content.split('\n')
  return (
    <article className="mx-auto max-w-4xl rounded-3xl border bg-card p-6 shadow-sm md:p-10">
      <div className="mb-8 border-b pb-6">
        <div className="mb-4 text-5xl">{icon}</div>
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}</div>
      </div>
      <div className="space-y-2 text-sm leading-7">
        {lines.map((line, index) => <PreviewLine key={`${index}-${line}`} line={line} />)}
      </div>
    </article>
  )
}

function PreviewLine({ line }: { line: string }) {
  const trimmed = line.trim()
  if (!trimmed) return <div className="h-3" />
  if (trimmed.startsWith('## ')) return <h2 className="mt-7 text-2xl font-semibold tracking-tight">{trimmed.replace(/^##\s+/, '')}</h2>
  if (trimmed.startsWith('# ')) return <h1 className="mt-7 text-3xl font-semibold tracking-tight">{trimmed.replace(/^#\s+/, '')}</h1>
  if (trimmed.startsWith('- [ ]')) return <p className="rounded-xl border bg-muted/30 px-3 py-2">☐ {trimmed.replace('- [ ]', '').trim()}</p>
  if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) return <p className="rounded-xl border bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">☑ {trimmed.replace(/- \[[xX]\]/, '').trim()}</p>
  if (trimmed.startsWith('- ')) return <p className="pl-4">• {trimmed.replace(/^-\s+/, '')}</p>
  if (/^\d+\.\s/.test(trimmed)) return <p className="pl-4">{trimmed}</p>
  if (trimmed.startsWith('|')) return <pre className="overflow-auto rounded-xl border bg-muted/40 p-3 font-mono text-xs">{line}</pre>
  return <p className="text-muted-foreground">{line}</p>
}
