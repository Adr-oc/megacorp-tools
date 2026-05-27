'use server'

import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth/server'
import { ensureActiveOrganization } from '@/lib/auth/active-organization'
import { db } from '@/lib/db'
import { appSetting, orgSetting } from '@/lib/db/schema/app'
import { member } from '@/lib/db/schema/auth'
import {
  DATA_KEY,
  TEMPLATE_KEY,
  dataSchema,
  migrateTemplateValue,
  templateSetSchema,
  type SignatureData,
  type SignatureTemplate,
} from './schema'

type Session = {
  userId: string
  orgId: string
  role: string
  isSuperAdmin: boolean
}

async function getSessionContext(): Promise<Session> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('No autenticado')
  const orgId = await ensureActiveOrganization({
    sessionId: session.session.id,
    userId: session.user.id,
    currentOrganizationId: session.session.activeOrganizationId,
  })
  if (!orgId) throw new Error('Sin organización activa')

  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, session.user.id), eq(member.organizationId, orgId))
    )
    .limit(1)

  const role = rows[0]?.role ?? 'member'
  return {
    userId: session.user.id,
    orgId,
    role,
    isSuperAdmin: session.user.isSuperAdmin === true,
  }
}

// Devuelve el array de plantillas de la organización, migrando el formato viejo
// (una sola plantilla bajo TEMPLATE_KEY sin array) a la forma nueva.
export async function getTemplates(): Promise<SignatureTemplate[]> {
  const { orgId } = await getSessionContext()
  const rows = await db
    .select({ value: orgSetting.value })
    .from(orgSetting)
    .where(and(eq(orgSetting.organizationId, orgId), eq(orgSetting.key, TEMPLATE_KEY)))
    .limit(1)
  if (!rows[0]) return []
  const migrated = migrateTemplateValue(rows[0].value)
  return migrated ? migrated.templates : []
}

export async function getUserData(): Promise<SignatureData> {
  const { userId } = await getSessionContext()
  const rows = await db
    .select({ value: appSetting.value })
    .from(appSetting)
    .where(and(eq(appSetting.userId, userId), eq(appSetting.key, DATA_KEY)))
    .limit(1)
  if (!rows[0]) return { values: {} }
  const parsed = dataSchema.safeParse(rows[0].value)
  return parsed.success ? parsed.data : { values: {} }
}

export async function saveTemplates(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getSessionContext()
  // SEGURIDAD: solo admin/owner pueden guardar las plantillas de la org.
  if (!ctx.isSuperAdmin && ctx.role !== 'admin' && ctx.role !== 'owner') {
    return { ok: false, error: 'No tenés permiso para definir las plantillas' }
  }

  const parsed = templateSetSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  await db
    .insert(orgSetting)
    .values({
      organizationId: ctx.orgId,
      key: TEMPLATE_KEY,
      value: parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [orgSetting.organizationId, orgSetting.key],
      set: { value: parsed.data, updatedAt: new Date() },
    })

  revalidatePath('/app/tools/email-signature')
  return { ok: true }
}

export async function saveUserData(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getSessionContext()

  const parsed = dataSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  await db
    .insert(appSetting)
    .values({
      userId: ctx.userId,
      key: DATA_KEY,
      value: parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [appSetting.userId, appSetting.key],
      set: { value: parsed.data, updatedAt: new Date() },
    })

  revalidatePath('/app/tools/email-signature')
  return { ok: true }
}
