# MegaTools — Fase 3: Apps registry + Settings + Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar Sprint 0. Construir el sistema "platform" del portal (registry de apps + permisos por rol) y la app de Settings completa. Integrar Resend para emails reales. Empaquetar para deploy con Docker.

**Architecture:** Registry de apps en `src/lib/apps/registry.ts` como source-of-truth. Helpers `requireApp` (server) y `usePermissions` (client). Home grid lee el registry filtrado por rol. Settings con sub-rutas dentro de `/app/settings/*`. Integración Resend en `src/lib/email/`. Dockerfile multi-stage + docker-compose.yml para prod.

**Tech Stack añadido:** resend, @react-email/components, lucide-react (íconos ya instalado).

**Definición de hecho de la fase:**
- Home `/app` muestra grid de apps (Settings + futuras placeholders "coming-soon")
- `/app/settings` con 4 secciones funcionando: Perfil, Apariencia, Organización, Notificaciones
- Owner/admin puede invitar miembros desde Settings → Organización
- Owner/admin puede cambiar rol o remover miembros
- `audit_log` registra eventos clave (invitar, remover, cambiar rol, login)
- Emails reales vía Resend (verificación, invitación, password reset, magic link)
- `docker compose up` levanta el portal completo (app + Postgres) listo para usar
- Tests E2E adicionales cubren: Settings perfil, invitar miembro
- README con instrucciones para correr local y deploy

---

## Estructura de archivos en esta fase

```
megacorp-tools/
├── Dockerfile                                  NUEVO
├── docker-compose.yml                          NUEVO (separado de dev)
├── README.md                                   MODIFICAR: instrucciones completas
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── app/
│   │   │   │   └── page.tsx                    MODIFICAR: grid de apps
│   │   │   └── settings/
│   │   │       ├── layout.tsx                  NUEVO: sub-sidebar
│   │   │       ├── page.tsx                    NUEVO: redirige a /perfil
│   │   │       ├── perfil/page.tsx             NUEVO
│   │   │       ├── apariencia/page.tsx         NUEVO
│   │   │       ├── organizacion/page.tsx       NUEVO
│   │   │       └── notificaciones/page.tsx     NUEVO
│   │   └── api/
│   │       └── audit/
│   │           └── route.ts                    (no expone API — solo helper interno)
│   ├── components/
│   │   ├── apps/
│   │   │   └── app-card.tsx                    NUEVO
│   │   └── settings/
│   │       ├── profile-form.tsx                NUEVO
│   │       ├── appearance-form.tsx             NUEVO
│   │       ├── organization-form.tsx           NUEVO
│   │       ├── members-list.tsx                NUEVO
│   │       ├── invite-member-dialog.tsx        NUEVO
│   │       └── notifications-form.tsx          NUEVO
│   └── lib/
│       ├── apps/
│       │   ├── registry.ts                     NUEVO: source-of-truth
│       │   └── types.ts                        NUEVO
│       ├── permissions/
│       │   ├── require-app.ts                  NUEVO (server)
│       │   └── use-permissions.ts              NUEVO (client hook)
│       ├── audit/
│       │   └── log.ts                          NUEVO
│       ├── email/
│       │   ├── client.ts                       NUEVO
│       │   └── templates/                      NUEVO
│       │       ├── verification.tsx
│       │       ├── invitation.tsx
│       │       ├── password-reset.tsx
│       │       └── magic-link.tsx
│       ├── auth/
│       │   └── server.ts                       MODIFICAR: integrar sendEmail
│       └── env.ts                              MODIFICAR: RESEND_API_KEY required
└── tests/e2e/
    ├── settings-profile.spec.ts                NUEVO
    └── invite-member.spec.ts                   NUEVO
```

---

## Task 1: Apps registry + tipos

**Files:**
- Create: `src/lib/apps/types.ts`, `src/lib/apps/registry.ts`

- [ ] **Step 1: Crear `src/lib/apps/types.ts`**

```ts
import type { LucideIcon } from 'lucide-react'

export type AppRole = 'member' | 'admin' | 'owner'

export type AppStatus = 'available' | 'coming-soon' | 'disabled'

export type AppDefinition = {
  id: string
  name: string
  description: string
  icon: LucideIcon
  href: string
  requiredRoles: AppRole[]
  status: AppStatus
}
```

- [ ] **Step 2: Crear `src/lib/apps/registry.ts`**

