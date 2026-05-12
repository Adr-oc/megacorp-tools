# MegaTools — Fase 1: Fundación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la base técnica del portal: proyecto Next.js inicializado, Postgres corriendo, esquema de Drizzle aplicado, Better Auth funcionando vía API, y comando CLI para crear el primer superadmin + organización.

**Architecture:** Next.js 16 (App Router, TypeScript estricto) + Postgres en Docker para dev + Drizzle ORM con migraciones + Better Auth (plugin `organization` + adapter Drizzle) + script CLI `bootstrap` para semilla del primer usuario. Sin UI todavía — al final de la fase se verifica vía `curl` y `psql`.

**Tech Stack:** Next.js 16.2.x, TypeScript 5, Tailwind CSS 4.3, pnpm, PostgreSQL 16, Drizzle ORM 0.45.x, Better Auth (última), Zod 4.4.x, tsx (runner de scripts TS).

**Definición de hecho de la fase:**
- `docker compose up -d postgres` levanta DB
- `pnpm db:migrate` aplica esquema completo (Better Auth + tablas propias)
- `pnpm bootstrap --email <x> --password <y> --org <z>` crea superadmin + org
- `pnpm dev` levanta Next.js
- `curl POST /api/auth/sign-in/email` autentica y devuelve sesión
- `curl GET /api/auth/get-session` con cookie devuelve usuario + organización

---

## Estructura de archivos creados/modificados en esta fase

```
megacorp-tools/
├── .env.example                       Variables de entorno (sin secretos reales)
├── .gitignore                         Ignorar .env, node_modules, .next
├── .npmrc                             pnpm config
├── docker-compose.dev.yml             Postgres para desarrollo
├── package.json                       Dependencias y scripts
├── pnpm-lock.yaml                     Lockfile (auto-generado)
├── tsconfig.json                      TypeScript estricto
├── next.config.ts                     Next.js config
├── drizzle.config.ts                  Drizzle Kit config
├── app/
│   ├── layout.tsx                     Root layout mínimo
│   ├── page.tsx                       Placeholder "MegaTools — Fase 1"
│   └── api/
│       └── auth/
│           └── [...all]/route.ts      Handler de Better Auth
├── lib/
│   ├── env.ts                         Validación de env con Zod
│   ├── db/
│   │   ├── index.ts                   Cliente de Drizzle
│   │   └── schema/
│   │       ├── index.ts               Exporta todos los schemas
│   │       ├── auth.ts                Tablas de Better Auth (generadas)
│   │       └── app.ts                 Tablas propias (app_setting, org_setting, audit_log)
│   └── auth/
│       ├── server.ts                  Configuración server de Better Auth
│       └── client.ts                  Cliente de Better Auth para React (Fase 2)
├── scripts/
│   └── bootstrap.ts                   CLI para crear superadmin + org
├── drizzle/                           Migraciones auto-generadas (no se edita a mano)
└── README.md                          Instrucciones básicas
```

---

## Task 1: Inicializar proyecto Next.js 16 con pnpm

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `postcss.config.mjs`, `.gitignore`, `.npmrc`, `next-env.d.ts`, `README.md`

- [ ] **Step 1: Crear proyecto con create-next-app**

Desde el directorio raíz del repo (`/home/adroc/dev/megacorp-tools`), correr:

```bash
pnpm create next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir false \
  --import-alias "@/*" \
  --use-pnpm \
  --skip-install \
  --turbopack
```

Expected: archivos `package.json`, `tsconfig.json`, `next.config.ts`, `app/`, `postcss.config.mjs`, `.eslintrc.json` o `eslint.config.mjs` creados. El comando pregunta sobre opciones interactivas — los flags ya las cubren.

Si pregunta por overwrite del `README.md`, responder NO (preservamos el existente que ya tiene `# MegaTools`).

- [ ] **Step 2: Verificar versión de Next.js**

```bash
grep '"next":' package.json
```

Expected: versión `^16.x` o `^16.2.x`. Si saliera una versión anterior, ejecutar `pnpm add next@latest react@latest react-dom@latest` para subirla.

- [ ] **Step 3: Instalar dependencias**

```bash
pnpm install
```

