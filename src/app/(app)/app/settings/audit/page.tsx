import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { ensureActiveOrganization } from '@/lib/auth/active-organization'
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'
import { TrackSettings } from '../_track-settings'

export default async function AuditPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const activeOrgId = await ensureActiveOrganization({
    sessionId: session.session.id,
    userId: session.user.id,
    currentOrganizationId: session.session.activeOrganizationId,
  })
  let role: 'owner' | 'admin' | 'member' = 'member'
  if (activeOrgId) {
    const [m] = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrgId)))
      .limit(1)
    role = (m?.role ?? 'member') as typeof role
  }
  if (role === 'member') {
    return <p className="text-muted-foreground">No tenés acceso a esta sección.</p>
  }
  return (
    <div>
      <TrackSettings />
      <h1 className="text-2xl font-bold mb-2">Audit log</h1>
      <p className="text-muted-foreground mb-6">Registro de eventos de la organización.</p>
      <div className="rounded-lg border bg-muted/30 p-12 text-center">
        <p className="text-sm text-muted-foreground">Próximamente.</p>
      </div>
    </div>
  )
}