```ts
import { Settings, FileText, ImageIcon } from 'lucide-react'
import type { AppDefinition } from './types'

export const apps: AppDefinition[] = [
  {
    id: 'settings',
    name: 'Configuración',
    description: 'Perfil, organización, apariencia y notificaciones.',
    icon: Settings,
    href: '/app/settings',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'available',
  },
  {
    id: 'pdf-splitter',
    name: 'Separador de PDFs',
    description: 'Dividir y reordenar páginas de PDF.',
    icon: FileText,
    href: '/app/tools/pdf-splitter',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'coming-soon',
  },
  {
    id: 'image-ai',
    name: 'Procesador de imágenes IA',
    description: 'OCR, descripción, remoción de fondo y más.',
    icon: ImageIcon,
    href: '/app/tools/image-ai',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'coming-soon',
  },
]

export function getApp(id: string): AppDefinition | undefined {
  return apps.find((a) => a.id === id)
}

export function getAppsForRole(role: AppRole): AppDefinition[] {
  return apps.filter((a) => a.requiredRoles.includes(role))
}

type AppRole = AppDefinition['requiredRoles'][number]
```

- [ ] **Step 3: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/apps
git commit -m "feat(fase-3): registry de apps con Settings + placeholders coming-soon"
```

---

## Task 2: Helpers de permisos (server + client)

**Files:**
- Create: `src/lib/permissions/require-app.ts`, `src/lib/permissions/use-permissions.ts`

- [ ] **Step 1: Crear `src/lib/permissions/require-app.ts`**

```ts
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { getApp } from '@/lib/apps/registry'
import type { AppRole } from '@/lib/apps/types'

export async function requireApp(appId: string): Promise<{ userId: string; orgId: string; role: AppRole }> {
  const app = getApp(appId)
  if (!app) {
    redirect('/app')
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/login')
  }

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) {
    redirect('/app')
  }

  // Buscar el role del usuario en la org activa
  const memberRes = await auth.api.listOrganizationMembers({
    headers: await headers(),
    query: { organizationId: activeOrgId },
  })

  const member = memberRes?.find?.((m: { userId: string }) => m.userId === session.user.id)
  const role = (member?.role ?? 'member') as AppRole

  if (!app.requiredRoles.includes(role)) {
    redirect('/app')
  }

  if (app.status !== 'available') {
    redirect('/app')
  }

  return { userId: session.user.id, orgId: activeOrgId, role }
}
```

**Nota:** la API exacta de `listOrganizationMembers` puede variar. Si no existe con ese nombre, alternativa: query directo a Drizzle:

```ts
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'
import { and, eq } from 'drizzle-orm'

const rows = await db
  .select()
  .from(member)
  .where(and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrgId)))
  .limit(1)

const role = (rows[0]?.role ?? 'member') as AppRole
```

- [ ] **Step 2: Crear `src/lib/permissions/use-permissions.ts`**

```ts
'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import type { AppRole } from '@/lib/apps/types'
import { apps } from '@/lib/apps/registry'

export function usePermissions() {
  const { data: session } = authClient.useSession()
  const [role, setRole] = useState<AppRole | null>(null)

  useEffect(() => {
    if (!session) {
      setRole(null)
      return
    }
    const activeOrgId = session.session.activeOrganizationId
    if (!activeOrgId) {
      setRole(null)
      return
    }
    authClient.organization
      .listMembers({ query: { organizationId: activeOrgId } })
      .then((res) => {
        const member = res.data?.find?.((m: { userId: string }) => m.userId === session.user.id)
        setRole(((member?.role ?? 'member') as AppRole) || 'member')
      })
      .catch(() => setRole(null))
  }, [session])

  return {
    role,
    hasApp(appId: string): boolean {
      if (!role) return false
      const app = apps.find((a) => a.id === appId)
      if (!app) return false
      return app.status === 'available' && app.requiredRoles.includes(role)
    },
  }
}
```

(Si `authClient.organization.listMembers` no existe, usar `fetch('/api/auth/organization/list-members')` o el endpoint correcto. Si la lógica de role no funciona en cliente, simplemente exponer el role desde el server vía un layout/context y consumirlo aquí.)

- [ ] **Step 3: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/permissions
git commit -m "feat(fase-3): helpers requireApp (server) y usePermissions (client)"
```

---

## Task 3: Home grid de apps

**Files:**
- Modify: `src/app/(app)/app/page.tsx`
- Create: `src/components/apps/app-card.tsx`

- [ ] **Step 1: Crear `src/components/apps/app-card.tsx`**

```tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AppDefinition } from '@/lib/apps/types'

export function AppCard({ app }: { app: AppDefinition }) {
  const Icon = app.icon
  const isAvailable = app.status === 'available'

  const content = (
    <Card className={isAvailable ? 'hover:border-primary transition-colors cursor-pointer h-full' : 'opacity-60 h-full'}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <Icon className="h-8 w-8 text-primary" />
          {app.status === 'coming-soon' && (
            <Badge variant="secondary">Próximamente</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="mb-1">{app.name}</CardTitle>
        <CardDescription>{app.description}</CardDescription>
      </CardContent>
    </Card>
  )

  if (!isAvailable) {
    return <div>{content}</div>
  }

  return (
    <Link href={app.href} className="block">
      {content}
    </Link>
  )
}
```