Expected: termina sin errores. Crea `node_modules/` y `pnpm-lock.yaml`.

- [ ] **Step 4: Endurecer tsconfig**

Editar `tsconfig.json`. Asegurar que `compilerOptions` incluya:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

(Mantener todo lo demás que generó create-next-app.)

- [ ] **Step 5: Reemplazar el contenido de `app/page.tsx`**

Sobreescribir con un placeholder limpio:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">MegaTools</h1>
        <p className="text-muted-foreground mt-2">Fase 1 — Fundación</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Agregar entradas a `.gitignore`**

Si `.gitignore` no las tiene, agregar al final:

```
# env
.env
.env.local
.env.*.local

# drizzle
drizzle/meta/

# misc
.DS_Store
```

- [ ] **Step 7: Configurar `.npmrc`**

Crear `.npmrc` con:

```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 8: Smoke test — Next.js arranca**

```bash
pnpm dev
```

Expected: salida con "Local: http://localhost:3000". Visitar la URL en navegador o `curl -s http://localhost:3000 | head -20` — debe responder HTML con "MegaTools". Detener con Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat(fase-1): inicializar proyecto Next.js 16 con TypeScript y Tailwind 4"
```

---

## Task 2: Setup de Postgres en Docker para desarrollo

**Files:**
- Create: `docker-compose.dev.yml`, `.env.example`

- [ ] **Step 1: Crear `docker-compose.dev.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: megatools-postgres-dev
    restart: unless-stopped
    environment:
      POSTGRES_USER: megatools
      POSTGRES_PASSWORD: megatools_dev
      POSTGRES_DB: megatools_dev
    ports:
      - "5432:5432"
    volumes:
      - megatools_pgdata_dev:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U megatools -d megatools_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  megatools_pgdata_dev:
```

- [ ] **Step 2: Crear `.env.example`**

```
# Database
DATABASE_URL=postgres://megatools:megatools_dev@localhost:5432/megatools_dev

# Better Auth
BETTER_AUTH_SECRET=replace-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000

# Email (Resend) — opcional en Fase 1, requerido en Fase 2
RESEND_API_KEY=
EMAIL_FROM=no-reply@megatools.local
```

- [ ] **Step 3: Crear `.env` local (no se commitea)**

Copiar `.env.example` a `.env` y reemplazar `BETTER_AUTH_SECRET` con un valor real:

```bash
cp .env.example .env
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env.tmp
# Editar .env manualmente para reemplazar la línea BETTER_AUTH_SECRET con la del .env.tmp
# Luego: rm .env.tmp
```

Verificar que `.env` está en `.gitignore` (debería estarlo desde Task 1).

- [ ] **Step 4: Levantar Postgres**

```bash
docker compose -f docker-compose.dev.yml up -d
```

Expected: container `megatools-postgres-dev` corriendo. Verificar:

```bash
docker compose -f docker-compose.dev.yml ps
```

Expected: status `healthy` (esperar ~10 segundos si dice `starting`).

- [ ] **Step 5: Smoke test — conexión a Postgres**

```bash
docker exec -it megatools-postgres-dev psql -U megatools -d megatools_dev -c "SELECT version();"
```

Expected: imprime la versión de Postgres 16.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.dev.yml .env.example
git commit -m "feat(fase-1): docker-compose para Postgres de desarrollo"
```

---

## Task 3: Validación de variables de entorno con Zod

**Files:**
- Create: `lib/env.ts`

- [ ] **Step 1: Instalar Zod**

```bash
pnpm add zod
```

Expected: `zod` agregado a `dependencies` en `package.json`.

- [ ] **Step 2: Crear `lib/env.ts`**

```ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET debe tener al menos 32 caracteres'),
  BETTER_AUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Variables de entorno inválidas. Revisa .env contra .env.example.')
}

export const env = parsed.data
```

- [ ] **Step 3: Smoke test — importación funciona**

```bash
pnpm tsc --noEmit
```

Expected: sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add lib/env.ts package.json pnpm-lock.yaml
git commit -m "feat(fase-1): validación de variables de entorno con Zod"
```

---

## Task 4: Setup de Drizzle ORM con cliente de Postgres

**Files:**
- Create: `lib/db/index.ts`, `lib/db/schema/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Instalar Drizzle + driver Postgres**

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

