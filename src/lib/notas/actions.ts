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
  MAX_NOTAS_PAGES,
  NOTAS_KEY,
  emptyNotasWorkspace,
  normalizeNotasTags,
  notasPageIdSchema,
  notasWorkspaceSchema,
  saveNotasPageSchema,
  type NotasPage,
  type NotasWorkspace,
} from './schema'

type SessionContext = {
  userId: string
  userName?: string
  orgId: string
  role: string
  isSuperAdmin: boolean
}

type NotasResult<T> = { ok: true; data: T } | { ok: false; error: string }

const NOTAS_PATH = '/app/tools/notas'

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
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, orgId)))
    .limit(1)

  return {
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? undefined,
    orgId,
    role: rows[0]?.role ?? 'member',
    isSuperAdmin: session.user.isSuperAdmin === true,
  }
}

function canManageDangerousActions(ctx: SessionContext) {
  return ctx.isSuperAdmin || ctx.role === 'admin' || ctx.role === 'owner'
}

async function readWorkspace(orgId: string): Promise<NotasWorkspace> {
  const rows = await db
    .select({ value: orgSetting.value })
    .from(orgSetting)
    .where(and(eq(orgSetting.organizationId, orgId), eq(orgSetting.key, NOTAS_KEY)))
    .limit(1)

  if (!rows[0]) return emptyNotasWorkspace()

  const parsed = notasWorkspaceSchema.safeParse(rows[0].value)
  return parsed.success ? parsed.data : emptyNotasWorkspace()
}

async function writeWorkspace(orgId: string, workspace: NotasWorkspace) {
  await db
    .insert(orgSetting)
    .values({
      organizationId: orgId,
      key: NOTAS_KEY,
      value: workspace,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [orgSetting.organizationId, orgSetting.key],
      set: { value: workspace, updatedAt: new Date() },
    })

  revalidatePath(NOTAS_PATH)
}

export async function getNotasWorkspace(): Promise<
  NotasResult<{ workspace: NotasWorkspace; userId: string; canDelete: boolean }>
> {
  try {
    const ctx = await getSessionContext()
    const workspace = await readWorkspace(ctx.orgId)
    return {
      ok: true,
      data: {
        workspace,
        userId: ctx.userId,
        canDelete: canManageDangerousActions(ctx),
      },
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo cargar NOTAS' }
  }
}

export async function saveNotasPage(input: unknown): Promise<NotasResult<NotasPage>> {
  try {
    const ctx = await getSessionContext()
    const parsed = saveNotasPageSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
    }

    const workspace = await readWorkspace(ctx.orgId)
    const now = new Date().toISOString()
    const existingIndex = parsed.data.id
      ? workspace.pages.findIndex((page) => page.id === parsed.data.id)
      : -1

    if (existingIndex === -1 && workspace.pages.length >= MAX_NOTAS_PAGES) {
      return { ok: false, error: `Máximo ${MAX_NOTAS_PAGES} páginas por organización` }
    }

    const normalizedTags = normalizeNotasTags(parsed.data.tags)

    const page: NotasPage =
      existingIndex >= 0
        ? {
            ...workspace.pages[existingIndex]!,
            title: parsed.data.title,
            icon: parsed.data.icon || '📝',
            content: parsed.data.content,
            tags: normalizedTags,
            updatedAt: now,
            lastEditedById: ctx.userId,
            lastEditedByName: ctx.userName,
          }
        : {
            id: crypto.randomUUID(),
            title: parsed.data.title,
            icon: parsed.data.icon || '📝',
            content: parsed.data.content,
            tags: normalizedTags,
            favoriteBy: [],
            archived: false,
            createdAt: now,
            updatedAt: now,
            authorId: ctx.userId,
            authorName: ctx.userName,
            lastEditedById: ctx.userId,
            lastEditedByName: ctx.userName,
          }

    const nextPages = existingIndex >= 0 ? [...workspace.pages] : [page, ...workspace.pages]
    if (existingIndex >= 0) nextPages[existingIndex] = page

    await writeWorkspace(ctx.orgId, { version: 1, pages: nextPages })
    return { ok: true, data: page }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo guardar' }
  }
}

export async function toggleNotasFavorite(input: unknown): Promise<NotasResult<NotasPage>> {
  try {
    const ctx = await getSessionContext()
    const parsed = notasPageIdSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Página inválida' }

    const workspace = await readWorkspace(ctx.orgId)
    const index = workspace.pages.findIndex((page) => page.id === parsed.data.id)
    if (index === -1) return { ok: false, error: 'No se encontró la página' }

    const current = workspace.pages[index]!
    const favoriteBy = current.favoriteBy.includes(ctx.userId)
      ? current.favoriteBy.filter((id) => id !== ctx.userId)
      : [...current.favoriteBy, ctx.userId]
    const page: NotasPage = { ...current, favoriteBy }
    const pages = [...workspace.pages]
    pages[index] = page

    await writeWorkspace(ctx.orgId, { version: 1, pages })
    return { ok: true, data: page }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo marcar favorita' }
  }
}

export async function duplicateNotasPage(input: unknown): Promise<NotasResult<NotasPage>> {
  try {
    const ctx = await getSessionContext()
    const parsed = notasPageIdSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Página inválida' }

    const workspace = await readWorkspace(ctx.orgId)
    if (workspace.pages.length >= MAX_NOTAS_PAGES) {
      return { ok: false, error: `Máximo ${MAX_NOTAS_PAGES} páginas por organización` }
    }

    const source = workspace.pages.find((page) => page.id === parsed.data.id)
    if (!source) return { ok: false, error: 'No se encontró la página' }

    const now = new Date().toISOString()
    const page: NotasPage = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title} (copia)`,
      favoriteBy: [],
      archived: false,
      createdAt: now,
      updatedAt: now,
      authorId: ctx.userId,
      authorName: ctx.userName,
      lastEditedById: ctx.userId,
      lastEditedByName: ctx.userName,
    }

    await writeWorkspace(ctx.orgId, { version: 1, pages: [page, ...workspace.pages] })
    return { ok: true, data: page }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo duplicar' }
  }
}

export async function archiveNotasPage(input: unknown): Promise<NotasResult<{ id: string }>> {
  try {
    const ctx = await getSessionContext()
    if (!canManageDangerousActions(ctx)) {
      return { ok: false, error: 'Solo admin/owner puede archivar páginas' }
    }

    const parsed = notasPageIdSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Página inválida' }

    const workspace = await readWorkspace(ctx.orgId)
    const pages = workspace.pages.map((page) =>
      page.id === parsed.data.id
        ? {
            ...page,
            archived: true,
            updatedAt: new Date().toISOString(),
            lastEditedById: ctx.userId,
            lastEditedByName: ctx.userName,
          }
        : page
    )

    await writeWorkspace(ctx.orgId, { version: 1, pages })
    return { ok: true, data: { id: parsed.data.id } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo archivar' }
  }
}

export async function deleteNotasPage(input: unknown): Promise<NotasResult<{ id: string }>> {
  return archiveNotasPage(input)
}
