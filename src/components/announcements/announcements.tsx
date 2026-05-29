'use client'

import type { ReactNode } from 'react'
import { useMemo, useState, useTransition } from 'react'
import {
  Bell,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Mail,
  Megaphone,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  deleteAnnouncement,
  markAnnouncementRead,
  saveAnnouncement,
} from '@/lib/announcements/actions'
import type {
  Announcement,
  AnnouncementSeverity,
  AnnouncementStatus,
} from '@/lib/announcements/schema'

type Props = {
  initialAnnouncements: Announcement[]
  currentUserId: string
  isAdmin: boolean
}

type Filter = 'all' | 'published' | 'urgent' | 'draft'

type FormState = {
  id?: string
  title: string
  body: string
  severity: AnnouncementSeverity
  status: AnnouncementStatus
  sendByEmail: boolean
}

const emptyForm: FormState = {
  title: '',
  body: '',
  severity: 'info',
  status: 'published',
  sendByEmail: false,
}

const severityCopy: Record<AnnouncementSeverity, string> = {
  info: 'Info',
  importante: 'Importante',
  urgente: 'Urgente',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function Announcements({
  initialAnnouncements,
  currentUserId,
  isAdmin,
}: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [filter, setFilter] = useState<Filter>('all')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showForm, setShowForm] = useState(isAdmin && initialAnnouncements.length === 0)
  const [pending, startTransition] = useTransition()

  const stats = useMemo(
    () => ({
      published: announcements.filter((item) => item.status === 'published').length,
      urgent: announcements.filter(
        (item) => item.status === 'published' && item.severity === 'urgente'
      ).length,
      draft: announcements.filter((item) => item.status === 'draft').length,
      unread: announcements.filter(
        (item) =>
          item.status === 'published' && !item.readBy.includes(currentUserId)
      ).length,
    }),
    [announcements, currentUserId]
  )

  const filteredAnnouncements = useMemo(() => {
    if (filter === 'published') {
      return announcements.filter((item) => item.status === 'published')
    }
    if (filter === 'urgent') {
      return announcements.filter(
        (item) => item.status === 'published' && item.severity === 'urgente'
      )
    }
    if (filter === 'draft') {
      return announcements.filter((item) => item.status === 'draft')
    }
    return announcements
  }, [announcements, filter])

  function resetForm() {
    setForm(emptyForm)
    setShowForm(false)
  }

  function editAnnouncement(announcement: Announcement) {
    setForm({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      severity: announcement.severity,
      status: announcement.status,
      sendByEmail: announcement.sendByEmail,
    })
    setShowForm(true)
  }

  function onSubmit() {
    startTransition(async () => {
      const res = await saveAnnouncement(form)
      if (!res.ok) {
        toast.error(res.error)
        return
      }

      setAnnouncements((items) => {
        const exists = items.some((item) => item.id === res.data.id)
        return exists
          ? items.map((item) => (item.id === res.data.id ? res.data : item))
          : [res.data, ...items]
      })
      toast.success(form.id ? 'Anuncio actualizado' : 'Anuncio creado')
      resetForm()
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const res = await deleteAnnouncement({ id })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setAnnouncements((items) => items.filter((item) => item.id !== id))
      toast.success('Anuncio borrado')
    })
  }

  function toggleRead(announcement: Announcement, read: boolean) {
    startTransition(async () => {
      const res = await markAnnouncementRead({ id: announcement.id, read })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setAnnouncements((items) =>
        items.map((item) => (item.id === res.data.id ? res.data : item))
      )
      toast.success(read ? 'Marcado como leído' : 'Marcado como no leído')
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-brand-accent/10 p-2 text-brand-accent">
              <Megaphone className="size-5" />
            </div>
            <h1 className="text-2xl font-bold">Anuncios</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Comunicá noticias internas, recordatorios importantes y avisos
            urgentes para toda tu organización.
          </p>
        </div>
        {isAdmin ? (
          <Button
            onClick={() => {
              setForm(emptyForm)
              setShowForm(true)
            }}
            disabled={pending}
          >
            <Plus className="size-4" />
            Nuevo anuncio
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Publicados" value={stats.published} icon={<Bell />} />
        <StatCard label="Urgentes" value={stats.urgent} icon={<Megaphone />} tone="urgent" />
        <StatCard label="Borradores" value={stats.draft} icon={<EyeOff />} />
        <StatCard label="Sin leer" value={stats.unread} icon={<Eye />} tone="info" />
      </div>

      {isAdmin && showForm ? (
        <Card className="border-brand-accent/30 shadow-sm">
          <CardHeader>
            <CardTitle>{form.id ? 'Editar anuncio' : 'Crear anuncio'}</CardTitle>
            <CardDescription>
              Definí el mensaje, su prioridad y si queda publicado o como
              borrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1.5 md:col-span-2">
                <Label htmlFor="announcement-title">Título</Label>
                <Input
                  id="announcement-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, title: event.target.value }))
                  }
                  placeholder="Ej. Mantenimiento programado"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="announcement-severity">Tipo</Label>
                <select
                  id="announcement-severity"
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.severity}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      severity: event.target.value as AnnouncementSeverity,
                    }))
                  }
                >
                  <option value="info">Info</option>
                  <option value="importante">Importante</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="announcement-status">Estado</Label>
                <select
                  id="announcement-status"
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.status}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      status: event.target.value as AnnouncementStatus,
                    }))
                  }
                >
                  <option value="published">Publicado</option>
                  <option value="draft">Borrador</option>
                </select>
              </div>
              <div className="grid gap-1.5 md:col-span-2">
                <Label htmlFor="announcement-body">Cuerpo</Label>
                <textarea
                  id="announcement-body"
                  value={form.body}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, body: event.target.value }))
                  }
                  placeholder="Escribí el anuncio para el equipo…"
                  className="min-h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
              <input
                type="checkbox"
                checked={form.sendByEmail}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    sendByEmail: event.target.checked,
                  }))
                }
                className="mt-1"
              />
              <span>
                <span className="font-medium">Enviar por correo</span>
                <span className="block text-muted-foreground">
                  Por ahora se guardará como pendiente/configurable; no se
                  enviarán correos automáticamente.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={resetForm} disabled={pending}>
                Cancelar
              </Button>
              <Button onClick={onSubmit} disabled={pending}>
                {pending ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Publicar anuncio'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="published">Publicados</TabsTrigger>
          <TabsTrigger value="urgent">Urgentes</TabsTrigger>
          {isAdmin ? <TabsTrigger value="draft">Borradores</TabsTrigger> : null}
        </TabsList>
      </Tabs>

      {filteredAnnouncements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-muted p-4 text-muted-foreground">
              <Megaphone className="size-7" />
            </div>
            <div>
              <h2 className="font-semibold">Aún no hay anuncios</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin
                  ? 'Creá el primer anuncio para mantener informado al equipo.'
                  : 'Cuando tu organización publique anuncios, aparecerán acá.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredAnnouncements.map((announcement) => {
            const isRead = announcement.readBy.includes(currentUserId)
            return (
              <Card
                key={announcement.id}
                className={cn(
                  'overflow-hidden transition-shadow hover:shadow-sm',
                  announcement.severity === 'urgente' && 'border-destructive/30',
                  !isRead && announcement.status === 'published' && 'bg-brand-accent/5'
                )}
              >
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={announcement.severity} />
                    <Badge variant={announcement.status === 'published' ? 'secondary' : 'outline'}>
                      {announcement.status === 'published' ? 'Publicado' : 'Borrador'}
                    </Badge>
                    {announcement.sendByEmail ? (
                      <Badge variant="outline" className="gap-1">
                        <Mail className="size-3" />
                        Correo pendiente/configurable
                      </Badge>
                    ) : null}
                    {!isRead && announcement.status === 'published' ? (
                      <Badge>Nuevo</Badge>
                    ) : null}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <CardDescription>
                      {formatDate(announcement.createdAt)}
                      {announcement.authorName ? ` · ${announcement.authorName}` : ''}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {announcement.body}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    {announcement.status === 'published' ? (
                      <Button
                        variant={isRead ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => toggleRead(announcement, !isRead)}
                        disabled={pending}
                      >
                        {isRead ? <EyeOff className="size-4" /> : <CheckCircle2 className="size-4" />}
                        {isRead ? 'Marcar no leído' : 'Marcar leído'}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Visible solo para administradores.
                      </span>
                    )}
                    {isAdmin ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editAnnouncement(announcement)}
                          disabled={pending}
                        >
                          <Edit3 className="size-4" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(announcement.id)}
                          disabled={pending}
                        >
                          <Trash2 className="size-4" />
                          Borrar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: ReactNode
  tone?: 'urgent' | 'info'
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'rounded-xl bg-muted p-2 text-muted-foreground [&_svg]:size-5',
            tone === 'urgent' && 'bg-destructive/10 text-destructive',
            tone === 'info' && 'bg-brand-accent/10 text-brand-accent'
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SeverityBadge({ severity }: { severity: AnnouncementSeverity }) {
  if (severity === 'urgente') {
    return <Badge variant="destructive">{severityCopy[severity]}</Badge>
  }
  if (severity === 'importante') {
    return <Badge variant="secondary">{severityCopy[severity]}</Badge>
  }
  return <Badge variant="outline">{severityCopy[severity]}</Badge>
}