- [ ] **Step 2: Instalar componente badge de shadcn**

```bash
pnpm dlx shadcn@latest add -y badge
```

(Solo si no estuviera ya en `src/components/ui/badge.tsx`. Si ya está, este paso es no-op.)

- [ ] **Step 3: Modificar `src/app/(app)/app/page.tsx`**

```tsx
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'
import { and, eq } from 'drizzle-orm'
import { apps } from '@/lib/apps/registry'
import { AppCard } from '@/components/apps/app-card'
import type { AppRole } from '@/lib/apps/types'

export default async function AppHomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return null  // layout ya redirige a /login
  }

  // Determinar role del user en la org activa
  let role: AppRole = 'member'
  const activeOrgId = session.session.activeOrganizationId
  if (activeOrgId) {
    const rows = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, activeOrgId)
        )
      )
      .limit(1)
    role = (rows[0]?.role ?? 'member') as AppRole
  }

  const visibleApps = apps.filter((a) => a.requiredRoles.includes(role))

  return (
    <section>
      <h1 className="text-3xl font-bold mb-2">Aplicaciones</h1>
      <p className="text-muted-foreground mb-8">
        Hola {session.user.name ?? session.user.email}. Selecciona una app para empezar.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleApps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Smoke test — TypeScript y home funciona**

```bash
pnpm tsc --noEmit
pnpm dev &
sleep 8

# Login para obtener cookie
curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/c.txt

# Ver home
curl -s http://localhost:3000/app -b /tmp/c.txt | grep -o "Configuraci\|Separador de PDF\|Aplicaciones" | head -5
```

Expected: aparece "Aplicaciones", "Configuraci(ón)", "Separador de PDF".

Cleanup: matar `pnpm dev`, `rm /tmp/c.txt`.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/app/page.tsx' src/components/apps src/components/ui/badge.tsx
git commit -m "feat(fase-3): home grid de apps filtrado por rol"
```

---

## Task 4: Settings layout con sub-sidebar

**Files:**
- Create: `src/app/(app)/settings/layout.tsx`, `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Crear `src/app/(app)/settings/layout.tsx`**

```tsx
import Link from 'next/link'

type Section = { id: string; label: string; href: string }

const sections: Section[] = [
  { id: 'perfil', label: 'Mi perfil', href: '/app/settings/perfil' },
  { id: 'organizacion', label: 'Organización', href: '/app/settings/organizacion' },
  { id: 'apariencia', label: 'Apariencia', href: '/app/settings/apariencia' },
  { id: 'notificaciones', label: 'Notificaciones', href: '/app/settings/notificaciones' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-8">
      <aside className="w-48 shrink-0">
        <h2 className="text-lg font-semibold mb-4">Configuración</h2>
        <nav className="flex flex-col gap-1">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="px-3 py-2 rounded-md text-sm hover:bg-muted"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
```

(Implementación intencional simple: sin estado de "active section" en server. Si querés highlighting de la sección activa, se puede hacer en una versión cliente con `usePathname`. Para Sprint 0 lo dejamos así.)

- [ ] **Step 2: Crear `src/app/(app)/settings/page.tsx`** (redirect default)

```tsx
import { redirect } from 'next/navigation'

export default function SettingsIndexPage() {
  redirect('/app/settings/perfil')
}
```

- [ ] **Step 3: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add 'src/app/(app)/settings'
git commit -m "feat(fase-3): layout de Settings con sub-sidebar y redirect default"
```

---

## Task 5: Settings → Perfil

**Files:**
- Create: `src/app/(app)/settings/perfil/page.tsx`, `src/components/settings/profile-form.tsx`

- [ ] **Step 1: Crear `src/components/settings/profile-form.tsx`**

```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/client'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
})

type FormValues = z.infer<typeof schema>

type Props = {
  user: { name: string | null; email: string }
}

export function ProfileForm({ user }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name ?? '' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const res = await fetch('/api/auth/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name }),
    })
    setIsLoading(false)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.message ?? 'No se pudo actualizar')
      return
    }
    toast.success('Perfil actualizado')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <FormLabel>Email</FormLabel>
          <Input value={user.email} disabled className="mt-2" />
          <FormDescription className="mt-1">
            El email no se puede cambiar desde acá.
          </FormDescription>
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Form>
  )
}
```

(Si `/api/auth/update-user` no existe con ese nombre, ajustar. Alternativa: server action que use `db.update(user)` directo.)

- [ ] **Step 2: Crear `src/app/(app)/settings/perfil/page.tsx`**

```tsx
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { ProfileForm } from '@/components/settings/profile-form'

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Mi perfil</h1>
      <p className="text-muted-foreground mb-6">Actualizá tu información personal.</p>
      <ProfileForm user={session.user} />
    </div>
  )
}
```

- [ ] **Step 3: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add 'src/app/(app)/settings/perfil' src/components/settings/profile-form.tsx
git commit -m "feat(fase-3): Settings → Mi perfil"
```

---

## Task 6: Settings → Apariencia

**Files:**
- Create: `src/app/(app)/settings/apariencia/page.tsx`, `src/components/settings/appearance-form.tsx`

- [ ] **Step 1: Crear `src/components/settings/appearance-form.tsx`**

```tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AppearanceForm() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null  // evita hydration mismatch

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <Label htmlFor="theme">Tema</Label>
        <Select value={theme ?? 'system'} onValueChange={setTheme}>
          <SelectTrigger id="theme" className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Claro</SelectItem>
            <SelectItem value="dark">Oscuro</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Instalar componente `select` de shadcn**

```bash
pnpm dlx shadcn@latest add -y select
```

- [ ] **Step 3: Crear `src/app/(app)/settings/apariencia/page.tsx`**

```tsx
import { AppearanceForm } from '@/components/settings/appearance-form'

export default function AppearancePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Apariencia</h1>
      <p className="text-muted-foreground mb-6">Personalizá la apariencia del portal.</p>
      <AppearanceForm />
    </div>
  )
}
```

- [ ] **Step 4: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/settings/apariencia' src/components/settings/appearance-form.tsx src/components/ui/select.tsx
git commit -m "feat(fase-3): Settings → Apariencia"
```

---

## Task 7: Settings → Organización (datos)

**Files:**
- Create: `src/app/(app)/settings/organizacion/page.tsx`, `src/components/settings/organization-form.tsx`

- [ ] **Step 1: Crear `src/components/settings/organization-form.tsx`**

```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
})

