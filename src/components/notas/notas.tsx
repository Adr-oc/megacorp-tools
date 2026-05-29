'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  deleteNotasPage,
  getNotasWorkspace,
  saveNotasPage,
  toggleNotasFavorite,
} from '@/lib/notas/actions'
import { NOTAS_TEMPLATES, type NotasPage } from '@/lib/notas/schema'

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function pageToDraft(page: NotasPage): DraftPage {
  return {
    id: page.id,
    title: page.title,
    icon: page.icon,
    tagsText: page.tags.join(', '),
    content: page.content,
  }
}

function draftFromTemplate(template: (typeof NOTAS_TEMPLATES)[number]): DraftPage {
  return {
    title: template.title,
    icon: template.icon,
    tagsText: template.tags.join(', '),
    content: template.content,
  }
}

export function Notas() {
  const [pages, setPages] = useState<NotasPage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPage>(EMPTY_DRAFT)
  const [query, setQuery] = useState('')
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
    return () => {
      mounted = false
    }
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
    return visible.filter((page) => {
      const haystack = [page.title, page.content, page.tags.join(' ')].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [pages, query, userId])

  const selectedPage = selectedId ? pages.find((page) => page.id === selectedId) : undefined
  const savedTagCount = draft.tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean).length

  function selectPage(page: NotasPage) {
    setSelectedId(page.id)
    setDraft(pageToDraft(page))
    setMessage('')
  }

  function updateSavedPage(page: NotasPage) {
    setPages((current) => {
      const exists = current.some((item) => item.id === page.id)
      const next = exists
        ? current.map((item) => (item.id === page.id ? page : item))
        : [page, ...current]
      return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    })
    setSelectedId(page.id)
    setDraft(pageToDraft(page))
  }

  function handleSave() {
    const tags = draft.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    startTransition(async () => {
      const result = await saveNotasPage({
        id: draft.id,
        title: draft.title,
        icon: draft.icon || '📝',
        content: draft.content,
        tags,
      })
      if (result.ok) {
        updateSavedPage(result.data)
        setMessage('Página guardada')
      } else {
        setMessage(result.error)
      }
    })
  }

  function handleFavorite(page: NotasPage) {
    startTransition(async () => {
      const result = await toggleNotasFavorite({ id: page.id })
      if (result.ok) {
        updateSavedPage(result.data)
        setMessage(result.data.favoriteBy.includes(userId ?? '') ? 'Favorita marcada' : 'Favorita quitada')
      } else {
        setMessage(result.error)
      }
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
        setMessage('Página borrada')
      } else {
        setMessage(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
              🗒️
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">NOTAS</h1>
              <p className="text-sm text-muted-foreground">
                Wiki interna tipo mini Notion para documentar decisiones, ideas y procedimientos.
              </p>
            </div>
          </div>
          <p className="max-w-3xl rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Base inspirada en Notion/Outline/AppFlowy; MVP interno sin bloques avanzados todavía.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setSelectedId(null)
            setDraft(EMPTY_DRAFT)
            setMessage('Nueva página lista para editar')
          }}
        >
          + Nueva página
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="p-4">
            <Label htmlFor="notas-search">Buscar</Label>
            <Input
              id="notas-search"
              className="mt-2"
              value={query}
              placeholder="Título, contenido o tags…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Páginas</h2>
              <span className="text-xs text-muted-foreground">{filteredPages.length}</span>
            </div>
            <div className="max-h-[620px] space-y-2 overflow-auto pr-1">
              {filteredPages.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No hay páginas todavía. Creá una nota o usá una plantilla rápida.
                </div>
              ) : (
                filteredPages.map((page) => {
                  const favorite = userId ? page.favoriteBy.includes(userId) : false
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => selectPage(page)}
                      className={
                        'w-full rounded-xl border p-3 text-left transition hover:bg-muted/60 ' +
                        (selectedId === page.id ? 'border-primary bg-primary/5' : 'bg-background')
                      }
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{page.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{page.title}</p>
                            {favorite ? <span title="Favorita">★</span> : null}
                          </div>
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {page.content || 'Sin contenido todavía'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {page.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {formatDate(page.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </Card>
        </aside>

        <main className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Plantillas rápidas</h2>
                <p className="text-sm text-muted-foreground">Arrancá con una estructura editable.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {NOTAS_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedId(null)
                      setDraft(draftFromTemplate(template))
                      setMessage(`Plantilla ${template.name} cargada`)
                    }}
                  >
                    {template.icon} {template.name}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[88px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="notas-icon">Emoji</Label>
                  <Input
                    id="notas-icon"
                    className="text-center text-2xl"
                    value={draft.icon}
                    maxLength={8}
                    onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notas-title">Título</Label>
                  <Input
                    id="notas-title"
                    className="text-lg font-semibold"
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas-tags">Tags separados por coma</Label>
                <Input
                  id="notas-tags"
                  value={draft.tagsText}
                  placeholder="ventas, onboarding, soporte"
                  onChange={(event) => setDraft({ ...draft, tagsText: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">{savedTagCount}/12 tags</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas-content">Contenido markdown-lite</Label>
                <textarea
                  id="notas-content"
                  value={draft.content}
                  placeholder="Escribí con títulos ##, listas -, checklists [ ] y enlaces simples…"
                  onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                  className="min-h-[460px] w-full rounded-md border border-input bg-background px-4 py-3 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  {selectedPage ? (
                    <span>
                      Actualizada {formatDate(selectedPage.updatedAt)}
                      {selectedPage.authorName ? ` · Autor: ${selectedPage.authorName}` : ''}
                    </span>
                  ) : (
                    <span>Guardá para compartir esta página con la organización.</span>
                  )}
                  {message ? <p className="mt-1 text-primary">{message}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPage ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleFavorite(selectedPage)}
                      disabled={isPending}
                    >
                      {userId && selectedPage.favoriteBy.includes(userId) ? '★ Favorita' : '☆ Favorita'}
                    </Button>
                  ) : null}
                  {selectedPage && canDelete ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(selectedPage)}
                      disabled={isPending}
                    >
                      Borrar
                    </Button>
                  ) : null}
                  <Button type="button" onClick={handleSave} disabled={isPending}>
                    {isPending ? 'Guardando…' : 'Guardar página'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
