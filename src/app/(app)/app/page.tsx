import Link from 'next/link'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { Bell, Megaphone, Sparkles } from 'lucide-react'
import { auth } from '@/lib/auth/server'
import { ensureActiveOrganization } from '@/lib/auth/active-organization'
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'
import { orgSetting } from '@/lib/db/schema/app'
import { apps } from '@/lib/apps/registry'
import { AppCard } from '@/components/apps/app-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ANNOUNCEMENTS_KEY, parseAnnouncementsData } from '@/lib/announcements/schema'
import type { AppRole } from '@/lib/apps/types'

export default async function AppHomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  let role: AppRole = 'member'
  const activeOrgId = await ensureActiveOrganization({
    sessionId: session.session.id,
    userId: session.user.id,
    currentOrganizationId: session.session.activeOrganizationId,
  })
  if (activeOrgId) {
    const rows = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrgId)))
      .limit(1)
    role = (rows[0]?.role ?? 'member') as AppRole
  }

  const isSuperAdmin = session.user.isSuperAdmin === true
  const visibleApps = apps.filter(
    (a) => a.requiredRoles.includes(role) || (isSuperAdmin && a.requiredRoles.includes('super-admin')),
  )
  const announcements = activeOrgId ? await getDashboardAnnouncements(activeOrgId, session.user.id) : []
  const unreadCount = announcements.filter((announcement) => !announcement.read).length
  const urgentCount = announcements.filter((announcement) => announcement.severity === 'urgente').length

  return (
    <section className="space-y-7 pb-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-brand-accent" /> Portal MEGACORP
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Inicio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Hola {session.user.name ?? session.user.email}. Tablero operativo y acceso a herramientas internas.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.55))]">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/15 p-3 text-primary">
                <Megaphone className="size-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">Tablero de anuncios</h2>
                  {unreadCount > 0 ? (
                    <Badge className="gap-1">
                      <Bell className="size-3" /> {unreadCount} nuevo{unreadCount === 1 ? '' : 's'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Al día</Badge>
                  )}
                  {urgentCount > 0 ? <Badge variant="destructive">{urgentCount} urgente{urgentCount === 1 ? '' : 's'}</Badge> : null}
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Lo importante vive arriba. Si nadie lo lee aquí, ya no era problema de diseño. Probablemente.
                </p>
              </div>
            </div>
            <Link
              href="/app/tools/announcements"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Ver tablero completo
            </Link>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.25fr_1fr_1fr]">
            {announcements.length > 0 ? announcements.map((announcement, index) => (
              <Link
                key={announcement.id}
                href="/app/tools/announcements"
                className={
                  'group rounded-2xl border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ' +
                  (index === 0 ? 'lg:row-span-2' : '')
                }
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge variant={announcement.severity === 'urgente' ? 'destructive' : 'secondary'}>
                    {announcement.severity}
                  </Badge>
                  {!announcement.read ? <span className="size-2 rounded-full bg-primary" /> : null}
                </div>
                <p className={index === 0 ? 'text-lg font-semibold' : 'line-clamp-1 font-semibold'}>{announcement.title}</p>
                <p className={index === 0 ? 'mt-2 line-clamp-5 text-sm leading-6 text-muted-foreground' : 'mt-1 line-clamp-2 text-sm text-muted-foreground'}>
                  {announcement.body}
                </p>
                <p className="mt-3 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">Abrir anuncio →</p>
              </Link>
            )) : (
              <div className="rounded-2xl border border-dashed bg-background/60 p-5 text-sm text-muted-foreground lg:col-span-3">
                Sin anuncios publicados todavía. Sospechosamente tranquilo.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Aplicaciones</h2>
            <p className="text-sm text-muted-foreground">
              Foro y Learning abren como plataformas aparte. El resto queda como herramienta interna del portal.
            </p>
          </div>
          <Badge variant="secondary">{visibleApps.length} disponibles</Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleApps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </div>
    </section>
  )
}

async function getDashboardAnnouncements(orgId: string, userId: string) {
  const rows = await db
    .select({ value: orgSetting.value })
    .from(orgSetting)
    .where(and(eq(orgSetting.organizationId, orgId), eq(orgSetting.key, ANNOUNCEMENTS_KEY)))
    .limit(1)

  return parseAnnouncementsData(rows[0]?.value).announcements
    .filter((announcement) => announcement.status === 'published')
    .slice(0, 5)
    .map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      severity: announcement.severity,
      read: announcement.readBy.includes(userId),
    }))
}