type FormValues = z.infer<typeof schema>

type Props = {
  organization: { id: string; name: string; slug: string }
  canEdit: boolean
}

export function OrganizationForm({ organization, canEdit }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: organization.name },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const res = await fetch('/api/auth/organization/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: organization.id, data: { name: values.name } }),
    })
    setIsLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.message ?? 'No se pudo actualizar')
      return
    }
    toast.success('Organización actualizada')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la organización</FormLabel>
              <FormControl>
                <Input {...field} disabled={!canEdit} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <FormLabel>Slug (URL)</FormLabel>
          <Input value={organization.slug} disabled className="mt-2" />
        </div>
        {canEdit && (
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        )}
      </form>
    </Form>
  )
}
```

- [ ] **Step 2: Crear `src/app/(app)/settings/organizacion/page.tsx`**

```tsx
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { member, organization } from '@/lib/db/schema/auth'
import { and, eq } from 'drizzle-orm'
import { OrganizationForm } from '@/components/settings/organization-form'
import { MembersList } from '@/components/settings/members-list'
import { Separator } from '@/components/ui/separator'

export default async function OrganizationPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) {
    return (
      <p className="text-muted-foreground">No tenés organización activa.</p>
    )
  }

  const [org] = await db.select().from(organization).where(eq(organization.id, activeOrgId)).limit(1)
  if (!org) {
    return <p className="text-destructive">Organización no encontrada.</p>
  }

  const [me] = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrgId)))
    .limit(1)

  const canEdit = me?.role === 'owner' || me?.role === 'admin'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Organización</h1>
        <p className="text-muted-foreground mb-6">Datos y miembros de tu organización.</p>
        <OrganizationForm organization={{ id: org.id, name: org.name, slug: org.slug }} canEdit={canEdit} />
      </div>
      <Separator />
      <MembersList organizationId={activeOrgId} myRole={(me?.role ?? 'member') as 'owner' | 'admin' | 'member'} myUserId={session.user.id} />
    </div>
  )
}
```

- [ ] **Step 3: Smoke test — compila (puede fallar hasta hacer Task 8 con MembersList)**

```bash
pnpm tsc --noEmit
```

Si falla por `MembersList` no existente, **NO commitees todavía** — continúa a Task 8.

---

## Task 8: Settings → Organización (miembros)

**Files:**
- Create: `src/components/settings/members-list.tsx`, `src/components/settings/invite-member-dialog.tsx`

- [ ] **Step 1: Crear `src/components/settings/invite-member-dialog.tsx`**

```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  email: z.email('Email inválido'),
  role: z.enum(['admin', 'member']),
})

type FormValues = z.infer<typeof schema>

