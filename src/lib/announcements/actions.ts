'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'

import { auth } from '@/lib/auth/server'
import { ensureActiveOrganization } from '@/lib/auth/active-organization'
import { db } from '@/lib/db'
import { orgSetting } from '@/lib/db/schema/app'
import { member } from '@/lib/db/schema/auth'
import {
  ANNOUNCEMENTS_KEY,
  announcementInputSchema,
  announcementReadInputSchema,
  parseAnnouncementsData,
  type Announcement,
  type AnnouncementsData,
} from './schema'

type SessionContext = {
  userId: string
  orgId: string
  role: string
  isSuperAdmin: boolean
  userName?: string
}

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string }

async function getSessionContext(): Promise<SessionContext> {
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

  return {
    userId: session.user.id,
    orgId,
    role: rows[0]?.role ?? 'member',
    isSuperAdmin: session.user.isSuperAdmin === true,
    userName: session.user.name ?? session.user.email ?? undefined,
  }
}

function canManage(ctx: SessionContext) {
  return ctx.isSuperAdmin || ctx.role === 'admin' || ctx.role === 'owner'
}

async function readData(orgId: string): Promise<AnnouncementsData> {
  const rows = await db
    .select({ value: orgSetting.value })
    .from(orgSetting)
    .where(
      and(
        eq(orgSetting.organizationId, orgId),
        eq(orgSetting.key, ANNOUNCEMENTS_KEY)
      )
    )
    .limit(1)

  return parseAnnouncementsData(rows[0]?.value)
}

async function writeData(orgId: string, data: AnnouncementsData) {
  await db
    .insert(orgSetting)
    .values({
      organizationId: orgId,
      key: ANNOUNCEMENTS_KEY,
      value: data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [orgSetting.organizationId, orgSetting.key],
      set: { value: data, updatedAt: new Date() },
    })
}

function visibleAnnouncements(
  announcements: Announcement[],
  includeDrafts: boolean
): Announcement[] {
  return includeDrafts
    ? announcements
    : announcements.filter((announcement) => announcement.status === 'published')
}

export async function getAnnouncementsBoard(): Promise<{
  announcements: Announcement[]
  currentUserId: string
}> {
  const ctx = await getSessionContext()
  const data = await readData(ctx.orgId)
  return {
    announcements: visibleAnnouncements(data.announcements, canManage(ctx)),
    currentUserId: ctx.userId,
  }
}

export async function saveAnnouncement(input: unknown): Promise<ActionResult<Announcement>> {
  const ctx = await getSessionContext()
  if (!canManage(ctx)) {
    return { ok: false, error: 'No tenés permiso para guardar anuncios' }
  }

  const parsed = announcementInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Datos inválidos',
    }
  }

  const now = new Date().toISOString()
  const data = await readData(ctx.orgId)
  const existing = parsed.data.id
    ? data.announcements.find((announcement) => announcement.id === parsed.data.id)
    : undefined

  const announcement: Announcement = {
    id: existing?.id ?? crypto.randomUUID(),
    title: parsed.data.title,
    body: parsed.data.body,
    severity: parsed.data.severity,
    status: parsed.data.status,
    sendByEmail: parsed.data.sendByEmail,
    emailStatus: parsed.data.sendByEmail ? 'pending' : 'none',
    authorId: existing?.authorId ?? ctx.userId,
    authorName: existing?.authorName ?? ctx.userName,
    readBy: existing?.readBy ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  const announcements = existing
    ? data.announcements.map((item) =>
        item.id === announcement.id ? announcement : item
      )
    : [announcement, ...data.announcements]

  await writeData(ctx.orgId, { announcements })
  revalidatePath('/app/tools/announcements')
  return { ok: true, data: announcement }
}

export async function deleteAnnouncement(input: unknown): Promise<ActionResult> {
  const ctx = await getSessionContext()
  if (!canManage(ctx)) {
    return { ok: false, error: 'No tenés permiso para borrar anuncios' }
  }

  const parsed = announcementReadInputSchema.pick({ id: true }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Anuncio inválido' }

  const data = await readData(ctx.orgId)
  await writeData(ctx.orgId, {
    announcements: data.announcements.filter(
      (announcement) => announcement.id !== parsed.data.id
    ),
  })
  revalidatePath('/app/tools/announcements')
  return { ok: true }
}

export async function markAnnouncementRead(input: unknown): Promise<ActionResult<Announcement>> {
  const ctx = await getSessionContext()
  const parsed = announcementReadInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Anuncio inválido' }

  const data = await readData(ctx.orgId)
  const announcement = data.announcements.find((item) => item.id === parsed.data.id)
  if (!announcement || announcement.status !== 'published') {
    return { ok: false, error: 'Anuncio no disponible' }
  }

  const readBy = new Set(announcement.readBy)
  if (parsed.data.read) readBy.add(ctx.userId)
  else readBy.delete(ctx.userId)

  const updated: Announcement = {
    ...announcement,
    readBy: Array.from(readBy),
    updatedAt: new Date().toISOString(),
  }

  await writeData(ctx.orgId, {
    announcements: data.announcements.map((item) =>
      item.id === updated.id ? updated : item
    ),
  })
  revalidatePath('/app/tools/announcements')
  return { ok: true, data: updated }
}
