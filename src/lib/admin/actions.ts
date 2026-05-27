'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { invitation, member, organization, user } from '@/lib/db/schema/auth'
import { requireSuperAdmin } from '@/lib/permissions/require-super-admin'

// ---------------------------------------------------------------------------
// Server actions del panel Super Admin (Fase C — cross-org).
//
// SEGURIDAD: TODAS las acciones empiezan con `await requireSuperAdmin()`, que
// verifica session.user.isSuperAdmin === true y redirige si no lo es. Un
// owner/admin/member normal NO puede ejecutar ninguna de estas acciones ni
// listar datos cross-org. Se usa `db` directo (no las APIs de Better Auth
// /organization/* que asumen una org activa del usuario).
// ---------------------------------------------------------------------------

const ROLES = ['owner', 'admin', 'member'] as const

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ===========================================================================
// ORGANIZACIONES
// ===========================================================================

export type OrgNode = {
  id: string
  name: string
  slug: string
  parentOrganizationId: string | null
  isParent: boolean
  memberCount: number
  owners: { name: string | null; email: string }[]
  affiliates: OrgNode[]
}

/**
 * Lista TODAS las organizaciones (cross-org) en estructura jerárquica:
 * orgs madre (parentOrganizationId null) con sus afiliadas anidadas. Incluye
 * conteo de miembros y owners por org.
 */
export async function listOrganizations(): Promise<OrgNode[]> {
  await requireSuperAdmin()

  const orgs = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      parentOrganizationId: organization.parentOrganizationId,
    })
    .from(organization)

  const counts = await db
    .select({ orgId: member.organizationId, c: sql<number>`count(*)::int` })
    .from(member)
    .groupBy(member.organizationId)
  const countMap = new Map(counts.map((r) => [r.orgId, Number(r.c)]))

  const ownerRows = await db
    .select({ orgId: member.organizationId, name: user.name, email: user.email })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.role, 'owner'))
  const ownerMap = new Map<string, { name: string | null; email: string }[]>()
  for (const r of ownerRows) {
    const arr = ownerMap.get(r.orgId) ?? []
    arr.push({ name: r.name, email: r.email })
    ownerMap.set(r.orgId, arr)
  }

  const base = orgs.map(
    (o): OrgNode => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      parentOrganizationId: o.parentOrganizationId,
      isParent: o.parentOrganizationId === null,
      memberCount: countMap.get(o.id) ?? 0,
      owners: ownerMap.get(o.id) ?? [],
      affiliates: [],
    }),
  )

  const byId = new Map(base.map((o) => [o.id, o]))
  const roots: OrgNode[] = []
  for (const node of base) {
    if (node.parentOrganizationId && byId.has(node.parentOrganizationId)) {
      byId.get(node.parentOrganizationId)!.affiliates.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortByName = (a: OrgNode, b: OrgNode) => a.name.localeCompare(b.name)
  roots.sort(sortByName)
  for (const r of roots) r.affiliates.sort(sortByName)
  return roots
}

const createOrgSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  slug: z.string().trim().max(120).optional(),
  parentOrganizationId: z.string().trim().min(1).nullable().optional(),
})

type ActionResult = { ok: true } | { ok: false; error: string }

/** Crea una organización. Si parentOrganizationId es null/undefined → madre; si apunta a una madre → afiliada. */
export async function createOrganization(
  input: z.infer<typeof createOrgSchema>,
): Promise<ActionResult> {
  await requireSuperAdmin()
  const parsed = createOrgSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }
  const { name } = parsed.data
  const parentId = parsed.data.parentOrganizationId ?? null
  const slug = slugify(parsed.data.slug && parsed.data.slug.length > 0 ? parsed.data.slug : name)
  if (!slug) return { ok: false, error: 'El slug resultante está vacío' }

  // Slug único
  const [dup] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1)
  if (dup) return { ok: false, error: `El slug "${slug}" ya está en uso` }

  // Si tiene madre, validar que la madre exista y sea raíz (árbol de 2 niveles, §9)
  if (parentId) {
    const [parent] = await db
      .select({ id: organization.id, parentOrganizationId: organization.parentOrganizationId })
      .from(organization)
      .where(eq(organization.id, parentId))
      .limit(1)
    if (!parent) return { ok: false, error: 'La organización madre no existe' }
    if (parent.parentOrganizationId !== null) {
      return { ok: false, error: 'Una afiliada no puede ser madre de otra (máx. 2 niveles)' }
    }
  }

  await db.insert(organization).values({
    id: randomUUID(),
    name,
    slug,
    createdAt: new Date(),
    parentOrganizationId: parentId,
  })
  return { ok: true }
}

const updateOrgSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  slug: z.string().trim().min(1, 'El slug es obligatorio').max(120),
  parentOrganizationId: z.string().trim().min(1).nullable().optional(),
})

/** Edita nombre, slug y/o madre de una org. Valida la jerarquía de 2 niveles. */
export async function updateOrganization(
  input: z.infer<typeof updateOrgSchema>,
): Promise<ActionResult> {
  await requireSuperAdmin()
  const parsed = updateOrgSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }
  const { id, name } = parsed.data
  const parentId = parsed.data.parentOrganizationId ?? null
  const slug = slugify(parsed.data.slug)
  if (!slug) return { ok: false, error: 'El slug resultante está vacío' }

  const [current] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, id))
    .limit(1)
  if (!current) return { ok: false, error: 'La organización no existe' }

  // Slug único (excluyendo a sí misma)
  const [dup] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1)
  if (dup && dup.id !== id) return { ok: false, error: `El slug "${slug}" ya está en uso` }

  if (parentId) {
    if (parentId === id) return { ok: false, error: 'Una org no puede ser su propia madre' }
    const [parent] = await db
      .select({ id: organization.id, parentOrganizationId: organization.parentOrganizationId })
      .from(organization)
      .where(eq(organization.id, parentId))
      .limit(1)
    if (!parent) return { ok: false, error: 'La organización madre no existe' }
    if (parent.parentOrganizationId !== null) {
      return { ok: false, error: 'Una afiliada no puede ser madre de otra (máx. 2 niveles)' }
    }
    // Esta org no puede volverse afiliada si ya tiene afiliadas propias.
    const [child] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.parentOrganizationId, id))
      .limit(1)
    if (child) {
      return { ok: false, error: 'Esta org tiene afiliadas; no puede convertirse en afiliada' }
    }
  }

  await db
    .update(organization)
    .set({ name, slug, parentOrganizationId: parentId })
    .where(eq(organization.id, id))
  return { ok: true }
}

const deleteOrgSchema = z.object({ id: z.string().trim().min(1) })

/**
 * Borra una organización. Limpia members e invitations de esa org y
 * desvincula a sus afiliadas (parentOrganizationId → null). La confirmación
 * y los warnings (tiene miembros / afiliadas) se manejan en la UI.
 */
export async function deleteOrganization(
  input: z.infer<typeof deleteOrgSchema>,
): Promise<ActionResult> {
  await requireSuperAdmin()
  const parsed = deleteOrgSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }
  const { id } = parsed.data

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, id))
    .limit(1)
  if (!org) return { ok: false, error: 'La organización no existe' }

  // Desvincular afiliadas (parent_organization_id no tiene FK cascade)
  await db
    .update(organization)
    .set({ parentOrganizationId: null })
    .where(eq(organization.parentOrganizationId, id))

  // Limpiar members e invitations explícitamente
  await db.delete(invitation).where(eq(invitation.organizationId, id))
  await db.delete(member).where(eq(member.organizationId, id))
  await db.delete(organization).where(eq(organization.id, id))
  return { ok: true }
}

// ===========================================================================
// USUARIOS
// ===========================================================================

export type UserRow = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  isSuperAdmin: boolean
  memberships: { organizationId: string; organizationName: string; role: string }[]
}