export function InviteMemberDialog({
  organizationId,
  onInvited,
}: {
  organizationId: string
  onInvited: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role: 'member' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const res = await fetch('/api/auth/organization/invite-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        email: values.email,
        role: values.role,
      }),
    })
    setIsLoading(false)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.message ?? 'No se pudo enviar la invitación')
      return
    }
    toast.success('Invitación enviada')
    form.reset()
    setOpen(false)
    onInvited()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>Invitar miembro</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
          <DialogDescription>
            Le enviaremos un email con un link para unirse.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="colaborador@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Miembro</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enviando…' : 'Enviar invitación'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Crear `src/components/settings/members-list.tsx`**

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InviteMemberDialog } from './invite-member-dialog'

type Role = 'owner' | 'admin' | 'member'

type Member = {
  id: string
  userId: string
  role: Role
  user: { email: string; name: string | null }
}

type Props = {
  organizationId: string
  myRole: Role
  myUserId: string
}

export function MembersList({ organizationId, myRole, myUserId }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/auth/organization/list-members?organizationId=${organizationId}`)
    if (res.ok) {
      const data = await res.json()
      setMembers(data.members ?? data)
    }
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const canManage = myRole === 'owner' || myRole === 'admin'

  async function updateRole(memberId: string, role: Role) {
    const res = await fetch('/api/auth/organization/update-member-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    })
    if (!res.ok) {
      toast.error('No se pudo cambiar el rol')
      return
    }
    toast.success('Rol actualizado')
    fetchMembers()
  }

  async function removeMember(memberId: string) {
    if (!confirm('¿Confirmás remover este miembro?')) return
    const res = await fetch('/api/auth/organization/remove-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    if (!res.ok) {
      toast.error('No se pudo remover')
      return
    }
    toast.success('Miembro removido')
    fetchMembers()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Miembros</h2>
        {canManage && (
          <InviteMemberDialog organizationId={organizationId} onInvited={fetchMembers} />
        )}
      </div>
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="border rounded-md divide-y">
          {members.map((m) => {
            const isSelf = m.userId === myUserId
            const canChangeThis = canManage && !isSelf && m.role !== 'owner'
            return (
              <div key={m.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{m.user.name ?? m.user.email}</div>
                  <div className="text-sm text-muted-foreground">{m.user.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {canChangeThis ? (
                    <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as Role)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Miembro</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground capitalize">{m.role}</span>
                  )}
                  {canChangeThis && (
                    <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}>
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Smoke test funcional**

```bash
pnpm dev &
sleep 8

# Login admin
curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/c.txt

# Visitar settings/organizacion
curl -s http://localhost:3000/app/settings/organizacion -b /tmp/c.txt | grep -o "Organizaci\|Miembros\|MEGACORP" | head -5
```

Expected: aparecen "Organizaci(ón)", "Miembros", "MEGACORP".

Cleanup: matar `pnpm dev`, `rm /tmp/c.txt`.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/settings/organizacion' src/components/settings
git commit -m "feat(fase-3): Settings → Organización con miembros, invitar, cambiar rol, remover"
```

---

## Task 9: Settings → Notificaciones (placeholder)

**Files:**
- Create: `src/app/(app)/settings/notificaciones/page.tsx`, `src/components/settings/notifications-form.tsx`

Esta sección es un placeholder con UI funcional pero sin backend completo (la configuración SMTP/Resend a nivel de org se documenta pero no se persiste en Fase 3 — es una decisión consciente para cerrar Sprint 0 con scope manejable).

- [ ] **Step 1: Crear `src/components/settings/notifications-form.tsx`**

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function NotificationsForm() {
  return (
    <div className="space-y-4 max-w-2xl">
      <Alert>
        <AlertTitle>Notificaciones por email</AlertTitle>
        <AlertDescription>
          Las notificaciones (verificación, invitaciones, password reset) se envían automáticamente a tu email.
          La configuración avanzada (SMTP custom, preferencias por usuario) estará disponible en futuras versiones.
        </AlertDescription>
      </Alert>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/app/(app)/settings/notificaciones/page.tsx`**

```tsx
import { NotificationsForm } from '@/components/settings/notifications-form'

export default function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Notificaciones</h1>
      <p className="text-muted-foreground mb-6">Configuración de notificaciones por email.</p>
      <NotificationsForm />
    </div>
  )
}
```

- [ ] **Step 3: Smoke test + commit**

```bash
pnpm tsc --noEmit
git add 'src/app/(app)/settings/notificaciones' src/components/settings/notifications-form.tsx
git commit -m "feat(fase-3): Settings → Notificaciones (placeholder UI)"
```

---

## Task 10: Helper de audit_log

**Files:**
- Create: `src/lib/audit/log.ts`

- [ ] **Step 1: Crear `src/lib/audit/log.ts`**

```ts
import { db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema/app'

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.profile_updated'
  | 'org.updated'
  | 'org.member_invited'
  | 'org.member_removed'
  | 'org.member_role_changed'

export async function logAudit(args: {
  action: AuditAction
  userId?: string
  organizationId?: string
  target?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      action: args.action,
      userId: args.userId ?? null,
      organizationId: args.organizationId ?? null,
      target: args.target ?? null,
      metadata: args.metadata ?? null,
    })
  } catch (err) {
    console.error('[audit] error logging:', err)
    // Audit no debe romper el flujo principal — solo loguear y continuar
  }
}
```

- [ ] **Step 2: Integrar en `src/lib/auth/server.ts`**

Better Auth provee hooks de eventos. Agregar al config:

```ts
// Agregar al objeto betterAuth({ ... }):
hooks: {
  after: [
    {
      matcher: (ctx) => ctx.path.startsWith('/sign-in'),
      handler: async (ctx) => {
        if (ctx.context.newSession?.user?.id) {
          await logAudit({
            action: 'user.login',
            userId: ctx.context.newSession.user.id,
          })
        }
      },
    },
  ],
},
```

(La forma exacta del hook API de Better Auth puede variar entre versiones. Si la sintaxis no funciona, leer la doc de hooks: https://better-auth.com/docs/concepts/hooks. Lo importante: capturar `user.login` minimamente.)

**Nota:** El logging de invitar/remover/cambiar rol se integra naturalmente cuando se hacen esas acciones desde la UI. Por simplicidad, el plan no inserta logAudit en cada endpoint de Better Auth — eso requeriría wrappear sus endpoints. Una alternativa pragmática es agregar logAudit en route handlers propios si los hacemos. Para Sprint 0, **es suficiente con loggear logins**.

- [ ] **Step 3: Smoke test — compila y un login deja registro**

```bash
pnpm tsc --noEmit
pnpm dev &
sleep 8
curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/c.txt -o /dev/null
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev \
  -c "SELECT action, user_id, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5;"
