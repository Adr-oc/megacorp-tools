import { parseArgs } from 'node:util'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema/auth'
import { eq } from 'drizzle-orm'

/**
 * Marca un usuario YA existente como Super Admin global (user.isSuperAdmin = true),
 * identificado por email. No crea usuarios. Úsese para el bootstrap del super
 * admin inicial (it@erpconnectai.com) en prod.
 */
const { values } = parseArgs({
  options: {
    email: { type: 'string', short: 'e' },
  },
  strict: true,
})

if (!values.email) {
  console.error('Uso: tsx scripts/set-super-admin.ts --email <e>')
  process.exit(1)
}

const email = values.email

async function main() {
  const existing = await db
    .select({ id: user.id, isSuperAdmin: user.isSuperAdmin })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)

  if (!existing[0]) {
    console.error(`[set-super-admin] no existe usuario con email="${email}" — abortando`)
    process.exit(1)
  }

  const userId = existing[0].id

  if (existing[0].isSuperAdmin) {
    console.log(`[set-super-admin] ${email} (id=${userId}) ya es Super Admin — sin cambios`)
    process.exit(0)
  }

  console.log(`[set-super-admin] marcando ${email} (id=${userId}) como Super Admin...`)
  await db.update(user).set({ isSuperAdmin: true }).where(eq(user.id, userId))

  console.log(`[set-super-admin] listo`)
  console.log(`  usuario:    ${email} (id=${userId})`)
  console.log(`  superAdmin: true`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[set-super-admin] error:', err)
  process.exit(1)
})
