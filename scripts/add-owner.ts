import { parseArgs } from 'node:util'
import { randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { member, organization, user } from '@/lib/db/schema/auth'
import { and, eq } from 'drizzle-orm'

/**
 * Agrega un usuario como miembro (por defecto owner) de una organización YA
 * existente, identificada por slug. A diferencia de bootstrap.ts, NO crea org
 * nueva — respeta el organizationLimit. Crea el usuario si no existe y le marca
 * el email como verificado (acceso inmediato sin depender del envío de correo).
 */
const { values } = parseArgs({
  options: {
    email: { type: 'string', short: 'e' },
    password: { type: 'string', short: 'p' },
    name: { type: 'string', short: 'n' },
    'org-slug': { type: 'string', short: 's' },
    role: { type: 'string', short: 'r' },
  },
  strict: true,
})

if (!values.email || !values.password || !values['org-slug']) {
  console.error(
    'Uso: tsx scripts/add-owner.ts --email <e> --password <p> --org-slug <slug> [--name <n>] [--role owner|admin|member]',
  )
  process.exit(1)
}

const email = values.email
const password = values.password
const userName = values.name ?? email.split('@')[0] ?? 'Usuario'
const orgSlug = values['org-slug']
const role = values.role ?? 'owner'

async function main() {
  const [org] = await db.select().from(organization).where(eq(organization.slug, orgSlug)).limit(1)
  if (!org) {
    console.error(`[add-owner] no existe organización con slug="${orgSlug}" — abortando`)
    process.exit(1)
  }

  let userId: string | undefined
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)

  if (existing[0]) {
    userId = existing[0].id
    console.log(`[add-owner] usuario ${email} ya existe (id=${userId}) — se reutiliza`)
  } else {
    console.log(`[add-owner] creando usuario ${email}...`)
    try {
      const r = await auth.api.signUpEmail({ body: { email, password, name: userName } })
      if (r?.user?.id) userId = r.user.id
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('EMAIL_NOT_VERIFIED') && !msg.includes('email_not_verified')) {
        console.error('[add-owner] sign-up falló:', err)
        process.exit(1)
      }
    }
    if (!userId) {
      const c = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
      if (!c[0]) {
        console.error('[add-owner] no se pudo obtener el id del usuario creado')
        process.exit(1)
      }
      userId = c[0].id
    }
  }

  console.log(`[add-owner] marcando email verificado...`)
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId))

  const alreadyMember = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, org.id)))
    .limit(1)

  if (alreadyMember[0]) {
    console.log(`[add-owner] ya es miembro de ${org.name} — actualizando rol a "${role}"`)
    await db.update(member).set({ role }).where(eq(member.id, alreadyMember[0].id))
  } else {
    console.log(`[add-owner] agregando como ${role} de ${org.name}...`)
    await db.insert(member).values({
      id: randomUUID(),
      userId,
      organizationId: org.id,
      role,
      createdAt: new Date(),
    })
  }

  console.log(`[add-owner] listo`)
  console.log(`  usuario:      ${email} (id=${userId})`)
  console.log(`  organización: ${org.name} (slug=${org.slug})`)
  console.log(`  rol:          ${role}`)
  console.log(`  email:        verificado`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[add-owner] error:', err)
  process.exit(1)
})