```

Expected: al menos una fila con `action=user.login`. Si no aparece, el hook no se está disparando — investigar.

Cleanup.

- [ ] **Step 4: Commit**

```bash
git add src/lib/audit src/lib/auth/server.ts
git commit -m "feat(fase-3): audit_log helper con logging de login"
```

---

## Task 11: Integración Resend (recuperado de Fase 2)

**Files:**
- Modify: `src/lib/env.ts`
- Create: `src/lib/email/client.ts`, `src/lib/email/templates/{verification,invitation,password-reset,magic-link}.tsx`
- Modify: `src/lib/auth/server.ts`

**Requisito previo:** tener `RESEND_API_KEY` real en `.env`. Obtener en https://resend.com (free tier suficiente para empezar).

- [ ] **Step 1: Instalar dependencias**

```bash
pnpm add resend @react-email/components
```

- [ ] **Step 2: Modificar `src/lib/env.ts`** — hacer Resend required

```ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY es requerida en Fase 3+'),
  EMAIL_FROM: z.email(),
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

- [ ] **Step 3: Crear `src/lib/email/client.ts`** (igual al de Fase 2 deferred)

```ts
import { Resend } from 'resend'
import type { ReactElement } from 'react'
import { env } from '@/lib/env'

export const resend = new Resend(env.RESEND_API_KEY)

export async function sendEmail(args: {
  to: string
  subject: string
  react: ReactElement
}): Promise<void> {
  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: args.to,
    subject: args.subject,
    react: args.react,
  })
  if (result.error) {
    console.error('[email] error enviando:', result.error)
    throw new Error(`Falló envío de email: ${result.error.message}`)
  }
}
```

- [ ] **Step 4: Crear las 4 plantillas en `src/lib/email/templates/`**

(Igual que el plan de Fase 2 Task 11 — copiar tal cual `verification.tsx`, `invitation.tsx`, `password-reset.tsx`, `magic-link.tsx` desde `docs/superpowers/plans/2026-05-12-megacorp-tools-fase-2-auth-ui.md` Task 11 Steps 2-5.)

- [ ] **Step 5: Reemplazar `console.log` en `src/lib/auth/server.ts`** por llamadas a `sendEmail`

(Igual que Fase 2 Task 11 Step 6 — integrar las 4 plantillas en los handlers de Better Auth.)

- [ ] **Step 6: Smoke test funcional**

Asegurate de tener `RESEND_API_KEY` real y `EMAIL_FROM` válido (ej. `onboarding@resend.dev` para pruebas).

```bash
pnpm dev &
sleep 8

# Login admin
curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/c.txt

# Invitar (usar tu email real para verificar recepción)
curl -X POST http://localhost:3000/api/auth/organization/invite-member \
  -H 'Content-Type: application/json' \
  -b /tmp/c.txt \
  -d '{"email":"TU_EMAIL@dominio.com","role":"member"}'
```

