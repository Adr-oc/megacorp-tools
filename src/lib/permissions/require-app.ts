import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'
import { getApp } from '@/lib/apps/registry'
import type { AppRole } from '@/lib/apps/types'

export async function requireApp(
  appId: string
): Promise<{ userId: string; orgId: string; role: AppRole; isSuperAdmin: boolean }> {
  const app = getApp(appId)
  if (!app) {
    redirect('/app')
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/login')
  }

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) {
    redirect('/app')
  }

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

  const role = (rows[0]?.role ?? 'member') as AppRole

  if (!app.requiredRoles.includes(role)) {
    redirect('/app')
  }

  if (app.status !== 'available') {
    redirect('/app')
  }

  return {
    userId: session.user.id,
    orgId: activeOrgId,
    role,
    isSuperAdmin: session.user.isSuperAdmin === true,
  }
}