Expected: tres paquetes agregados.

- [ ] **Step 2: Verificar versión de Drizzle es 0.45.x stable**

```bash
grep '"drizzle-orm":' package.json
```

Expected: `^0.45.x`. Si saliera 1.0.0-beta.X, hacer downgrade con:

```bash
pnpm add drizzle-orm@^0.45.0 drizzle-kit@^0.30.0
```

(Razón: v1 sigue en beta según spec — `2026-05-12-megacorp-tools-fundacion-design.md` sección 2.4.)

- [ ] **Step 3: Crear `lib/db/schema/index.ts` (placeholder vacío)**

```ts
export * from './app'
export * from './auth'
```

(Los archivos `app.ts` y `auth.ts` se crean en Tasks 5 y 7. Este placeholder permite que el cliente de Drizzle importe `schema` aunque esté vacío al inicio.)

- [ ] **Step 4: Crear placeholder de `lib/db/schema/app.ts`**

```ts
// Tablas propias del portal. Se completa en Task 5.
export const __placeholder = true
```

- [ ] **Step 5: Crear placeholder de `lib/db/schema/auth.ts`**

```ts
// Tablas generadas por Better Auth. Se sobreescribe en Task 7.
export const __placeholder = true
```

- [ ] **Step 6: Crear `lib/db/index.ts`**

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/lib/env'
import * as schema from './schema'

const queryClient = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === 'production' ? 10 : 1,
})

export const db = drizzle(queryClient, { schema })
export type Db = typeof db
```

- [ ] **Step 7: Crear `drizzle.config.ts` en la raíz**

```ts
import type { Config } from 'drizzle-kit'
import 'dotenv/config'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no definida — revisar .env')
}

export default {
  schema: './lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
} satisfies Config
```

- [ ] **Step 8: Instalar dotenv como dev-dep (para drizzle-kit)**

```bash
pnpm add -D dotenv
```

- [ ] **Step 9: Agregar scripts a `package.json`**

Editar `package.json` y agregar dentro de `"scripts"`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio",
"db:push": "drizzle-kit push"
```

- [ ] **Step 10: Smoke test — TypeScript compila**

```bash
pnpm tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 11: Commit**

```bash
git add lib/db drizzle.config.ts package.json pnpm-lock.yaml
git commit -m "feat(fase-1): setup de Drizzle ORM con cliente Postgres"
```

---

## Task 5: Definir tablas propias (app_setting, org_setting, audit_log)

**Files:**
- Modify: `lib/db/schema/app.ts`

- [ ] **Step 1: Reescribir `lib/db/schema/app.ts`**

Reemplazar el placeholder con las tres tablas propias:

```ts
import { pgTable, text, timestamp, jsonb, uniqueIndex, index, uuid } from 'drizzle-orm/pg-core'

// Preferencias por usuario (tema, idioma, etc.)
// key-value flexible: la forma del value vive en Zod schemas (lib/settings/schema.ts)
export const appSetting = pgTable(
  'app_setting',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userKeyUnique: uniqueIndex('app_setting_user_key_uq').on(t.userId, t.key),
  })
)

// Preferencias por organización (branding, SMTP, etc.)
export const orgSetting = pgTable(
  'org_setting',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: text('organization_id').notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgKeyUnique: uniqueIndex('org_setting_org_key_uq').on(t.organizationId, t.key),
  })
)