/** Lista TODOS los usuarios (cross-org) con sus organizaciones y roles. */
export async function listUsers(): Promise<UserRow[]> {
  await requireSuperAdmin()

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      isSuperAdmin: user.isSuperAdmin,
    })
    .from(user)

  const ids = users.map((u) => u.id)
  const memberships = ids.length
    ? await db
        .select({
          userId: member.userId,
          organizationId: member.organizationId,
          organizationName: organization.name,
          role: member.role,
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(inArray(member.userId, ids))
    : []

  const byUser = new Map<string, UserRow['memberships']>()
  for (const m of memberships) {
    const arr = byUser.get(m.userId) ?? []
    arr.push({
      organizationId: m.organizationId,
      organizationName: m.organizationName,
      role: m.role,
    })
    byUser.set(m.userId, arr)
  }

  return users
    .map(
      (u): UserRow => ({
        ...u,
        memberships: byUser.get(u.id) ?? [],
      }),
    )
    .sort((a, b) => a.email.localeCompare(b.email))
}

const createUserSchema = z.object({
  email: z.email('Email inválido'),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  organizationId: z.string().trim().min(1, 'Elegí una organización'),
  role: z.enum(ROLES),
})

/**
 * Crea un usuario y lo asigna a una org con un rol. Usa auth.api.signUpEmail
 * (patrón add-owner) + marca emailVerified:true + inserta en member.
 */
export async function createUser(
  input: z.infer<typeof createUserSchema>,
): Promise<ActionResult> {
  await requireSuperAdmin()
  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }
  const { email, name, password, organizationId, role } = parsed.data

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  if (!org) return { ok: false, error: 'La organización no existe' }

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)
  if (existing) return { ok: false, error: 'Ya existe un usuario con ese email' }

  let userId: string | undefined
  try {
    const r = await auth.api.signUpEmail({ body: { email, password, name } })
    if (r?.user?.id) userId = r.user.id
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('EMAIL_NOT_VERIFIED') && !msg.includes('email_not_verified')) {
      return { ok: false, error: 'No se pudo crear el usuario' }
    }
  }
  if (!userId) {
    const [c] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
    if (!c) return { ok: false, error: 'No se pudo obtener el id del usuario creado' }
    userId = c.id
  }

  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId))

  await db.insert(member).values({
    id: randomUUID(),
    userId,
    organizationId,
    role,
    createdAt: new Date(),
  })
  return { ok: true }
}

const roleSchema = z.object({
  userId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  role: z.enum(ROLES),
})

/** Cambia el rol de un usuario en una org. */
export async function updateUserRole(
  input: z.infer<typeof roleSchema>,
): Promise<ActionResult> {
  await requireSuperAdmin()
  const parsed = roleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }
  const { userId, organizationId, role } = parsed.data

  const [m] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1)
  if (!m) return { ok: false, error: 'El usuario no pertenece a esa organización' }

  await db.update(member).set({ role }).where(eq(member.id, m.id))
  return { ok: true }
}

/** Agrega un usuario a una org (o actualiza su rol si ya es miembro). Sirve para "asignar owner". */
export async function addUserToOrg(
  input: z.infer<typeof roleSchema>,
): Promise<ActionResult> {
  await requireSuperAdmin()
  const parsed = roleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }
  const { userId, organizationId, role } = parsed.data

  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1)
  if (!u) return { ok: false, error: 'El usuario no existe' }
  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  if (!org) return { ok: false, error: 'La organización no existe' }

  const [existing] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1)

  if (existing) {
    await db.update(member).set({ role }).where(eq(member.id, existing.id))
  } else {
    await db.insert(member).values({
      id: randomUUID(),
      userId,
      organizationId,
      role,
      createdAt: new Date(),
    })
  }
  return { ok: true }
}

const removeSchema = z.object({
  userId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
})

/** Quita a un usuario de una org. */
export async function removeUserFromOrg(
  input: z.infer<typeof removeSchema>,
): Promise<ActionResult> {
  await requireSuperAdmin()
  const parsed = removeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }
  const { userId, organizationId } = parsed.data

  await db
    .delete(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
  return { ok: true }
}

const superAdminSchema = z.object({
  userId: z.string().trim().min(1),
  value: z.boolean(),
})

/**
 * Marca/desmarca el flag isSuperAdmin de un usuario. NO permite que el super
 * admin actual se quite a SÍ mismo el flag (evita lockout).
 */
export async function setSuperAdmin(
  input: z.infer<typeof superAdminSchema>,
): Promise<ActionResult> {
  const { userId: currentUserId } = await requireSuperAdmin()
  const parsed = superAdminSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }
  const { userId, value } = parsed.data

  if (userId === currentUserId && value === false) {
    return { ok: false, error: 'No podés quitarte a vos mismo el rol de Super Admin' }
  }

  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1)
  if (!u) return { ok: false, error: 'El usuario no existe' }

  await db.update(user).set({ isSuperAdmin: value }).where(eq(user.id, userId))
  return { ok: true }
}

/** Lista plana de orgs (id, name, slug) para selects de la UI. */
export async function listOrganizationsFlat(): Promise<
  { id: string; name: string; slug: string; isParent: boolean }[]
> {
  await requireSuperAdmin()
  const orgs = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      parentOrganizationId: organization.parentOrganizationId,
    })
    .from(organization)
  return orgs
    .map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      isParent: o.parentOrganizationId === null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
