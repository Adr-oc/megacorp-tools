import { parseArgs } from 'node:util'
import { randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { member, organization, user } from '@/lib/db/schema/auth'
import { eq } from 'drizzle-orm'

const { values } = parseArgs({
  options: {
    email: { type: 'string', short: 'e' },
    password: { type: 'string', short: 'p' },
    name: { type: 'string', short: 'n' },
    org: { type: 'string', short: 'o' },
    'org-slug': { type: 'string', short: 's' },
  },
  strict: true,
})

if (!values.email || !values.password || !values.org) {
  console.error(
    'Uso: pnpm bootstrap --email <e> --password <p> --org <nombre> [--name <nombre>] [--org-slug <slug>]',
  )
  process.exit(1)
}

const email = values.email
const password = values.password
const userName = values.name ?? email.split('@')[0] ?? 'Admin'
const orgName = values.org
const orgSlug = values['org-slug'] ?? slugify(orgName)

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function main() {
  console.log(`[bootstrap] verificando si existe usuario ${email}...`)
  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1)
  if (existing.length > 0) {
    console.error(`[bootstrap] el usuario ${email} ya existe — abortando`)
    process.exit(1)
  }

  console.log(`[bootstrap] creando usuario ${email}...`)
  // requireEmailVerification:true → signUpEmail puede retornar sin user.id en el body.
  // Manejamos ambos casos: usamos el id del resultado si viene, o lo buscamos en DB.
  let userId: string | undefined

  try {
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: userName,
      },
    })

    if (signUpResult?.user?.id) {
      userId = signUpResult.user.id
    }
  } catch (err: unknown) {
    // Better Auth lanza error cuando requireEmailVerification=true y el email no fue verificado.
    // Si el error es "EMAIL_NOT_VERIFIED" el usuario YA fue creado en la DB; continuamos.
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes('EMAIL_NOT_VERIFIED') && !message.includes('email_not_verified')) {
      console.error('[bootstrap] sign-up falló con error inesperado:', err)
      process.exit(1)
    }
    console.log(`[bootstrap] sign-up completado (email pendiente de verificación — se forzará vía DB)`)
  }

  // Si no obtuvimos userId del resultado, buscarlo en la DB
  if (!userId) {
    const created = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
    if (!created[0]) {
      console.error('[bootstrap] no se pudo obtener el id del usuario creado')
      process.exit(1)
    }
    userId = created[0].id
  }

  console.log(`[bootstrap] usuario creado con id=${userId}`)

  console.log(`[bootstrap] marcando email como verificado...`)
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId))

  console.log(`[bootstrap] creando organización "${orgName}" (slug=${orgSlug})...`)
  const orgId = randomUUID()
  await db.insert(organization).values({
    id: orgId,
    name: orgName,
    slug: orgSlug,
    createdAt: new Date(),
  })

  console.log(`[bootstrap] asignando ${email} como owner de la org...`)
  await db.insert(member).values({
    id: randomUUID(),
    userId,
    organizationId: orgId,
    role: 'owner',
    createdAt: new Date(),
  })

  console.log(`[bootstrap] listo`)
  console.log(`  usuario:      ${email} (id=${userId})`)
  console.log(`  organización: ${orgName} (id=${orgId}, slug=${orgSlug})`)
  console.log(`  rol:          owner`)
  console.log(`  email:        verificado`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[bootstrap] error:', err)
  process.exit(1)
})