// Bitácora de acciones relevantes (invitaciones, cambios de rol, settings, uso de apps)
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id'),
    organizationId: text('organization_id'),
    action: text('action').notNull(),
    target: text('target'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgCreatedIdx: index('audit_log_org_created_idx').on(t.organizationId, t.createdAt),
    userCreatedIdx: index('audit_log_user_created_idx').on(t.userId, t.createdAt),
  })
)
```

Nota: `userId` y `organizationId` son `text` (no FK aún) porque las tablas de Better Auth se generan en Task 7 y aún no existen. Las FKs se agregan en Task 8.

- [ ] **Step 2: Smoke test — schema compila**

```bash
pnpm tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema/app.ts
git commit -m "feat(fase-1): tablas propias app_setting, org_setting, audit_log"
```

---

## Task 6: Instalar y configurar Better Auth

**Files:**
- Create: `lib/auth/server.ts`, `lib/auth/client.ts`

- [ ] **Step 1: Instalar Better Auth + adapter de Drizzle**

```bash
pnpm add better-auth
```

Expected: paquete `better-auth` agregado. El paquete incluye el adapter de Drizzle (no requiere paquete separado).

- [ ] **Step 2: Crear `lib/auth/server.ts`**

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // En Fase 1 solo loggeamos. En Fase 2 se integra Resend.
      console.log(`[email-verification] to=${user.email} url=${url}`)
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: false,
      organizationLimit: 1, // por usuario; ajustable después
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 días
      sendInvitationEmail: async ({ email, invitation, organization }) => {
        // En Fase 1 solo loggeamos. En Fase 2 se integra Resend.
        const url = `${env.BETTER_AUTH_URL}/accept-invitation?token=${invitation.id}`
        console.log(`[invitation] to=${email} org=${organization.name} url=${url}`)
      },
    }),
  ],
  trustedOrigins: [env.BETTER_AUTH_URL],
})

export type Auth = typeof auth
```

- [ ] **Step 3: Crear `lib/auth/client.ts`**

```ts
import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000',
  plugins: [organizationClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient
```

- [ ] **Step 4: Agregar `NEXT_PUBLIC_BETTER_AUTH_URL` a `.env.example` y `.env`**

Editar `.env.example` (agregar al final):

```
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

Editar `.env` agregando la misma línea.

- [ ] **Step 5: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

Expected: sin errores. Puede salir un warning sobre `NEXT_PUBLIC_BETTER_AUTH_URL` no estar en `lib/env.ts`. Si TypeScript se queja, agregar a `lib/env.ts`:

```ts
NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
```

- [ ] **Step 6: Commit**

```bash
git add lib/auth package.json pnpm-lock.yaml .env.example
git commit -m "feat(fase-1): configuración base de Better Auth con plugin organization"
```

---

## Task 7: Generar tablas de Better Auth en el schema de Drizzle

**Files:**
- Modify: `lib/db/schema/auth.ts` (reemplazar placeholder con tablas reales)

- [ ] **Step 1: Generar el esquema desde Better Auth**

Better Auth provee una CLI para generar el schema de Drizzle desde la configuración:

```bash
pnpm dlx @better-auth/cli@latest generate --config lib/auth/server.ts --output lib/db/schema/auth.ts -y
```

Expected: archivo `lib/db/schema/auth.ts` reescrito con definiciones de tablas `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`.

- [ ] **Step 2: Verificar el contenido generado**

```bash
head -30 lib/db/schema/auth.ts
```

Expected: imports de `drizzle-orm/pg-core` y definiciones tipo `export const user = pgTable("user", { ... })`.

Si el comando no generó el archivo (algunos releases de Better Auth varían), generarlo manualmente con la referencia oficial: https://better-auth.com/docs/adapters/drizzle. Las tablas mínimas requeridas son las listadas arriba.

- [ ] **Step 3: Smoke test — schema compila**

```bash
pnpm tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Generar migración**

```bash
pnpm db:generate
```

Expected: crea archivo `drizzle/0000_<nombre>.sql` con `CREATE TABLE` para todas las tablas (auth + propias).

- [ ] **Step 5: Inspeccionar el SQL generado**

```bash
ls drizzle/
cat drizzle/0000_*.sql | head -50
```

Expected: SQL razonable con `CREATE TABLE user`, `CREATE TABLE session`, ..., `CREATE TABLE app_setting`, etc.

- [ ] **Step 6: Aplicar migración**

```bash
pnpm db:migrate
```

Expected: aplicación exitosa. Sin errores.

- [ ] **Step 7: Smoke test — tablas existen en Postgres**

```bash
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev -c "\dt"
```

Expected: lista de tablas incluye `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `app_setting`, `org_setting`, `audit_log`.

- [ ] **Step 8: Commit**

```bash
git add lib/db/schema/auth.ts drizzle/
git commit -m "feat(fase-1): generar y aplicar schema de Better Auth"
```

---

## Task 8: Endpoint API de Better Auth en Next.js

**Files:**
- Create: `app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Crear el handler**

