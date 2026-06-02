'use client'

import { useEffect, useMemo, useState, useTransition, type ComponentType } from 'react'
import {
  Archive,
  BookOpen,
  CheckSquare,
  Copy,
  FileText,
  GripVertical,
  Hash,
  Heading2,
  Highlighter,
  ListChecks,
  Minus,
  PanelLeftClose,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Tags,
  Type,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

type BlockType = 'paragraph' | 'heading' | 'todo' | 'callout' | 'divider'

type NoteBlock = {
  id: string
  type: BlockType
  text: string
  checked?: boolean
}

const EMPTY_DRAFT: DraftPage = {
  title: 'Nueva página',
  icon: '📝',
  tagsText: '',
  content: '',
}

const CATEGORY_COLORS = [
  'bg-brand-accent/20 text-foreground ring-brand-accent/20',
  'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300',
  'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',
  'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
]

const BLOCK_TOOLS: Array<{ type: BlockType; label: string; icon: ComponentType<{ className?: string }> }> = [
  { type: 'paragraph', label: 'Texto', icon: Type },
  { type: 'heading', label: 'Título', icon: Heading2 },
  { type: 'todo', label: 'Checklist', icon: ListChecks },
  { type: 'callout', label: 'Nota', icon: Highlighter },
  { type: 'divider', label: 'Separador', icon: Minus },
]

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

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

function parseBlocks(content: string): NoteBlock[] {
  const lines = content.split('\n')
  const blocks: NoteBlock[] = []
  let paragraph: string[] = []

  function flushParagraph() {
    const text = paragraph.join('\n').trim()
    if (text) blocks.push({ id: makeId(), type: 'paragraph', text })
    paragraph = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      continue
    }
    if (trimmed === '---') {
      flushParagraph()
      blocks.push({ id: makeId(), type: 'divider', text: '' })
      continue
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph()
      blocks.push({ id: makeId(), type: 'heading', text: trimmed.replace(/^##\s+/, '') })
      continue
    }
    if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
      flushParagraph()
      blocks.push({
        id: makeId(),
        type: 'todo',
        checked: /^- \[[xX]\]/.test(trimmed),
        text: trimmed.replace(/^- \[[ xX]\]\s*/, ''),
      })
      continue
    }
    if (trimmed.startsWith('> ')) {
      flushParagraph()
      blocks.push({ id: makeId(), type: 'callout', text: trimmed.replace(/^>\s+/, '') })
      continue
    }
    paragraph.push(line)
  }
  flushParagraph()
  return blocks.length ? blocks : [{ id: makeId(), type: 'paragraph', text: '' }]
}

function serializeBlocks(blocks: NoteBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === 'heading') return `## ${block.text.trim()}`
      if (block.type === 'todo') return `- [${block.checked ? 'x' : ' '}] ${block.text.trim()}`
      if (block.type === 'callout') return `> ${block.text.trim()}`
      if (block.type === 'divider') return '---'
      return block.text.trim()
    })
    .filter((text) => text.length > 0 || text === '---')
    .join('\n\n')
}

function tagsFromText(tagsText: string) {
  return tagsText.split(',').map((tag) => tag.trim()).filter(Boolean)
}

