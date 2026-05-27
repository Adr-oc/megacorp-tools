import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { member, session as authSession } from '@/lib/db/schema/auth'

export async function ensureActiveOrganization(input: {
  sessionId: string
  userId: string
  currentOrganizationId?: string | null
}): Promise<string | null> {
  const { sessionId, userId, currentOrganizationId } = input

  if (currentOrganizationId) {
    const [existing] = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, currentOrganizationId)
        )
      )
      .limit(1)

    if (existing) return currentOrganizationId
  }

  const [firstMembership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1)

  const organizationId = firstMembership?.organizationId ?? null
  if (!organizationId) return null

  await db
    .update(authSession)
    .set({ activeOrganizationId: organizationId })
    .where(eq(authSession.id, sessionId))

  return organizationId
}