Crear `app/api/auth/[...all]/route.ts`:

```ts
import { auth } from '@/lib/auth/server'
import { toNextJsHandler } from 'better-auth/next-js'

export const { POST, GET } = toNextJsHandler(auth)
```

- [ ] **Step 2: Levantar el servidor de desarrollo**

```bash
pnpm dev
```

Expected: "Local: http://localhost:3000". Dejar corriendo en otra terminal.

- [ ] **Step 3: Smoke test — endpoint responde**

En otra terminal:

```bash
curl -i http://localhost:3000/api/auth/get-session
```

Expected: HTTP 200 con `{}` o `null` (sin sesión). Si responde 404 o error, revisar que el archivo `route.ts` esté en la ruta correcta.

- [ ] **Step 4: Detener `pnpm dev` y commit**

Detener `pnpm dev` con Ctrl+C.

```bash
git add app/api
git commit -m "feat(fase-1): handler de Better Auth en /api/auth/[...all]"
```

---

## Task 9: CLI bootstrap para crear superadmin + organización inicial

**Files:**
- Create: `scripts/bootstrap.ts`
- Modify: `package.json` (agregar script)

- [ ] **Step 1: Instalar dependencias de runtime para scripts**

```bash
pnpm add -D tsx
```

Expected: `tsx` agregado como dev-dep. Permite correr archivos `.ts` directamente.

- [ ] **Step 2: Crear `scripts/bootstrap.ts`**

```ts
import { parseArgs } from 'node:util'
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
  console.error('Uso: pnpm bootstrap --email <e> --password <p> --org <nombre> [--name <nombre>] [--org-slug <slug>]')
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
  const signUpResult = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: userName,
    },
  })

  if (!signUpResult.user) {
    console.error('[bootstrap] sign-up falló:', signUpResult)
    process.exit(1)
  }

  const userId = signUpResult.user.id
  console.log(`[bootstrap] usuario creado con id=${userId}`)

  console.log(`[bootstrap] marcando email como verificado...`)
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId))

  console.log(`[bootstrap] creando organización "${orgName}" (slug=${orgSlug})...`)
  const orgId = crypto.randomUUID()
  await db.insert(organization).values({
    id: orgId,
    name: orgName,
    slug: orgSlug,
    createdAt: new Date(),
  })

  console.log(`[bootstrap] asignando ${email} como owner de la org...`)
  await db.insert(member).values({
    id: crypto.randomUUID(),
    userId,
    organizationId: orgId,
    role: 'owner',
    createdAt: new Date(),
  })

  console.log(`[bootstrap] ✅ listo`)
  console.log(`  usuario: ${email} (id=${userId})`)
  console.log(`  organización: ${orgName} (id=${orgId}, slug=${orgSlug})`)
  console.log(`  rol: owner`)
  console.log(`  email marcado como verificado`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[bootstrap] error:', err)
  process.exit(1)
})
```

Notas sobre este script:
- Usa la API de Better Auth (`auth.api.signUpEmail`) para hashear correctamente la contraseña en lugar de hacerlo a mano.
- Marca `emailVerified=true` directamente en DB para saltarse el flujo de email en bootstrap.
- Inserta `member` con `role='owner'`. El plugin organization de Better Auth acepta los roles `owner`, `admin`, `member` por defecto.
- Si los nombres de columna del schema generado por Better Auth difieren (ej. `email_verified` vs `emailVerified`), Drizzle hace el mapeo automático según el schema. Si falla, revisar la propiedad real en `lib/db/schema/auth.ts`.

- [ ] **Step 3: Agregar script a `package.json`**

Editar `package.json`, agregar dentro de `"scripts"`:

```json
"bootstrap": "tsx --env-file=.env scripts/bootstrap.ts"
```

- [ ] **Step 4: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

Expected: sin errores. Si hay error sobre algún campo del schema (`name`, `slug`, etc.) que difiere del nombre real generado por Better Auth, ajustar el script para usar el nombre exacto que aparece en `lib/db/schema/auth.ts`.

- [ ] **Step 5: Probar el bootstrap**

```bash
pnpm bootstrap --email admin@megacorp.local --password "Admin123!Cambiame" --org "MEGACORP" --name "Admin Inicial"
```

