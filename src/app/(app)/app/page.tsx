import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { ensureActiveOrganization } from '@/lib/auth/active-organization'
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'
import { apps } from '@/lib/apps/registry'
import { AppCard } from '@/components/apps/app-card'
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

  return (
    <section>
      <h1 className="text-3xl font-bold mb-2">Aplicaciones</h1>
      <p className="text-muted-foreground mb-8">
        Hola {session.user.name ?? session.user.email}. Selecciona una app para empezar.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleApps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </section>
  )
}