Expected: HTTP 200. Email "Invitación a MEGACORP — MegaTools" llega en 1-2 min.

Cleanup.

- [ ] **Step 7: Commit**

```bash
git add src/lib/email src/lib/env.ts src/lib/auth/server.ts package.json pnpm-lock.yaml
git commit -m "feat(fase-3): integración real con Resend (verificación, invitación, password, magic link)"
```

---

## Task 12: Dockerfile + docker-compose.yml para producción

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`

- [ ] **Step 1: Crear `.dockerignore`**

```
node_modules
.next
.git
.env
.env.local
test-results
playwright-report
docs
*.md
```

- [ ] **Step 2: Crear `Dockerfile`** (multi-stage)

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
RUN corepack enable

# Deps stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Para Drizzle migraciones desde el container
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib/db/schema ./src/lib/db/schema

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 3: Modificar `next.config.ts`** para output `standalone`

Leé el archivo actual y agregá la opción `output: 'standalone'`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // ... otras opciones existentes
}

export default nextConfig
```

- [ ] **Step 4: Crear `docker-compose.yml`** (producción)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: megatools-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-megatools}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-megatools}
    volumes:
      - megatools_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-megatools} -d $${POSTGRES_DB:-megatools}"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: megatools-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-megatools}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-megatools}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      NEXT_PUBLIC_BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      RESEND_API_KEY: ${RESEND_API_KEY}
      EMAIL_FROM: ${EMAIL_FROM}
      NODE_ENV: production
    ports:
      - "${APP_PORT:-3000}:3000"

volumes:
  megatools_pgdata:
```

- [ ] **Step 5: Crear `.env.production.example`**

```
POSTGRES_USER=megatools
POSTGRES_PASSWORD=CHANGE_ME_strong_password
POSTGRES_DB=megatools

BETTER_AUTH_SECRET=CHANGE_ME_openssl_rand_base64_32
BETTER_AUTH_URL=https://megatools.tu-dominio.com

RESEND_API_KEY=re_CHANGE_ME
EMAIL_FROM=no-reply@tu-dominio.com

APP_PORT=3000
```

- [ ] **Step 6: Smoke test — build local del Docker image**

```bash
docker build -t megatools:test .
```

Expected: build exitoso. Puede tardar 5-10 minutos la primera vez.

Si falla por algo del Drizzle/Postgres connection (porque no puede conectar durante el build), revisar que el build NO requiera DB — el `pnpm build` de Next.js solo compila assets.

- [ ] **Step 7: Smoke test — docker compose levanta**

Crear `.env.production` con valores reales (basado en `.env.production.example`). NO commitear este archivo.

```bash
docker compose --env-file .env.production up -d
sleep 30
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs app --tail=30
```

Expected: ambos services `Up`, app respondiendo. `curl -sI http://localhost:3000/` retorna 200.

Cleanup:

```bash
docker compose --env-file .env.production down
```

- [ ] **Step 8: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore .env.production.example next.config.ts
git commit -m "feat(fase-3): Dockerfile multi-stage y docker-compose para producción"
```

---

## Task 13: README con instrucciones completas

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Reescribir `README.md`** con la siguiente estructura

```markdown
# MegaTools

Portal interno de herramientas del grupo MEGACORP.

## Stack

- Next.js 16 (App Router, TypeScript estricto)
- Tailwind CSS 4 + shadcn/ui
- PostgreSQL 16 + Drizzle ORM
- Better Auth (con plugin organization + magicLink)
- Resend (email transaccional)
- Playwright (tests E2E)

## Desarrollo local

### Pre-requisitos
- Node 22+ con corepack habilitado
- pnpm
- Docker

### Setup

1. Clonar y entrar al directorio:
   ```bash
   git clone <repo> megacorp-tools
   cd megacorp-tools
   ```

2. Instalar dependencias:
   ```bash
   pnpm install
   ```

