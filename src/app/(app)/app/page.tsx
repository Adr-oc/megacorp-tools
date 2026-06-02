import Link from 'next/link'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { Bell, Grid2X2, Megaphone, ShieldCheck, Sparkles, Zap } from 'lucide-react'
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
  if (!session) {
    return null
  }

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
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, activeOrgId)
        )
      )
      .limit(1)
    role = (rows[0]?.role ?? 'member') as AppRole
  }

  const isSuperAdmin = session.user.isSuperAdmin === true
  const visibleApps = apps.filter(
    (a) => a.requiredRoles.includes(role) || (isSuperAdmin && a.requiredRoles.includes('super-admin')),
  )
  const announcements = activeOrgId ? await getDashboardAnnouncements(activeOrgId, session.user.id) : []
  const unreadCount = announcements.filter((announcement) => !announcement.read).length
  const collaborationApps = visibleApps.filter((app) => ['announcements', 'ideas-board', 'notas', 'learning'].includes(app.id)).length
  const utilityApps = visibleApps.length - collaborationApps

  return (
    <section className="space-y-8 pb-8">
      <div className="relative overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_top_left,hsl(var(--brand-accent)/0.18),transparent_36%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.55))] p-5 shadow-sm md:p-7">
        <div className="absolute right-6 top-6 hidden rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur md:block">
          Portal interno · MEGACORP Tools
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5 text-brand-accent" />
              Suite operativa
            </div>
            <div className="space-y-2">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
                Aplicaciones internas para trabajar con menos fricción.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Hola {session.user.name ?? session.user.email}. Entrá a herramientas, comunicación, conocimiento y aprendizaje desde una sola base. Menos pestañas huérfanas. Algo de civilización.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <HomeMetric icon={Grid2X2} label="Apps disponibles" value={visibleApps.length.toString()} />
              <HomeMetric icon={Zap} label="Colaboración" value={collaborationApps.toString()} />
              <HomeMetric icon={ShieldCheck} label="Rol actual" value={isSuperAdmin ? 'Super Admin' : role} />
            </div>
          </div>
          <Card className="border-brand-accent/20 bg-background/75 backdrop-blur">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Acceso rápido</p>
                  <p className="text-xs text-muted-foreground">Las apps críticas quedan arriba.</p>
                </div>
                <Badge variant="secondary">{utilityApps} utilidades</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <QuickLink href="/app/tools/ideas-board" label="Foro" />
                <QuickLink href="/app/tools/learning" label="Learning" />
                <QuickLink href="/app/tools/notas" label="NOTAS" />
                <QuickLink href="/app/tools/announcements" label="Anuncios" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-muted/60">
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
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Avisos internos visibles antes de que se pierdan en el cementerio de apps.
                </p>
              </div>
            </div>
            <Link
              href="/app/tools/announcements"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Ver anuncios
            </Link>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {announcements.length > 0 ? announcements.map((announcement) => (
              <Link
                key={announcement.id}
                href="/app/tools/announcements"
                className="rounded-2xl border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant={announcement.severity === 'urgente' ? 'destructive' : 'secondary'}>
                    {announcement.severity}
                  </Badge>
                  {!announcement.read ? <span className="size-2 rounded-full bg-primary" /> : null}
                </div>
                <p className="line-clamp-1 font-semibold">{announcement.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{announcement.body}</p>
              </Link>
            )) : (
              <div className="rounded-2xl border border-dashed bg-background/60 p-4 text-sm text-muted-foreground lg:col-span-3">
                Sin anuncios publicados todavía. Sospechosamente tranquilo.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Centro de aplicaciones</h2>
            <p className="text-sm text-muted-foreground">Herramientas agrupadas como productos internos, no como botones abandonados.</p>
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

function HomeMetric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/75 p-3 backdrop-blur">
      <Icon className="mb-2 size-4 text-brand-accent" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize tabular-nums">{value}</p>
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-xl border bg-muted/30 px-3 py-2 font-medium transition hover:bg-muted">
      {label}
    </Link>
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
    .slice(0, 3)
    .map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      severity: announcement.severity,
      read: announcement.readBy.includes(userId),
    }))
}
