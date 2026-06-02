'use server'

import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'

import { ensureActiveOrganization } from '@/lib/auth/active-organization'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { appSetting, orgSetting } from '@/lib/db/schema/app'
import { member } from '@/lib/db/schema/auth'
import {
  LEARNING_LIBRARY_KEY,
  LEARNING_PROGRESS_KEY,
  emptyLibrary,
  emptyProgressSet,
  learningContentInputSchema,
  learningLibrarySchema,
  learningRouteInputSchema,
  learningProgressSetSchema,
  progressInputSchema,
  type LearningContent,
  type LearningLibrary,
  type LearningProgressSet,
  type LearningRoute,
} from './schema'

type SessionContext = {
  userId: string
  orgId: string
  role: string
  isSuperAdmin: boolean
}

export type LearningHubData = {
  library: LearningLibrary
  progress: LearningProgressSet
  isAdmin: boolean
}

type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string }

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
    orgId,
    role: rows[0]?.role ?? 'member',
    isSuperAdmin: session.user.isSuperAdmin === true,
  }
}

function canManage(ctx: SessionContext) {
  return ctx.isSuperAdmin || ctx.role === 'admin' || ctx.role === 'owner'
}

async function readLibrary(orgId: string): Promise<LearningLibrary> {
  const rows = await db
    .select({ value: orgSetting.value })
    .from(orgSetting)
    .where(and(eq(orgSetting.organizationId, orgId), eq(orgSetting.key, LEARNING_LIBRARY_KEY)))
    .limit(1)

  if (!rows[0]) return emptyLibrary
  const parsed = learningLibrarySchema.safeParse(rows[0].value)
  if (!parsed.success) return emptyLibrary

  return {
    contents: [...parsed.data.contents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    routes: [...parsed.data.routes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  }
}

async function writeLibrary(orgId: string, library: LearningLibrary) {
  await db
    .insert(orgSetting)
    .values({
      organizationId: orgId,
      key: LEARNING_LIBRARY_KEY,
      value: library,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [orgSetting.organizationId, orgSetting.key],
      set: { value: library, updatedAt: new Date() },
    })
}

async function readProgress(userId: string): Promise<LearningProgressSet> {
  const rows = await db
    .select({ value: appSetting.value })
    .from(appSetting)
    .where(and(eq(appSetting.userId, userId), eq(appSetting.key, LEARNING_PROGRESS_KEY)))
    .limit(1)

  if (!rows[0]) return emptyProgressSet
  const parsed = learningProgressSetSchema.safeParse(rows[0].value)
  return parsed.success ? parsed.data : emptyProgressSet
}

async function writeProgress(userId: string, progress: LearningProgressSet) {
  await db
    .insert(appSetting)
    .values({
      userId,
      key: LEARNING_PROGRESS_KEY,
      value: progress,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [appSetting.userId, appSetting.key],
      set: { value: progress, updatedAt: new Date() },
    })
}

export async function getLearningHubData(): Promise<LearningHubData> {
  const ctx = await getSessionContext()
  const [library, progress] = await Promise.all([
    readLibrary(ctx.orgId),
    readProgress(ctx.userId),
  ])

  return {
    library,
    progress,
    isAdmin: canManage(ctx),
  }
}

export async function saveLearningContent(input: unknown): Promise<ActionResult<{ content: LearningContent }>> {
  const ctx = await getSessionContext()
  if (!canManage(ctx)) return { ok: false, error: 'No tenés permiso para administrar contenidos' }

  const parsed = learningContentInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const now = new Date().toISOString()
  const library = await readLibrary(ctx.orgId)
  const existing = parsed.data.id
    ? library.contents.find((content) => content.id === parsed.data.id)
    : undefined

  const content: LearningContent = {
    ...parsed.data,
    id: parsed.data.id ?? randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  const contents = existing
    ? library.contents.map((item) => (item.id === content.id ? content : item))
    : [content, ...library.contents]

  await writeLibrary(ctx.orgId, { ...library, contents })
  revalidatePath('/app/tools/learning')

  return { ok: true, content }
}

export async function deleteLearningContent(contentId: string): Promise<ActionResult> {
  const ctx = await getSessionContext()
  if (!canManage(ctx)) return { ok: false, error: 'No tenés permiso para eliminar contenidos' }

  const library = await readLibrary(ctx.orgId)
  await writeLibrary(ctx.orgId, {
    ...library,
    contents: library.contents.filter((content) => content.id !== contentId),
  })
  revalidatePath('/app/tools/learning')

  return { ok: true }
}


export async function saveLearningRoute(input: unknown): Promise<ActionResult<{ route: LearningRoute }>> {
  const ctx = await getSessionContext()
  if (!canManage(ctx)) return { ok: false, error: 'No tenés permiso para administrar rutas' }

  const parsed = learningRouteInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const now = new Date().toISOString()
  const library = await readLibrary(ctx.orgId)
  const existing = parsed.data.id
    ? library.routes.find((route) => route.id === parsed.data.id)
    : undefined

  const route: LearningRoute = {
    ...parsed.data,
    id: parsed.data.id ?? randomUUID(),
    courses: parsed.data.courses.map((course) => ({
      ...course,
      id: course.id ?? randomUUID(),
      resources: course.resources.map((resource) => ({
        ...resource,
        id: resource.id ?? randomUUID(),
      })),
    })),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  const routes = existing
    ? library.routes.map((item) => (item.id === route.id ? route : item))
    : [route, ...library.routes]

  await writeLibrary(ctx.orgId, { ...library, routes })
  revalidatePath('/app/tools/learning')

  return { ok: true, route }
}

export async function deleteLearningRoute(routeId: string): Promise<ActionResult> {
  const ctx = await getSessionContext()
  if (!canManage(ctx)) return { ok: false, error: 'No tenés permiso para eliminar rutas' }

  const library = await readLibrary(ctx.orgId)
  await writeLibrary(ctx.orgId, {
    ...library,
    routes: library.routes.filter((route) => route.id !== routeId),
  })
  revalidatePath('/app/tools/learning')

  return { ok: true }
}

export async function updateLearningProgress(input: unknown): Promise<ActionResult> {
  const ctx = await getSessionContext()
  const parsed = progressInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const library = await readLibrary(ctx.orgId)
  const content = library.contents.find((item) => item.id === parsed.data.contentId)
  const resource = library.routes
    .filter((route) => route.published)
    .flatMap((route) => route.courses)
    .flatMap((course) => course.resources)
    .find((item) => item.id === parsed.data.contentId)
  if ((!content || !content.published) && !resource) return { ok: false, error: 'Contenido no disponible' }

  const current = await readProgress(ctx.userId)
  const entry = {
    contentId: parsed.data.contentId,
    status: parsed.data.status,
    updatedAt: new Date().toISOString(),
  }
  const exists = current.progress.some((item) => item.contentId === entry.contentId)
  const progress = exists
    ? current.progress.map((item) => (item.contentId === entry.contentId ? entry : item))
    : [entry, ...current.progress]

  await writeProgress(ctx.userId, { progress })
  revalidatePath('/app/tools/learning')

  return { ok: true }
}
