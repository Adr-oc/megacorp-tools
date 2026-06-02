'use client'

import { useEffect, useMemo, useState, useTransition, type ComponentType } from 'react'
import type { PartialBlock } from '@blocknote/core'
import { BlockNoteViewRaw, useCreateBlockNote } from '@blocknote/react'
import '@blocknote/core/style.css'
import '@blocknote/react/style.css'
import {
  Archive,
  BookOpen,
  Copy,
  FileText,
  Hash,
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

type EditorStats = {
  words: number
  blocks: number
  markdown: string
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

function tagsFromText(tagsText: string) {
  return tagsText.split(',').map((tag) => tag.trim()).filter(Boolean)
}

function plainPreview(content: string) {
  return content
    .replace(/^#+\s+/gm, '')
    .replace(/^- \[[ xX]\]\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\|/g, ' ')
    .trim()
}

function markdownToInitialBlocks(markdown: string): PartialBlock[] {
  const chunks = markdown.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean)
  if (chunks.length === 0) return [{ type: 'paragraph', content: '' }]

  return chunks.map((chunk) => {
    if (chunk === '---') return { type: 'divider' }
    if (chunk.startsWith('### ')) return { type: 'heading', props: { level: 3 }, content: chunk.replace(/^###\s+/, '') }
    if (chunk.startsWith('## ')) return { type: 'heading', props: { level: 2 }, content: chunk.replace(/^##\s+/, '') }
    if (chunk.startsWith('# ')) return { type: 'heading', props: { level: 1 }, content: chunk.replace(/^#\s+/, '') }
    if (chunk.startsWith('- [ ]') || chunk.startsWith('- [x]') || chunk.startsWith('- [X]')) {
      const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean)
      const first = lines[0] ?? ''
      return {
        type: 'checkListItem',
        props: { checked: /^- \[[xX]\]/.test(first) },
        content: lines.map((line) => line.replace(/^- \[[ xX]\]\s*/, '')).join('\n'),
      }
    }
    if (chunk.startsWith('- ')) return { type: 'bulletListItem', content: chunk.replace(/^-\s+/gm, '') }
    if (/^\d+\.\s/.test(chunk)) return { type: 'numberedListItem', content: chunk.replace(/^\d+\.\s+/gm, '') }
    if (chunk.startsWith('> ')) return { type: 'quote', content: chunk.replace(/^>\s+/gm, '') }
    if (chunk.startsWith('|')) return { type: 'table', content: { type: 'tableContent', rows: [{ cells: ['Campo', 'Valor'] }, { cells: ['Responsable', ''] }] } }
    return { type: 'paragraph', content: chunk }
  })
}

function createNewPageDraft(from?: DraftPage) {
  return from ?? { ...EMPTY_DRAFT }
}

export function Notas() {
  const [pages, setPages] = useState<NotasPage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPage>(EMPTY_DRAFT)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [userId, setUserId] = useState<string | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [message, setMessage] = useState('Cargando workspace…')
  const [editorStats, setEditorStats] = useState<EditorStats>({ words: 0, blocks: 1, markdown: '' })
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
        if (loadedPages[0]) selectLoadedPage(loadedPages[0])
        else {
          setSelectedId(null)
          setDraft(EMPTY_DRAFT)
          setEditorStats({ words: 0, blocks: 1, markdown: '' })
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
  const category = tags[0] ?? 'sin-categoria'
  const editorKey = draft.id ?? `new-${draft.title}-${draft.content.length}`

  function selectLoadedPage(page: NotasPage) {
    setSelectedId(page.id)
    setDraft(pageToDraft(page))
    setEditorStats({
      words: plainPreview(page.content).trim() ? plainPreview(page.content).trim().split(/\s+/).length : 0,
      blocks: Math.max(1, markdownToInitialBlocks(page.content).length),
      markdown: page.content,
    })
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
    setEditorStats({
      words: plainPreview(page.content).trim() ? plainPreview(page.content).trim().split(/\s+/).length : 0,
      blocks: Math.max(1, markdownToInitialBlocks(page.content).length),
      markdown: page.content,
    })
  }

  function handleSave() {
    const content = editorStats.markdown || draft.content
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
        if (next) selectLoadedPage(next)
        else {
          setSelectedId(null)
          setDraft(EMPTY_DRAFT)
          setEditorStats({ words: 0, blocks: 1, markdown: '' })
        }
        toast.success('Página archivada')
      } else toast.error(result.error)
    })
  }

  function newPage(from?: DraftPage) {
    const next = createNewPageDraft(from)
    setSelectedId(null)
    setDraft(next)
    setEditorStats({
      words: plainPreview(next.content).trim() ? plainPreview(next.content).trim().split(/\s+/).length : 0,
      blocks: Math.max(1, markdownToInitialBlocks(next.content).length),
      markdown: next.content,
    })
    setMessage('Nueva página lista')
  }

  return (
    <div className="h-[calc(100vh-4.75rem)] min-h-[720px] overflow-hidden border-y bg-background xl:-mx-6 2xl:-mx-10">
      <div className="grid h-full min-h-0 lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_260px]">
        <aside className="hidden min-h-0 border-r bg-card/40 lg:flex lg:flex-col">
          <div className="space-y-3 border-b p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-accent/10 text-2xl">🗒️</div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">NOTAS</h1>
                  <p className="text-xs text-muted-foreground">Páginas y categorías</p>
                </div>
              </div>
              <Button size="icon-sm" onClick={() => newPage()} aria-label="Nueva página"><Plus /></Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={query} placeholder="Buscar notas…" onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div id="notas-favoritas" className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <MiniStat label="Páginas" value={pages.length.toString()} />
              <MiniStat label="Fav" value={favoritePages.toString()} />
              <MiniStat label="Cats" value={allCategories.length.toString()} />
            </div>
          </div>

          <div id="notas-categorias" className="border-b p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Categorías</p>
            <div className="flex flex-wrap gap-2">
              <CategoryChip label="Todos" count={pages.length} active={categoryFilter === 'todos'} onClick={() => setCategoryFilter('todos')} />
              {allCategories.map(([name, count], index) => (
                <CategoryChip key={name} label={name} count={count} color={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} active={categoryFilter === name} onClick={() => setCategoryFilter(name)} />
              ))}
            </div>
          </div>

          <div id="notas-paginas" className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
            {filteredPages.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">No hay páginas. Creá una o usá una plantilla.</div>
            ) : filteredPages.map((page) => {
              const favorite = userId ? page.favoriteBy.includes(userId) : false
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => selectLoadedPage(page)}
                  className={cn('w-full rounded-2xl border p-3 text-left transition hover:bg-muted/60', selectedId === page.id ? 'border-brand-accent bg-brand-accent/10' : 'bg-background/70')}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{page.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{page.title}</p>
                        {favorite ? <Star className="size-3 fill-brand-accent text-brand-accent" /> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{plainPreview(page.content) || 'Sin contenido todavía'}</p>
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
          <div className="sticky top-0 z-20 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-6">
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
              <Input className="h-8 max-w-2xl" value={draft.tagsText} placeholder="Categoría primero, luego tags: soporte, proceso, ventas" onChange={(event) => setDraft({ ...draft, tagsText: event.target.value })} />
              {tags.map((tag, index) => <Badge key={tag} variant={index === 0 ? 'default' : 'secondary'}>#{tag}</Badge>)}
            </div>
          </div>

          <article id="notas-editor" className="mx-auto max-w-7xl px-5 py-8 md:px-10 xl:px-14">
            <header className="mb-6 border-b pb-6">
              <div className="mb-4 text-6xl">{draft.icon}</div>
              <h2 className="text-4xl font-black tracking-tight md:text-6xl">{draft.title || 'Sin título'}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="bg-brand-accent/15 text-foreground ring-1 ring-brand-accent/20">Categoría: {category}</Badge>
                <Badge variant="outline">{editorStats.blocks} bloques</Badge>
                <Badge variant="outline">{editorStats.words} palabras</Badge>
                <Badge variant="outline">Slash: /</Badge>
                <Badge variant="outline">Drag: handle lateral</Badge>
              </div>
            </header>

            <NotasBlockEditor
              key={editorKey}
              initialMarkdown={draft.content}
              onStatsChange={setEditorStats}
            />
          </article>
        </main>

        <aside className="hidden min-h-0 overflow-auto border-l bg-card/35 p-3 2xl:block">
          <div className="space-y-3">
            <InfoPanel title="Documento" icon={BookOpen}>
              <MetaRow icon={FileText} label="Palabras" value={editorStats.words.toString()} />
              <MetaRow icon={Hash} label="Bloques" value={editorStats.blocks.toString()} />
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
          </div>
        </aside>
      </div>
    </div>
  )
}

function NotasBlockEditor({ initialMarkdown, onStatsChange }: { initialMarkdown: string; onStatsChange: (stats: EditorStats) => void }) {
  const initialContent = useMemo(() => markdownToInitialBlocks(initialMarkdown), [initialMarkdown])
  const editor = useCreateBlockNote({
    initialContent,
    animations: true,
    tables: { splitCells: true, cellBackgroundColor: true, cellTextColor: true, headers: true },
  })

  useEffect(() => {
    const markdown = editor.blocksToMarkdownLossy(editor.document)
    onStatsChange({
      markdown,
      blocks: editor.document.length,
      words: plainPreview(markdown).trim() ? plainPreview(markdown).trim().split(/\s+/).length : 0,
    })
  }, [editor, onStatsChange])

  return (
    <div className="notas-blocknote min-h-[calc(100vh-21rem)] rounded-2xl border bg-card/80 px-3 py-5 shadow-sm md:px-8 md:py-8">
      <BlockNoteViewRaw
        editor={editor}
        theme="dark"
        onChange={(nextEditor) => {
          const markdown = nextEditor.blocksToMarkdownLossy(nextEditor.document)
          onStatsChange({
            markdown,
            blocks: nextEditor.document.length,
            words: plainPreview(markdown).trim() ? plainPreview(markdown).trim().split(/\s+/).length : 0,
          })
        }}
      />
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
