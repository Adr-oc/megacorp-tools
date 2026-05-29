'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import { auth } from '@/lib/auth/server'
import { ensureActiveOrganization } from '@/lib/auth/active-organization'
import { db } from '@/lib/db'
import { orgSetting } from '@/lib/db/schema/app'
import { member, user } from '@/lib/db/schema/auth'
import type { AppRole } from '@/lib/apps/types'
import {
  IDEAS_BOARD_KEY,
  boardSchema,
  commentSchema,
  createIdeaSchema,
  deleteIdeaSchema,
  parseBoard,
  updateStatusSchema,
  voteSchema,
  type IdeasBoard,
  type IdeasBoardView,
} from './schema'

type ActionResult = { ok: true; board: IdeasBoardView } | { ok: false; error: string }

type SessionContext = {
  userId: string
  userName: string
  orgId: string
  role: AppRole
  isSuperAdmin: boolean
  canModerate: boolean
}

const TOOL_PATH = '/app/tools/ideas-board'

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
    .select({ role: member.role, name: user.name })
    .from(member)
    .leftJoin(user, eq(user.id, member.userId))
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, orgId)))
    .limit(1)

  const role = (rows[0]?.role ?? 'member') as AppRole
  const canModerate =
    session.user.isSuperAdmin === true || role === 'admin' || role === 'owner'

  return {
    userId: session.user.id,
    userName: rows[0]?.name ?? session.user.name ?? 'Usuario',
    orgId,
    role,
    isSuperAdmin: session.user.isSuperAdmin === true,
    canModerate,
  }
}

async function readBoard(orgId: string): Promise<IdeasBoard> {
  const rows = await db
    .select({ value: orgSetting.value })
    .from(orgSetting)
    .where(and(eq(orgSetting.organizationId, orgId), eq(orgSetting.key, IDEAS_BOARD_KEY)))
    .limit(1)

  return parseBoard(rows[0]?.value)
}

async function saveBoard(orgId: string, board: IdeasBoard) {
  const value = boardSchema.parse(parseBoard(board))

  await db
    .insert(orgSetting)
    .values({
      organizationId: orgId,
      key: IDEAS_BOARD_KEY,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [orgSetting.organizationId, orgSetting.key],
      set: { value, updatedAt: new Date() },
    })
}

function toView(board: IdeasBoard, ctx: SessionContext): IdeasBoardView {
  return {
    ...parseBoard(board),
    currentUserId: ctx.userId,
    canModerate: ctx.canModerate,
  }
}

function actionError(error: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : 'No se pudo completar la acción',
  }
}

export async function getIdeasBoard(): Promise<IdeasBoardView> {
  const ctx = await getSessionContext()
  const board = await readBoard(ctx.orgId)
  return toView(board, ctx)
}

export async function createIdea(input: unknown): Promise<ActionResult> {
  try {
    const ctx = await getSessionContext()
    const parsed = createIdeaSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
    }

    const now = new Date().toISOString()
    const board = await readBoard(ctx.orgId)
    board.ideas.push({
      id: ulid(),
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      status: 'abierta',
      authorId: ctx.userId,
      authorName: ctx.userName,
      createdAt: now,
      updatedAt: now,
      votes: [],
      comments: [],
    })

    await saveBoard(ctx.orgId, board)
    revalidatePath(TOOL_PATH)
    return { ok: true, board: toView(board, ctx) }
  } catch (error) {
    return actionError(error)
  }
}

export async function toggleVote(input: unknown): Promise<ActionResult> {
  try {
    const ctx = await getSessionContext()
    const parsed = voteSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Voto inválido' }

    const board = await readBoard(ctx.orgId)
    const idea = board.ideas.find((item) => item.id === parsed.data.ideaId)
    if (!idea) return { ok: false, error: 'Propuesta no encontrada' }

    if (idea.votes.includes(ctx.userId)) {
      idea.votes = idea.votes.filter((id) => id !== ctx.userId)
    } else {
      idea.votes = [...idea.votes, ctx.userId]
    }
    idea.updatedAt = new Date().toISOString()

    await saveBoard(ctx.orgId, board)
    revalidatePath(TOOL_PATH)
    return { ok: true, board: toView(board, ctx) }
  } catch (error) {
    return actionError(error)
  }
}

export async function addComment(input: unknown): Promise<ActionResult> {
  try {
    const ctx = await getSessionContext()
    const parsed = commentSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Comentario inválido' }
    }

    const board = await readBoard(ctx.orgId)
    const idea = board.ideas.find((item) => item.id === parsed.data.ideaId)
    if (!idea) return { ok: false, error: 'Propuesta no encontrada' }

    const now = new Date().toISOString()
    idea.comments.push({
      id: ulid(),
      body: parsed.data.body,
      authorId: ctx.userId,
      authorName: ctx.userName,
      createdAt: now,
    })
    idea.updatedAt = now

    await saveBoard(ctx.orgId, board)
    revalidatePath(TOOL_PATH)
    return { ok: true, board: toView(board, ctx) }
  } catch (error) {
    return actionError(error)
  }
}

export async function updateIdeaStatus(input: unknown): Promise<ActionResult> {
  try {
    const ctx = await getSessionContext()
    if (!ctx.canModerate) return { ok: false, error: 'No tenés permiso para cambiar estados' }

    const parsed = updateStatusSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Estado inválido' }

    const board = await readBoard(ctx.orgId)
    const idea = board.ideas.find((item) => item.id === parsed.data.ideaId)
    if (!idea) return { ok: false, error: 'Propuesta no encontrada' }

    idea.status = parsed.data.status
    idea.updatedAt = new Date().toISOString()

    await saveBoard(ctx.orgId, board)
    revalidatePath(TOOL_PATH)
    return { ok: true, board: toView(board, ctx) }
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteIdea(input: unknown): Promise<ActionResult> {
  try {
    const ctx = await getSessionContext()
    if (!ctx.canModerate) return { ok: false, error: 'No tenés permiso para borrar propuestas' }

    const parsed = deleteIdeaSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Propuesta inválida' }

    const board = await readBoard(ctx.orgId)
    const exists = board.ideas.some((item) => item.id === parsed.data.ideaId)
    if (!exists) return { ok: false, error: 'Propuesta no encontrada' }

    board.ideas = board.ideas.filter((item) => item.id !== parsed.data.ideaId)

    await saveBoard(ctx.orgId, board)
    revalidatePath(TOOL_PATH)
    return { ok: true, board: toView(board, ctx) }
  } catch (error) {
    return actionError(error)
  }
}