3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   # Editar .env: poner BETTER_AUTH_SECRET (generar con `openssl rand -base64 32`)
   # Y RESEND_API_KEY de https://resend.com
   ```

4. Levantar Postgres:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

5. Aplicar migraciones:
   ```bash
   pnpm db:migrate
   ```

6. Crear superadmin + organización inicial:
   ```bash
   pnpm bootstrap --email admin@megacorp.local --password "TuPasswordSegura!" --org "MEGACORP"
   ```

7. Levantar el servidor de dev:
   ```bash
   pnpm dev
   ```

Visitar http://localhost:3000.

### Scripts útiles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo con Turbopack |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción (después de build) |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generar migración Drizzle |
| `pnpm db:migrate` | Aplicar migraciones |
| `pnpm db:studio` | UI web de Drizzle Studio |
| `pnpm bootstrap` | CLI para crear superadmin + org inicial |
| `pnpm test:e2e` | Tests E2E con Playwright |

## Deploy en producción

1. Crear `.env.production` basado en `.env.production.example`:
   ```bash
   cp .env.production.example .env.production
   # Editar con valores reales
   ```

2. Build y levantar:
   ```bash
   docker compose --env-file .env.production up -d --build
   ```

3. Aplicar migraciones desde el container:
   ```bash
   docker compose --env-file .env.production exec app pnpm db:migrate
   ```

4. Bootstrap del superadmin (primera vez):
   ```bash
   docker compose --env-file .env.production exec app \
     pnpm bootstrap --email admin@tu-dominio.com --password "PasswordSegura!" --org "MEGACORP"
   ```

## Arquitectura

Ver `docs/superpowers/specs/2026-05-12-megacorp-tools-fundacion-design.md` para detalles arquitectónicos.

Resumen:
- App única con módulos internos (Next.js App Router)
- Multi-tenant por organización con RBAC simple (owner/admin/member)
- Registry de apps en `src/lib/apps/registry.ts` (single source of truth)
- Cada herramienta = una entrada en el registry + una carpeta en `src/app/(app)/tools/`

## Próximas herramientas

- Separador de PDFs (Sprint 1)
- Procesador de imágenes con IA (Sprint 2)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(fase-3): README con instrucciones de dev y deploy"
```

---

## Task 14: Tests E2E adicionales

**Files:**
- Create: `tests/e2e/settings-profile.spec.ts`, `tests/e2e/admin-flows.spec.ts`

- [ ] **Step 1: Crear `tests/e2e/settings-profile.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 })
}

test('admin puede ver y editar su perfil', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app/settings/perfil')
  await expect(page.getByRole('heading', { name: /mi perfil/i })).toBeVisible()
  await expect(page.getByLabel('Nombre')).toHaveValue(/.+/)
  await expect(page.getByLabel('Email')).toBeDisabled()
})

test('home muestra grid de apps con Settings disponible', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  await expect(page.getByText(/configuraci/i).first()).toBeVisible()
  await expect(page.getByText(/separador de pdf/i).first()).toBeVisible()
  await expect(page.getByText(/próximamente/i).first()).toBeVisible()
})
```

- [ ] **Step 2: Crear `tests/e2e/admin-flows.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 })
}

test('admin puede ver lista de miembros de la organización', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app/settings/organizacion')
  await expect(page.getByRole('heading', { name: /organizaci/i })).toBeVisible()
  await expect(page.getByText('admin@megacorp.local')).toBeVisible()
  // El propio admin se ve como 'owner'
  await expect(page.getByText(/owner|propietario/i)).toBeVisible()
})

test('admin puede abrir diálogo de invitar miembro', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app/settings/organizacion')
  await page.getByRole('button', { name: /invitar/i }).click()
  await expect(page.getByText(/invitar miembro/i).first()).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
})
```

- [ ] **Step 3: Correr todos los tests E2E**

```bash
pnpm test:e2e
```

Expected: 3 (de Fase 2) + 5 (de Fase 3) = 8 tests passing.

Si algún test falla por selectores que no matchean el HTML real, ajustá los selectores (no la implementación).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e
git commit -m "feat(fase-3): tests E2E de Settings y flujos de admin"
```

---

## Cierre de Fase 3 = Cierre de Sprint 0

Al terminar todas las tareas:

- Home `/app` con grid de apps filtrado por rol
- Settings completo (Perfil, Apariencia, Organización con miembros, Notificaciones)
- audit_log registrando logins
- Resend integrado — emails reales para verificación, invitación, password reset, magic link
- Docker para producción funciona
- README con instrucciones completas
- 8 tests E2E pasando

**Sprint 0 cerrado.** El portal está listo para:
- Sprint 1: Primera herramienta real (Separador de PDFs)
- O abrir invitaciones a usuarios reales del grupo MEGACORP

## Notas de ejecución

- **Endpoints exactos de Better Auth para organization**: pueden variar entre versiones. Los nombres del plan son orientativos. Si fallan, consultar https://better-auth.com/docs/plugins/organization para los nombres reales.
- **Hooks de Better Auth para audit log** (Task 10): la firma del hooks API puede diferir. Si no funciona como en el plan, una alternativa es interceptar en route handlers propios para los endpoints que más importan.
- **next.config.ts output standalone** (Task 12): es requerido para que el Dockerfile multi-stage funcione. Si no se aplica, el build no genera `server.js`.
- **Resend free tier**: 100 emails/día, 3000/mes. Para producción real, plan pago o configurar dominio propio.
