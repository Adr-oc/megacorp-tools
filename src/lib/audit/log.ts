import { db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema/app'

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.profile_updated'
  | 'org.updated'
  | 'org.member_invited'
  | 'org.member_removed'
  | 'org.member_role_changed'

export async function logAudit(args: {
  action: AuditAction
  userId?: string
  organizationId?: string
  target?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      action: args.action,
      userId: args.userId ?? null,
      organizationId: args.organizationId ?? null,
      target: args.target ?? null,
      metadata: args.metadata ?? null,
    })
  } catch (err) {
    console.error('[audit] error logging:', err)
  }
}
