import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { invitation, member, organization, user } from '@/lib/db/schema/auth'
import { apps } from '@/lib/apps/registry'
import { coerceAccent } from '@/lib/accent/presets'
import { OnboardingFlow } from './onboarding-flow'

export default async function OnboardingPage() {
  const session = (await auth.api.getSession({ headers: await headers() }))!
  const activeOrgId = session.session.activeOrganizationId

  const u = session.user
  const accent = coerceAccent((u as { accentColor?: unknown }).accentColor)

  let orgName: string | null = null
  let role: 'owner' | 'admin' | 'member' = 'member'
  let inviterName: string | null = null

  if (activeOrgId) {
    const [org] = await db.select().from(organization).where(eq(organization.id, activeOrgId)).limit(1)
    orgName = org?.name ?? null

    const [m] = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, u.id), eq(member.organizationId, activeOrgId)))
      .limit(1)
    role = (m?.role ?? 'member') as 'owner' | 'admin' | 'member'

    const [inv] = await db
      .select()
      .from(invitation)
      .where(and(eq(invitation.email, u.email), eq(invitation.organizationId, activeOrgId)))
      .limit(1)
    if (inv?.inviterId) {
      const [inviter] = await db.select({ name: user.name }).from(user).where(eq(user.id, inv.inviterId)).limit(1)
      inviterName = inviter?.name ?? null
    }
  }

  const appsCount = apps.filter((a) => a.status === 'available' && a.requiredRoles.includes(role)).length

  return (
    <OnboardingFlow
      data={{
        name: u.name,
        email: u.email,
        accent,
        orgName,
        role,
        inviterName,
        appsCount,
      }}
    />
  )
}