Expected: imprime los pasos y termina con "✅ listo".

- [ ] **Step 6: Verificar en Postgres**

```bash
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev -c "SELECT u.email, u.\"emailVerified\", o.name, o.slug, m.role FROM \"user\" u JOIN member m ON m.\"userId\" = u.id JOIN organization o ON o.id = m.\"organizationId\";"
```

Expected: una fila con `admin@megacorp.local | t | MEGACORP | megacorp | owner`.

(Nota: los nombres de columnas pueden tener camelCase entre comillas dependiendo de cómo Better Auth los genere. Ajustar el query si los nombres reales son `email_verified`, `user_id`, etc.)

- [ ] **Step 7: Commit**

```bash
git add scripts/bootstrap.ts package.json pnpm-lock.yaml
git commit -m "feat(fase-1): CLI bootstrap para crear superadmin y org inicial"
```

---

## Task 10: Smoke test end-to-end de Fase 1

**Files:**
- (Sin archivos nuevos — solo validación)

- [ ] **Step 1: Asegurar que el servidor está corriendo**

En una terminal:

```bash
pnpm dev
```

Esperar a que arranque.

- [ ] **Step 2: Smoke test — sign-in con el superadmin**

En otra terminal:

```bash
curl -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/megatools-cookies.txt
```

Expected: HTTP 200 con JSON `{ "user": { ... }, "token": "..." }`. La cookie de sesión queda en `/tmp/megatools-cookies.txt`.

Si responde 401 con "Email not verified", significa que el bootstrap no marcó `emailVerified=true` correctamente — revisar Task 9 Step 2.

- [ ] **Step 3: Smoke test — leer sesión con la cookie**

```bash
curl -i http://localhost:3000/api/auth/get-session -b /tmp/megatools-cookies.txt
```

Expected: HTTP 200 con `{ "user": { "email": "admin@megacorp.local", ... }, "session": { ... } }`.

- [ ] **Step 4: Smoke test — listar organizaciones del usuario**

```bash
curl -i http://localhost:3000/api/auth/organization/list -b /tmp/megatools-cookies.txt
```

Expected: HTTP 200 con un array conteniendo la organización "MEGACORP".

- [ ] **Step 5: Limpiar y detener servidor**

```bash
rm -f /tmp/megatools-cookies.txt
```

Detener `pnpm dev` con Ctrl+C.

- [ ] **Step 6: Commit final de Fase 1**

```bash
git add -A
git status
```

Expected: working tree clean (no hay cambios sin commit).

Si hay cambios:

```bash
git add .
git commit -m "chore(fase-1): cierre de fase 1 con smoke tests verificados"
```

---

## Cierre de Fase 1

Al terminar todas las tareas, la fase entrega:

- Repositorio inicializado con Next.js 16, TypeScript estricto, Tailwind 4
- Postgres corriendo en Docker (`docker-compose.dev.yml`)
- Drizzle ORM configurado con migración aplicada (10 tablas: 7 de Better Auth + 3 propias)
- Better Auth funcional con plugin `organization`, requireEmailVerification activo
- Endpoint `/api/auth/[...all]` respondiendo a sign-in / sign-up / get-session / organization.*
- Comando `pnpm bootstrap` crea superadmin + org inicial con email pre-verificado
- README puede actualizarse en Fase 2 con instrucciones consolidadas

**Siguiente:** Fase 2 — UI shell, login, invitaciones, verificación email, onboarding. Se escribe como plan separado cuando esta fase esté implementada.

## Notas de ejecución

- **Si un comando de Better Auth CLI cambia entre versiones** (Task 7 Step 1): consultar `https://better-auth.com/docs/adapters/drizzle` y `https://better-auth.com/docs/plugins/organization`. El schema generado debe incluir las 7 tablas listadas.
- **Si Drizzle salta a v1 estable durante la implementación**: la API cambia ligeramente. Quedarse en 0.45.x hasta cerrar Sprint 0; migrar en un sprint dedicado.
- **Si Next.js saca 16.3+ durante la implementación**: bumps de patch son seguros, minor probablemente también. Mayor (17) requeriría re-evaluar.