export function Notas() {
  const [pages, setPages] = useState<NotasPage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPage>(EMPTY_DRAFT)
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => parseBlocks(''))
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todos')
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
          selectLoadedPage(loadedPages[0])
        } else {
          setSelectedId(null)
          setDraft(EMPTY_DRAFT)
          setBlocks(parseBlocks(''))
        }
        setMessage('')
      } else {
        setMessage(result.error)
      }
    })
    return () => { mounted = false }
  }, [])

  const allCategories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const page of pages) {
      const first = page.tags[0] ?? 'sin-categoria'
      counts.set(first, (counts.get(first) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [pages])

  const filteredPages = useMemo(() => {
    const term = query.trim().toLowerCase()
    const visible = [...pages].sort((a, b) => {
      const aFav = userId ? a.favoriteBy.includes(userId) : false
      const bFav = userId ? b.favoriteBy.includes(userId) : false
      if (aFav !== bFav) return aFav ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return visible.filter((page) => {
      const category = page.tags[0] ?? 'sin-categoria'
      const matchesCategory = categoryFilter === 'todos' || category === categoryFilter
      const matchesTerm = !term || [page.title, page.content, page.tags.join(' ')].join(' ').toLowerCase().includes(term)
      return matchesCategory && matchesTerm
    })
  }, [pages, query, userId, categoryFilter])

  const selectedPage = selectedId ? pages.find((page) => page.id === selectedId) : undefined
  const favoritePages = userId ? pages.filter((page) => page.favoriteBy.includes(userId)).length : 0
  const tags = tagsFromText(draft.tagsText)
  const wordCount = serializeBlocks(blocks).trim() ? serializeBlocks(blocks).trim().split(/\s+/).length : 0
  const category = tags[0] ?? 'sin-categoria'

  function selectLoadedPage(page: NotasPage) {
    setSelectedId(page.id)
    setDraft(pageToDraft(page))
    setBlocks(parseBlocks(page.content))
    setMessage('')
  }

  function selectPage(page: NotasPage) {
    selectLoadedPage(page)
  }

  function syncDraftContent(nextBlocks: NoteBlock[]) {
    setBlocks(nextBlocks)
    setDraft((current) => ({ ...current, content: serializeBlocks(nextBlocks) }))
  }

  function updateBlock(id: string, patch: Partial<NoteBlock>) {
    syncDraftContent(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)))
  }

  function addBlock(type: BlockType, afterId?: string) {
    const nextBlock: NoteBlock = {
      id: makeId(),
      type,
      text: type === 'heading' ? 'Nuevo título' : type === 'callout' ? 'Nota importante' : type === 'todo' ? 'Pendiente' : '',
      checked: false,
    }
    const index = afterId ? blocks.findIndex((block) => block.id === afterId) : -1
    const next = index >= 0 ? [...blocks.slice(0, index + 1), nextBlock, ...blocks.slice(index + 1)] : [...blocks, nextBlock]
    syncDraftContent(next)
  }

  function removeBlock(id: string) {
    const next = blocks.filter((block) => block.id !== id)
    syncDraftContent(next.length ? next : parseBlocks(''))
  }

  function handleSave() {
    const content = serializeBlocks(blocks)
    const cleanTags = tagsFromText(draft.tagsText)
    startTransition(async () => {
      const result = await saveNotasPage({ id: draft.id, title: draft.title, icon: draft.icon || '📝', content, tags: cleanTags })
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

  function updateSavedPage(page: NotasPage) {
    setPages((current) => {
      const exists = current.some((item) => item.id === page.id)
      const next = exists ? current.map((item) => (item.id === page.id ? page : item)) : [page, ...current]
      return next.filter((item) => !item.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    })
    setSelectedId(page.id)
    setDraft(pageToDraft(page))
    setBlocks(parseBlocks(page.content))
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
        if (next) selectLoadedPage(next)
        else {
          setDraft(EMPTY_DRAFT)
          setBlocks(parseBlocks(''))
        }
        toast.success('Página archivada')
      } else toast.error(result.error)
    })
  }

  function newPage(from?: DraftPage) {
    const next = from ?? EMPTY_DRAFT
    setSelectedId(null)
    setDraft(next)
    setBlocks(parseBlocks(next.content))
    setMessage('Nueva página lista')
  }

  return (
    <div className="h-[calc(100vh-5.5rem)] min-h-[720px] overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid h-full lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        <aside className="hidden min-h-0 border-r bg-muted/20 lg:flex lg:flex-col">
          <div className="space-y-3 border-b p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-accent/10 text-2xl">🗒️</div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">NOTAS</h1>
                  <p className="text-xs text-muted-foreground">Workspace tipo documento</p>
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
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <MiniStat label="Páginas" value={pages.length.toString()} />
              <MiniStat label="Fav" value={favoritePages.toString()} />
              <MiniStat label="Cats" value={allCategories.length.toString()} />
            </div>
          </div>

          <div className="border-b p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Categorías</p>
            <div className="flex flex-wrap gap-2">
              <CategoryChip label="Todos" count={pages.length} active={categoryFilter === 'todos'} onClick={() => setCategoryFilter('todos')} />
              {allCategories.map(([name, count], index) => (
                <CategoryChip key={name} label={name} count={count} color={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} active={categoryFilter === name} onClick={() => setCategoryFilter(name)} />
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
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

        <main className="min-w-0 overflow-auto bg-background">
          <div className="sticky top-0 z-10 border-b bg-background/90 px-4 py-3 backdrop-blur">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[58px_1fr]">
                <Input className="h-12 text-center text-2xl" value={draft.icon} maxLength={8} onChange={(event) => setDraft({ ...draft, icon: event.target.value })} />
                <Input className="h-12 border-0 bg-transparent px-0 text-3xl font-semibold shadow-none focus-visible:ring-0" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedPage ? <Button variant="outline" onClick={() => handleFavorite(selectedPage)} disabled={isPending}><Star /> Favorita</Button> : null}
                {selectedPage ? <Button variant="outline" onClick={() => handleDuplicate(selectedPage)} disabled={isPending}><Copy /> Duplicar</Button> : null}
                {selectedPage && canDelete ? <Button variant="destructive" onClick={() => handleDelete(selectedPage)} disabled={isPending}><Archive /> Archivar</Button> : null}
                <Button onClick={handleSave} disabled={isPending}><Save /> {isPending ? 'Guardando…' : 'Guardar'}</Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Tags className="size-4 text-muted-foreground" />
              <Input className="h-8 max-w-xl" value={draft.tagsText} placeholder="Categoría primero, luego tags: soporte, proceso, ventas" onChange={(event) => setDraft({ ...draft, tagsText: event.target.value })} />
              {tags.map((tag, index) => <Badge key={tag} variant={index === 0 ? 'default' : 'secondary'}>#{tag}</Badge>)}
            </div>
          </div>

          <div className="mx-auto max-w-5xl px-4 py-5 md:px-8 lg:px-10">
            <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border bg-muted/25 p-2">
              {BLOCK_TOOLS.map((tool) => {
                const Icon = tool.icon
                return <Button key={tool.type} variant="outline" size="sm" onClick={() => addBlock(tool.type)}><Icon /> {tool.label}</Button>
              })}
            </div>

            <section className="rounded-[1.5rem] border bg-card p-4 shadow-sm md:p-8">
              <div className="mb-8 border-b pb-6">
                <div className="mb-4 text-6xl">{draft.icon}</div>
                <h2 className="text-4xl font-black tracking-tight md:text-5xl">{draft.title || 'Sin título'}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="bg-brand-accent/15 text-foreground ring-1 ring-brand-accent/20">Categoría: {category}</Badge>
                  <Badge variant="outline">{wordCount} palabras</Badge>
                </div>
              </div>

              <div className="space-y-2">
                {blocks.map((block) => (
                  <NoteBlockEditor
                    key={block.id}
                    block={block}
                    onChange={(patch) => updateBlock(block.id, patch)}
                    onAdd={(type) => addBlock(type, block.id)}
                    onRemove={() => removeBlock(block.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        </main>

        <aside className="hidden min-h-0 border-l bg-muted/20 p-3 2xl:block">
          <div className="space-y-3">
            <InfoPanel title="Documento" icon={BookOpen}>
              <MetaRow icon={FileText} label="Palabras" value={wordCount.toString()} />
              <MetaRow icon={Hash} label="Bloques" value={blocks.length.toString()} />
              <MetaRow icon={Tags} label="Tags" value={`${tags.length}/12`} />
              {selectedPage ? <p className="text-xs leading-5 text-muted-foreground">Editada {formatDate(selectedPage.updatedAt)}{selectedPage.lastEditedByName ? ` por ${selectedPage.lastEditedByName}` : ''}</p> : <p className="text-xs text-muted-foreground">Página nueva sin guardar.</p>}
              {message ? <p className="rounded-xl bg-brand-accent/10 p-2 text-xs text-brand-accent">{message}</p> : null}
            </InfoPanel>

            <InfoPanel title="Plantillas" icon={Sparkles}>
              <div className="grid gap-2">
                {NOTAS_TEMPLATES.map((template) => (
                  <button key={template.id} type="button" className="rounded-xl border bg-background/70 p-3 text-left text-sm transition hover:bg-muted" onClick={() => newPage(draftFromTemplate(template))}>
                    <span className="mr-2 text-lg">{template.icon}</span>{template.name}
                  </button>
                ))}
              </div>
            </InfoPanel>

            <InfoPanel title="Regla del editor" icon={PanelLeftClose}>
              <p className="text-sm text-muted-foreground">Editás bloques directos. Nada de preview markdown. La categoría es el primer tag para mantener la DB simple.</p>
            </InfoPanel>
          </div>
        </aside>
      </div>
    </div>
  )
}

function NoteBlockEditor({
  block,
  onChange,
  onAdd,
  onRemove,
}: {
  block: NoteBlock
  onChange: (patch: Partial<NoteBlock>) => void
  onAdd: (type: BlockType) => void
  onRemove: () => void
}) {
  if (block.type === 'divider') {
    return (
      <div className="group flex items-center gap-2 py-3">
        <BlockControls onAdd={onAdd} onRemove={onRemove} />
        <div className="h-px flex-1 bg-border" />
      </div>
    )
  }

  const inputClass = cn(
    'w-full resize-none border-0 bg-transparent outline-none placeholder:text-muted-foreground/50 focus-visible:ring-0',
    block.type === 'heading' && 'text-2xl font-bold tracking-tight md:text-3xl',
    block.type === 'paragraph' && 'text-base leading-8',
    block.type === 'callout' && 'text-sm leading-7',
    block.type === 'todo' && 'text-base leading-7'
  )

  return (
    <div className={cn('group grid gap-2 rounded-xl px-2 py-1 transition hover:bg-muted/35', block.type === 'callout' && 'bg-brand-accent/7 ring-1 ring-brand-accent/15')}>
      <div className="flex items-start gap-2">
        <BlockControls onAdd={onAdd} onRemove={onRemove} />
        {block.type === 'todo' ? (
          <button
            type="button"
            className={cn('mt-1 flex size-5 items-center justify-center rounded border', block.checked ? 'border-brand-accent bg-brand-accent text-brand-accent-foreground' : 'bg-background')}
            onClick={() => onChange({ checked: !block.checked })}
            aria-label="Cambiar checklist"
          >
            {block.checked ? <CheckSquare className="size-3.5" /> : null}
          </button>
        ) : null}
        {block.type === 'callout' ? <span className="mt-1 text-lg">💡</span> : null}
        <textarea
          rows={block.type === 'heading' ? 1 : 2}
          value={block.text}
          placeholder={block.type === 'heading' ? 'Título' : block.type === 'todo' ? 'Pendiente' : block.type === 'callout' ? 'Nota importante' : 'Escribí aquí…'}
          onChange={(event) => onChange({ text: event.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  )
}

function BlockControls({ onAdd, onRemove }: { onAdd: (type: BlockType) => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1 pt-1 opacity-0 transition group-hover:opacity-100">
      <GripVertical className="size-4 text-muted-foreground" />
      <button type="button" className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground" onClick={() => onAdd('paragraph')} aria-label="Agregar bloque">
        <Plus className="size-4" />
      </button>
      <button type="button" className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onRemove} aria-label="Eliminar bloque">
        <Minus className="size-4" />
      </button>
    </div>
  )
}

function CategoryChip({ label, count, active, color, onClick }: { label: string; count: number; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition',
        active ? 'bg-brand-accent text-brand-accent-foreground ring-brand-accent' : color ?? 'bg-background text-muted-foreground ring-border hover:text-foreground'
      )}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-background/70 p-2"><p className="font-semibold tabular-nums">{value}</p><p className="text-muted-foreground">{label}</p></div>
}

function InfoPanel({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-background/80 p-4">
      <div className="flex items-center gap-2 font-semibold"><Icon className="size-4" /> {title}</div>
      {children}
    </div>
  )
}

function MetaRow({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-xl border bg-background/70 p-3 text-sm"><span className="inline-flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /> {label}</span><span className="font-semibold tabular-nums">{value}</span></div>
}
