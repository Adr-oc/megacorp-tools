# Sprint 2.C — App shell rediseñado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el shell autenticado actual (header simple) por un layout de aplicación con sidebar contextual de 3 variants (home / app / settings), topbar con breadcrumbs + ⌘K palette + bell + ❓ + theme, sidebar footer con user menu, mobile drawer y tracking de recientes vía localStorage.

**Architecture:** El layout `(app)/layout.tsx` se reescribe completo con un `<div>` grid de sidebar + topbar + main. La sidebar es un client component que lee `usePathname()` para decidir variant. Mobile (<lg) muestra el sidebar dentro de un `<Sheet>` con hamburger en topbar. El command palette usa `cmdk` (ya instalado) con atajo global `Cmd/Ctrl+K`. Los componentes nuevos se construyen primero, el switchover del layout viene al final (T13) para minimizar tiempo con el dev roto.

**Tech Stack:** Next 16, React 19, Tailwind 4, shadcn/ui (Base UI), `cmdk@1.1.1` (ya instalado), lucide-react. Sin nuevas deps (solo `pnpm dlx shadcn add sheet` en T1 para el drawer mobile).

**Convenciones:** branch actual `feat/sprint-2c-app-shell` (creada antes del plan). Commits `feat(s2c): …`, `fix(s2c): …`, `test(s2c): …`, `docs(s2c): …`, `refactor(s2c): …`. HEREDOC + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer. tsc verde por commit. Dev `:3003`, cookie `/tmp/mtcookie.txt`, snippet de re-login en T13 si vence. Spanish rioplatense.

---

## File structure

```
NUEVOS:
src/lib/recents/
└── client.ts                    # hook useRecents + addRecent + loadRecents

src/components/ui/
└── sheet.tsx                    # generado por shadcn add sheet

src/components/shell/
├── sidebar-item.tsx             # <Link> + icon + active state
├── sidebar-section.tsx          # <h3 label uppercase> + container
├── sidebar-home.tsx             # variant 'home'
├── sidebar-app.tsx              # variant 'app' (placeholders)
├── sidebar-settings.tsx         # variant 'settings'
├── sidebar-footer.tsx           # user dropdown reubicado
├── app-sidebar.tsx              # wrapper — elige variant según pathname
├── breadcrumbs.tsx              # derivado de pathname + registry
├── notifications-button.tsx     # bell con dropdown placeholder
├── command-palette.tsx          # cmdk con comandos + atajo ⌘K global
├── topbar.tsx                   # hamburger + breadcrumbs + cmd-k + bell + ❓ + theme
└── mobile-nav.tsx               # Sheet wrapper para mobile

tests/e2e/
└── shell.spec.ts                # 4 specs

MODIFICADOS:
src/app/(app)/layout.tsx         # rewrite total con shell nuevo (T13)
src/app/(app)/app/tools/pdf-workbench/workbench.tsx  # remove h1 redundante (breadcrumb ya lo cubre)
src/app/(app)/app/settings/perfil/page.tsx           # registrar addRecent('settings') via client component (T15)
src/app/(app)/app/tools/pdf-workbench/page.tsx       # idem 'pdf-workbench' (T15)
README.md                        # nota del nuevo shell

ELIMINADOS:
src/app/(app)/app/settings/layout.tsx  # ya no necesario (T14)
```

---

## Task 1: Helper de recents + Sheet de shadcn

**Files:**
- Create: `src/lib/recents/client.ts`
- Create: `src/components/ui/sheet.tsx` (vía shadcn)

- [ ] **Step 1: Instalar `<Sheet>` de shadcn**

```bash
pnpm dlx shadcn@latest add sheet -y
```

Expected: archivo nuevo `src/components/ui/sheet.tsx`. Verificar:

```bash
ls src/components/ui/sheet.tsx
head -10 src/components/ui/sheet.tsx
```

- [ ] **Step 2: Crear `src/lib/recents/client.ts`**

```ts
'use client'

import { useEffect, useState } from 'react'

export type RecentApp = {
  appId: string
  visitedAt: number
}

const KEY = 'megatools:recents:v1'
const MAX = 8

export function loadRecents(): RecentApp[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is RecentApp =>
        x != null &&
        typeof x === 'object' &&
        typeof (x as RecentApp).appId === 'string' &&
        typeof (x as RecentApp).visitedAt === 'number',
    )
  } catch {
    return []
  }
}

export function addRecent(appId: string): void {
  if (typeof window === 'undefined') return
  const list = loadRecents().filter((r) => r.appId !== appId)
  list.unshift({ appId, visitedAt: Date.now() })
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
    // Notificar a otros tabs y al hook local
    window.dispatchEvent(new Event('megatools:recents'))
  } catch {
    // silencioso — privacy mode, quota, etc.
  }
}

export function useRecents(): RecentApp[] {
  const [list, setList] = useState<RecentApp[]>([])
  useEffect(() => {
    setList(loadRecents())
    const handler = () => setList(loadRecents())
    window.addEventListener('storage', handler)
    window.addEventListener('megatools:recents', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('megatools:recents', handler)
    }
  }, [])
  return list
}

export function formatRelativeTime(ts: number, now: number = Date.now()): string {
  const diffMin = Math.floor((now - ts) / 60000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `hace ${diffD} d`
}
```

- [ ] **Step 3: Smoke**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sheet.tsx src/lib/recents/client.ts
git commit -m "$(cat <<'EOF'
feat(s2c): helper de recientes (localStorage) + Sheet shadcn para drawer

useRecents hook + addRecent + loadRecents + formatRelativeTime.
Key 'megatools:recents:v1' con max 8 items. Custom event para sync
intra-tab (storage event no se dispara en el tab que escribe).

Sheet instalado vía shadcn — base para el drawer mobile del sidebar (T12).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Sidebar primitives (item + section)

**Files:**
- Create: `src/components/shell/sidebar-item.tsx`
- Create: `src/components/shell/sidebar-section.tsx`

- [ ] **Step 1: Crear `src/components/shell/sidebar-item.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  label: string
  icon?: LucideIcon
  exact?: boolean
  meta?: string
}

export function SidebarItem({ href, label, icon: Icon, exact, meta }: Props) {
  const pathname = usePathname() ?? ''
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm border-l-2 transition',
        active
          ? 'border-brand-accent bg-muted/40 text-foreground font-medium'
          : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {meta && <span className="text-[10px] font-mono text-muted-foreground">{meta}</span>}
    </Link>
  )
}
```

- [ ] **Step 2: Crear `src/components/shell/sidebar-section.tsx`**

```tsx
type Props = {
  label?: string
  children: React.ReactNode
}

export function SidebarSection({ label, children }: Props) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/shell/sidebar-item.tsx src/components/shell/sidebar-section.tsx
git commit -m "feat(s2c): primitives del sidebar — <SidebarItem> + <SidebarSection>"
```

---

## Task 3: Sidebar variant — Home

**Files:**
- Create: `src/components/shell/sidebar-home.tsx`

- [ ] **Step 1: Crear `src/components/shell/sidebar-home.tsx`**

```tsx
'use client'

import { FileText, Settings, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRecents, formatRelativeTime, type RecentApp } from '@/lib/recents/client'
import { apps } from '@/lib/apps/registry'
import { SidebarSection } from './sidebar-section'
import { SidebarItem } from './sidebar-item'

// Mapeo de appId → icon + href "principal"
const APP_META: Record<string, { icon: LucideIcon; href: string; label: string }> = {
  'pdf-workbench': { icon: FileText, href: '/app/tools/pdf-workbench', label: 'PDF Workbench' },
  settings: { icon: Settings, href: '/app/settings/perfil', label: 'Configuración' },
  // Atajo especial: cuando trackeamos visita a "miembros", lo mostramos como item independiente
  'settings-members': { icon: Users, href: '/app/settings/organizacion', label: 'Miembros' },
}

function metaFor(r: RecentApp): { icon: LucideIcon; href: string; label: string } | null {
  const known = APP_META[r.appId]
  if (known) return known
  // Fallback: si el appId matchea alguna entrada del registry, generar metadata
  const app = apps.find((a) => a.id === r.appId)
  if (app) return { icon: app.icon, href: app.href, label: app.name }
  return null
}

export function SidebarHome() {
  const recents = useRecents()
  const now = Date.now()

  return (
    <div className="space-y-5">
      {recents.length > 0 ? (
        <SidebarSection label="Reciente">
          {recents
            .map((r) => ({ r, meta: metaFor(r) }))
            .filter((x): x is { r: RecentApp; meta: NonNullable<ReturnType<typeof metaFor>> } => x.meta !== null)
            .slice(0, 5)
            .map(({ r, meta }) => (
              <SidebarItem
                key={r.appId}
                href={meta.href}
                label={meta.label}
                icon={meta.icon}
                meta={formatRelativeTime(r.visitedAt, now)}
              />
            ))}
        </SidebarSection>
      ) : (
        <SidebarSection label="Reciente">
          <p className="px-2.5 py-1 text-xs text-muted-foreground italic">
            Tus apps recientes aparecerán acá.
          </p>
        </SidebarSection>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/shell/sidebar-home.tsx
git commit -m "feat(s2c): sidebar variant 'home' con sección Reciente desde localStorage"
```

---

## Task 4: Sidebar variant — App (PDF Workbench)

**Files:**
- Create: `src/components/shell/sidebar-app.tsx`

- [ ] **Step 1: Crear `src/components/shell/sidebar-app.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft, Download, FileText, Upload } from 'lucide-react'
import { SidebarSection } from './sidebar-section'

type Props = {
  appLabel: string
  // Workspace stats placeholder (Sprint 2.C deja estos estáticos —
  // wiring real al Context del workbench queda para 2.C.1).
  docs?: number | null
  pages?: number | null
  onUpload?: () => void
  onExport?: () => void
}

export function SidebarApp({ appLabel, docs = null, pages = null, onUpload, onExport }: Props) {
  return (
    <div className="space-y-5">
      <Link
        href="/app"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a apps
      </Link>

      <SidebarSection label={appLabel}>
        <div className="px-2.5 py-1 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>
            {docs === null ? 'Workspace abierto' : `${docs} documento${docs === 1 ? '' : 's'}`}
            {pages !== null && <> · {pages} pág.</>}
          </span>
        </div>
      </SidebarSection>

      <SidebarSection label="Acciones">
        <button
          type="button"
          onClick={onUpload}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition w-full text-left"
        >
          <Upload className="h-4 w-4" />
          Añadir PDFs
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition w-full text-left"
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
      </SidebarSection>
    </div>
  )
}
```

Nota: `onUpload` y `onExport` son hooks opcionales. En este sprint los dejamos como `undefined` (los botones no hacen nada visible); el wiring al PDF Workbench se hace en 2.C.1 cuando refactoreemos el state del workbench a global.

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/shell/sidebar-app.tsx
git commit -m "feat(s2c): sidebar variant 'app' con back + stats placeholder + acciones"
```

---

## Task 5: Sidebar variant — Settings

**Files:**
- Create: `src/components/shell/sidebar-settings.tsx`

- [ ] **Step 1: Crear `src/components/shell/sidebar-settings.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft, Bell, Building2, FileSearch, Palette, User, Users } from 'lucide-react'
import { SidebarSection } from './sidebar-section'
import { SidebarItem } from './sidebar-item'

type Props = {
  role: 'owner' | 'admin' | 'member'
}

export function SidebarSettings({ role }: Props) {
  const canManageOrg = role === 'owner' || role === 'admin'

  return (
    <div className="space-y-5">
      <Link
        href="/app"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a apps
      </Link>

      <SidebarSection label="Tu cuenta">
        <SidebarItem href="/app/settings/perfil" label="Mi perfil" icon={User} />
        <SidebarItem href="/app/settings/apariencia" label="Apariencia" icon={Palette} />
      </SidebarSection>

      <SidebarSection label="Organización">
        <SidebarItem href="/app/settings/organizacion" label="Organización" icon={Building2} />
        {canManageOrg && (
          <SidebarItem href="/app/settings/miembros" label="Miembros" icon={Users} />
        )}
        {canManageOrg && (
          <SidebarItem href="/app/settings/audit" label="Audit log" icon={FileSearch} />
        )}
      </SidebarSection>

      <SidebarSection label="Notificaciones">
        <SidebarItem href="/app/settings/notificaciones" label="Notificaciones" icon={Bell} />
      </SidebarSection>
    </div>
  )
}
```

**Notas:**
- `Miembros` y `Audit log` son items hardcoded a hrefs que NO existen como page todavía:
  - `/app/settings/miembros` no existe; los miembros se administran desde `/app/settings/organizacion` (mismo page con la sección de members). Para evitar 404, el href apunta a `/app/settings/organizacion`. **Voy a corregirlo a `organizacion`**.
  - `/app/settings/audit` no existe — placeholder. Lo dejamos linkable; el page renderea "Próximamente" en T16.

Aplicar la corrección — sobrescribir el `<SidebarItem href="/app/settings/miembros" ... />` por:

```tsx
        {canManageOrg && (
          <SidebarItem href="/app/settings/organizacion" label="Miembros" icon={Users} />
        )}
```

Espera — esto duplica el href de "Organización". Mejor opción: **eliminar el item "Miembros"** del sidebar settings (los miembros viven dentro de "Organización" como sección embed). Quitar las 3 líneas del `<SidebarItem href="/app/settings/miembros" ... />`.

Versión final del componente (con Miembros removido):

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft, Bell, Building2, FileSearch, Palette, User } from 'lucide-react'
import { SidebarSection } from './sidebar-section'
import { SidebarItem } from './sidebar-item'

type Props = {
  role: 'owner' | 'admin' | 'member'
}

export function SidebarSettings({ role }: Props) {
  const canManageOrg = role === 'owner' || role === 'admin'

  return (
    <div className="space-y-5">
      <Link
        href="/app"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a apps
      </Link>

      <SidebarSection label="Tu cuenta">
        <SidebarItem href="/app/settings/perfil" label="Mi perfil" icon={User} />
        <SidebarItem href="/app/settings/apariencia" label="Apariencia" icon={Palette} />
      </SidebarSection>

      <SidebarSection label="Organización">
        <SidebarItem href="/app/settings/organizacion" label="Organización" icon={Building2} />
        {canManageOrg && (
          <SidebarItem href="/app/settings/audit" label="Audit log" icon={FileSearch} />
        )}
      </SidebarSection>

      <SidebarSection label="Notificaciones">
        <SidebarItem href="/app/settings/notificaciones" label="Notificaciones" icon={Bell} />
      </SidebarSection>
    </div>
  )
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/shell/sidebar-settings.tsx
git commit -m "feat(s2c): sidebar variant 'settings' con secciones Tu cuenta / Org / Notif"
```

---

## Task 6: Sidebar footer (user info + dropdown)

**Files:**
- Create: `src/components/shell/sidebar-footer.tsx`

- [ ] **Step 1: Crear `src/components/shell/sidebar-footer.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth/client'

type Props = {
  user: { email: string; name?: string | null }
}

function initials(name: string | null | undefined, email: string): string {
  const base = name?.trim() || email
  const parts = base.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

export function SidebarFooter({ user }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="border-t p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="w-full justify-start gap-2 h-auto py-1.5 px-2 hover:bg-muted">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">{initials(user.name, user.email)}</AvatarFallback>
              </Avatar>
              <div className="text-left min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user.name ?? user.email}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
              </div>
            </Button>
          }
        />
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user.name ?? 'Usuario'}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/shell/sidebar-footer.tsx
git commit -m "feat(s2c): sidebar footer con user info + dropdown (reubica UserMenu)"
```

---

## Task 7: AppSidebar wrapper

**Files:**
- Create: `src/components/shell/app-sidebar.tsx`

- [ ] **Step 1: Crear `src/components/shell/app-sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MegacorpLogo } from '@/components/brand/logo'
import { SidebarHome } from './sidebar-home'
import { SidebarApp } from './sidebar-app'
import { SidebarSettings } from './sidebar-settings'
import { SidebarFooter } from './sidebar-footer'

type Variant = 'home' | 'app' | 'settings'

function variantFor(pathname: string): Variant {
  if (pathname.startsWith('/app/settings')) return 'settings'
  if (pathname.startsWith('/app/tools')) return 'app'
  return 'home'
}

function appLabelFor(pathname: string): string {
  if (pathname.startsWith('/app/tools/pdf-workbench')) return 'PDF Workbench'
  return 'Aplicación'
}

type Props = {
  user: { email: string; name?: string | null }
  orgName: string | null
  role: 'owner' | 'admin' | 'member'
}

export function AppSidebar({ user, orgName, role }: Props) {
  const pathname = usePathname() ?? '/app'
  const variant = variantFor(pathname)

  return (
    <aside className="h-full flex flex-col bg-card border-r w-60 shrink-0">
      {/* Header del sidebar — workspace switcher (placeholder) */}
      <div className="p-3 border-b">
        <Link href="/app" className="flex items-center gap-2.5 px-1 py-0.5 rounded-md hover:bg-muted transition">
          <MegacorpLogo variant="mono" size={24} />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">{orgName ?? 'MEGACORP'}</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
              workspace
            </span>
          </div>
        </Link>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {variant === 'home' && <SidebarHome />}
        {variant === 'app' && <SidebarApp appLabel={appLabelFor(pathname)} />}
        {variant === 'settings' && <SidebarSettings role={role} />}
      </div>

      <SidebarFooter user={user} />
    </aside>
  )
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/shell/app-sidebar.tsx
git commit -m "feat(s2c): <AppSidebar> wrapper — elige variant por pathname + header + footer"
```

---

## Task 8: Breadcrumbs

**Files:**
- Create: `src/components/shell/breadcrumbs.tsx`

- [ ] **Step 1: Crear `src/components/shell/breadcrumbs.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

type Crumb = { label: string; href: string | null }

const STATIC_LABELS: Record<string, string> = {
  '/app': 'Apps',
  '/app/tools/pdf-workbench': 'PDF Workbench',
  '/app/settings': 'Configuración',
  '/app/settings/perfil': 'Mi perfil',
  '/app/settings/apariencia': 'Apariencia',
  '/app/settings/organizacion': 'Organización',
  '/app/settings/notificaciones': 'Notificaciones',
  '/app/settings/audit': 'Audit log',
}

function buildCrumbs(pathname: string, orgName: string | null): Crumb[] {
  const crumbs: Crumb[] = [{ label: orgName ?? 'MEGACORP', href: '/app' }]

  if (pathname === '/app' || pathname === '/app/') {
    crumbs.push({ label: 'Apps', href: null })
    return crumbs
  }
  if (pathname.startsWith('/app/tools/')) {
    crumbs.push({ label: 'Apps', href: '/app' })
    const label = STATIC_LABELS[pathname] ?? 'Aplicación'
    crumbs.push({ label, href: null })
    return crumbs
  }
  if (pathname.startsWith('/app/settings')) {
    crumbs.push({ label: 'Configuración', href: '/app/settings' })
    const sub = STATIC_LABELS[pathname]
    if (sub && pathname !== '/app/settings') {
      crumbs.push({ label: sub, href: null })
    }
    return crumbs
  }
  return crumbs
}

type Props = { orgName: string | null }

export function Breadcrumbs({ orgName }: Props) {
  const pathname = usePathname() ?? '/app'
  const crumbs = buildCrumbs(pathname, orgName)

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm min-w-0">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            {c.href && !isLast ? (
              <Link href={c.href} className="text-muted-foreground hover:text-foreground truncate">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium truncate' : 'text-muted-foreground truncate'}>
                {c.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/shell/breadcrumbs.tsx
git commit -m "feat(s2c): <Breadcrumbs> deriva crumbs del pathname con labels estáticos"
```

---

## Task 9: Notifications button (placeholder)

**Files:**
- Create: `src/components/shell/notifications-button.tsx`

- [ ] **Step 1: Crear `src/components/shell/notifications-button.tsx`**

```tsx
'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function NotificationsButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notificaciones">
            <Bell className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-3 py-2">
          <div className="text-sm font-medium mb-1">Notificaciones</div>
          <p className="text-xs text-muted-foreground">No tenés notificaciones.</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/shell/notifications-button.tsx
git commit -m "feat(s2c): notifications bell con dropdown placeholder (sin backend)"
```

---

## Task 10: Command palette (⌘K)

**Files:**
- Create: `src/components/shell/command-palette.tsx`

- [ ] **Step 1: Crear `src/components/shell/command-palette.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Command } from 'cmdk'
import {
  Building2,
  FileText,
  LogOut,
  Moon,
  Palette,
  Search,
  Settings,
  Sun,
  User,
} from 'lucide-react'
import { authClient } from '@/lib/auth/client'
import { cn } from '@/lib/utils'

type Item = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onSelect: () => void
  group: 'Navegación' | 'Acciones'
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // Atajo global Cmd/Ctrl + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  function toggleTheme() {
    setOpen(false)
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  async function logout() {
    setOpen(false)
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  const items: Item[] = [
    { id: 'nav-apps', label: 'Apps', icon: Settings, group: 'Navegación', onSelect: () => go('/app') },
    { id: 'nav-pdf', label: 'PDF Workbench', icon: FileText, group: 'Navegación', onSelect: () => go('/app/tools/pdf-workbench') },
    { id: 'nav-perfil', label: 'Mi perfil', icon: User, group: 'Navegación', onSelect: () => go('/app/settings/perfil') },
    { id: 'nav-apariencia', label: 'Apariencia', icon: Palette, group: 'Navegación', onSelect: () => go('/app/settings/apariencia') },
    { id: 'nav-org', label: 'Organización', icon: Building2, group: 'Navegación', onSelect: () => go('/app/settings/organizacion') },
    { id: 'theme-toggle', label: theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro', icon: theme === 'dark' ? Sun : Moon, group: 'Acciones', onSelect: toggleTheme },
    { id: 'logout', label: 'Cerrar sesión', icon: LogOut, group: 'Acciones', onSelect: () => void logout() },
  ]

  const groups = ['Navegación', 'Acciones'] as const

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 h-8 rounded-md border bg-background px-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition w-64"
        aria-label="Buscar o ejecutar"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Buscar o ejecutar…</span>
        <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
        aria-label="Buscar o ejecutar"
      >
        <Search className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 backdrop-blur-sm p-4 pt-[20vh]"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-xl rounded-xl bg-card border shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <Command label="Comandos">
              <div className="flex items-center gap-2 border-b px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  placeholder="Buscar o ejecutar…"
                  className="flex-1 h-12 bg-transparent outline-none text-sm"
                  autoFocus
                />
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted">esc</kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-sm text-muted-foreground text-center">
                  Sin resultados.
                </Command.Empty>
                {groups.map((g) => {
                  const groupItems = items.filter((i) => i.group === g)
                  if (groupItems.length === 0) return null
                  return (
                    <Command.Group
                      key={g}
                      heading={g}
                      className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {groupItems.map((it) => (
                        <Command.Item
                          key={it.id}
                          value={`${it.label} ${it.group}`}
                          onSelect={it.onSelect}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-foreground cursor-pointer',
                            'data-[selected=true]:bg-brand-accent/15 data-[selected=true]:text-foreground',
                          )}
                        >
                          <it.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{it.label}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )
                })}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/shell/command-palette.tsx
git commit -m "feat(s2c): command palette ⌘K con cmdk (nav + theme + logout)"
```

---

## Task 11: Topbar

**Files:**
- Create: `src/components/shell/topbar.tsx`

- [ ] **Step 1: Crear `src/components/shell/topbar.tsx`**

```tsx
import { ThemeToggle } from '@/components/theme-toggle'
import { TourLauncher } from '@/components/help/tour-launcher'
import { Breadcrumbs } from './breadcrumbs'
import { CommandPalette } from './command-palette'
import { NotificationsButton } from './notifications-button'
import { MobileNav } from './mobile-nav'

type Props = {
  orgName: string | null
  user: { email: string; name?: string | null }
  role: 'owner' | 'admin' | 'member'
}

export function Topbar({ orgName, user, role }: Props) {
  return (
    <header className="h-14 border-b bg-card/95 backdrop-blur sticky top-0 z-30">
      <div className="h-full flex items-center gap-3 px-4">
        <MobileNav orgName={orgName} user={user} role={role} />
        <Breadcrumbs orgName={orgName} />
        <div className="flex-1" />
        <CommandPalette />
        <NotificationsButton />
        <TourLauncher />
        <ThemeToggle />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit  # va a fallar — MobileNav todavía no existe; lo creamos en T12 y entonces commiteamos
```

(Si tsc falla por `MobileNav` no encontrado, está bien — la próxima task lo crea. Saltar el commit aquí y commitearlo junto con T12.)

---

## Task 12: MobileNav (hamburger + Sheet drawer)

**Files:**
- Create: `src/components/shell/mobile-nav.tsx`

- [ ] **Step 1: Crear `src/components/shell/mobile-nav.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { AppSidebar } from './app-sidebar'

type Props = {
  orgName: string | null
  user: { email: string; name?: string | null }
  role: 'owner' | 'admin' | 'member'
}

export function MobileNav({ orgName, user, role }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar drawer al navegar
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
            <Menu className="h-4 w-4" />
          </Button>
        }
      />
      <SheetContent side="left" className="p-0 w-72">
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <AppSidebar orgName={orgName} user={user} role={role} />
      </SheetContent>
    </Sheet>
  )
}
```

**Nota sobre `<SheetTrigger render={...}>` y `<SheetTitle>`:** Sheet de shadcn (Base UI) sigue el mismo patrón que Dialog. Si `SheetTrigger` no acepta `render={...}` directamente, ajustar al estilo del propio `sheet.tsx` que generó shadcn. La `<SheetTitle>` con `sr-only` es por accesibilidad (Base UI exige título en diálogos).

- [ ] **Step 2: Verificar el API real del Sheet generado**

```bash
grep -nE "SheetTrigger|SheetTitle" src/components/ui/sheet.tsx | head -10
```

Si `SheetTrigger` NO acepta `render`, ajustar en `mobile-nav.tsx`:

```tsx
<SheetTrigger asChild>
  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
    <Menu className="h-4 w-4" />
  </Button>
</SheetTrigger>
```

(Probar primero con `render` ya que es Base UI; si tsc da error, switchear a `asChild`.)

- [ ] **Step 3: Smoke + commit (junto con T11)**

```bash
pnpm tsc --noEmit
git add src/components/shell/topbar.tsx src/components/shell/mobile-nav.tsx
git commit -m "$(cat <<'EOF'
feat(s2c): topbar (breadcrumbs + ⌘K + bell + ❓ + theme) + mobile drawer

Topbar sticky h-14 con backdrop-blur. MobileNav usa Sheet (shadcn)
con AppSidebar adentro — se cierra automático al navegar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Reescribir (app)/layout.tsx con shell nuevo

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Reescribir el archivo completo**

```tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { member, organization } from '@/lib/db/schema/auth'
import { coerceAccent } from '@/lib/accent/presets'
import { AppSidebar } from '@/components/shell/app-sidebar'
import { Topbar } from '@/components/shell/topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/login')
  }
  if (!session.user.emailVerified) {
    redirect('/verify-email-pending')
  }
  if (!(session.user as { onboardedAt?: Date | string | null }).onboardedAt) {
    redirect('/onboarding')
  }

  const accent = coerceAccent((session.user as { accentColor?: unknown }).accentColor)

  // Org name + rol del user en la org activa
  const activeOrgId = session.session.activeOrganizationId
  let orgName: string | null = null
  let role: 'owner' | 'admin' | 'member' = 'member'

  if (activeOrgId) {
    const [org] = await db.select().from(organization).where(eq(organization.id, activeOrgId)).limit(1)
    orgName = org?.name ?? null
    const [m] = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrgId)))
      .limit(1)
    role = (m?.role ?? 'member') as 'owner' | 'admin' | 'member'
  }

  return (
    <div data-accent={accent} data-accent-root className="h-screen flex">
      {/* Sidebar desktop — oculta en mobile */}
      <div className="hidden lg:block h-full">
        <AppSidebar user={session.user} orgName={orgName} role={role} />
      </div>
      {/* Topbar + main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar orgName={orgName} user={session.user} role={role} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke — todas las rutas autenticadas renderizan**

```bash
pnpm tsc --noEmit
# Re-loguear (cookie pudo vencer)
curl -sS -o /dev/null -X POST http://localhost:3003/api/auth/sign-in/email \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3003' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/mtcookie.txt
# Setear onboardedAt para que no redirija a /onboarding
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev \
  -c "UPDATE \"user\" SET onboarded_at = NOW() WHERE email = 'admin@megacorp.local';" > /dev/null

for path in /app /app/settings/perfil /app/settings/apariencia /app/settings/organizacion /app/tools/pdf-workbench; do
  http=$(curl -sS -o /dev/null -w "%{http_code}" "http://localhost:3003${path}" -b /tmp/mtcookie.txt)
  echo "${path} = ${http}"
done

# Verificar que los nuevos componentes renderizan
curl -sS http://localhost:3003/app -b /tmp/mtcookie.txt | grep -oE "data-accent-root|Buscar o ejecutar|Reciente|workspace" | sort -u
curl -sS http://localhost:3003/app/settings/perfil -b /tmp/mtcookie.txt | grep -oE "Tu cuenta|Mi perfil|Configuración" | sort -u
```

Expected: las 5 rutas dan 200; grep imprime los textos del shell nuevo.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/(app)/layout.tsx'
git commit -m "$(cat <<'EOF'
feat(s2c): reescribir (app)/layout con shell nuevo (sidebar + topbar)

Layout flex: sidebar desktop (hidden < lg) + Topbar + main scrollable.
Lee org + role del session para pasar a sidebar y topbar.
Header viejo (logo + theme + UserMenu) eliminado — su contenido vive
en sidebar (logo + workspace label + user footer) y topbar (cmd-k + ❓ +
theme + bell).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Eliminar settings/layout.tsx (sub-sidebar viejo) + ajustar settings/audit placeholder

**Files:**
- Delete: `src/app/(app)/app/settings/layout.tsx`
- Create: `src/app/(app)/app/settings/audit/page.tsx`

- [ ] **Step 1: Eliminar el layout viejo del sub-sidebar**

```bash
rm 'src/app/(app)/app/settings/layout.tsx'
```

Sin layout, las pages renderean directo en el `<main>` del shell global.

- [ ] **Step 2: Crear placeholder de audit log**

```tsx
// src/app/(app)/app/settings/audit/page.tsx
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'

export default async function AuditPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const activeOrgId = session.session.activeOrganizationId
  let role: 'owner' | 'admin' | 'member' = 'member'
  if (activeOrgId) {
    const [m] = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrgId)))
      .limit(1)
    role = (m?.role ?? 'member') as typeof role
  }
  if (role === 'member') {
    return <p className="text-muted-foreground">No tenés acceso a esta sección.</p>
  }
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Audit log</h1>
      <p className="text-muted-foreground mb-6">Registro de eventos de la organización.</p>
      <div className="rounded-lg border bg-muted/30 p-12 text-center">
        <p className="text-sm text-muted-foreground">Próximamente.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Smoke**

```bash
pnpm tsc --noEmit
# Settings sub-rutas siguen funcionando
for path in /app/settings/perfil /app/settings/apariencia /app/settings/organizacion /app/settings/notificaciones /app/settings/audit; do
  http=$(curl -sS -o /dev/null -w "%{http_code}" "http://localhost:3003${path}" -b /tmp/mtcookie.txt)
  echo "${path} = ${http}"
done
```

Expected: las 5 rutas 200.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/(app)/app/settings/'
git commit -m "$(cat <<'EOF'
refactor(s2c): eliminar sub-sidebar de settings + audit placeholder

El sub-sidebar viejo (layout.tsx con 4 items) se reemplaza por el
sidebar global variant 'settings'. La page de audit log es placeholder
con copy "Próximamente"; sólo accesible a admin/owner.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Tracking de recientes (addRecent en page mounts)

**Files:**
- Modify: `src/app/(app)/app/tools/pdf-workbench/workbench.tsx`
- Create: `src/app/(app)/app/settings/_track-settings.tsx`
- Modify: `src/app/(app)/app/settings/perfil/page.tsx` (y otras settings pages)

- [ ] **Step 1: Tracking de PDF Workbench dentro del client component existente**

En `src/app/(app)/app/tools/pdf-workbench/workbench.tsx`, en el `WorkbenchInner` agregar al import y al body un `useEffect` que llame `addRecent('pdf-workbench')` al mount.

Localizar el bloque de imports del top y agregar:

```tsx
import { useEffect, useRef } from 'react'
import { addRecent } from '@/lib/recents/client'
```

(Si `useRef` ya está importado, no duplicar.)

Adentro de `WorkbenchInner`, después de las líneas de hooks existentes (después de `const triggerPickerRef = ...`), agregar:

```tsx
  useEffect(() => {
    addRecent('pdf-workbench')
  }, [])
```

También — si el `<h1>PDF Workbench</h1>` del header del workbench molesta visualmente porque el breadcrumb ya muestra "PDF Workbench", podés eliminar la línea. Decisión: **mantener el h1** porque sirve como anchor visual de la herramienta dentro del main; el breadcrumb es secundario. Sin cambio acá.

- [ ] **Step 2: Crear un tracker reusable para settings**

```tsx
// src/app/(app)/app/settings/_track-settings.tsx
'use client'

import { useEffect } from 'react'
import { addRecent } from '@/lib/recents/client'

export function TrackSettings() {
  useEffect(() => {
    addRecent('settings')
  }, [])
  return null
}
```

- [ ] **Step 3: Montar el tracker en las pages de settings**

En **cada una** de las pages `perfil`, `apariencia`, `organizacion`, `notificaciones`, `audit`, agregar `<TrackSettings />` al render. Por ejemplo en `src/app/(app)/app/settings/perfil/page.tsx`:

Localizar el import block del top, agregar:

```tsx
import { TrackSettings } from '@/app/(app)/app/settings/_track-settings'
```

Y al inicio del JSX retornado, agregar `<TrackSettings />`:

```tsx
return (
  <div>
    <TrackSettings />
    <h1 className="text-2xl font-bold mb-2">Mi perfil</h1>
    {/* ...resto sin cambios... */}
  </div>
)
```

Repetir en las otras 4 settings pages.

- [ ] **Step 4: Smoke**

```bash
pnpm tsc --noEmit
# Visitar /app/tools/pdf-workbench y verificar que aparece en localStorage del browser.
# Como esto es client-side, no es fácil testearlo via curl. Lo verificamos en T16 con E2E.
```

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/app/tools/pdf-workbench/workbench.tsx' 'src/app/(app)/app/settings/'
git commit -m "$(cat <<'EOF'
feat(s2c): tracking de recientes — addRecent al mount de workbench y settings

PDF Workbench dispatcha addRecent('pdf-workbench') en useEffect.
Las 5 pages de settings montan <TrackSettings /> que dispatcha
addRecent('settings'). Los recientes aparecen en sidebar variant
'home' agrupados por appId, ordenados por timestamp desc.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Tests E2E del shell

**Files:**
- Create: `tests/e2e/shell.spec.ts`

- [ ] **Step 1: Crear `tests/e2e/shell.spec.ts`**

```ts
import { test, expect, type Page } from '@playwright/test'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
  await expect(page).toHaveURL(/\/app(?!\/onboarding)/, { timeout: 10_000 })
}

test('topbar muestra breadcrumbs según pathname', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  await expect(page.getByRole('navigation', { name: /breadcrumb/i }).getByText(/megacorp/i).first()).toBeVisible()
  await expect(page.getByRole('navigation', { name: /breadcrumb/i }).getByText('Apps')).toBeVisible()

  await page.goto('/app/settings/perfil')
  const crumb = page.getByRole('navigation', { name: /breadcrumb/i })
  await expect(crumb.getByText('Configuración')).toBeVisible()
  await expect(crumb.getByText('Mi perfil')).toBeVisible()
})

test('sidebar variant cambia con la ruta', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  // Variant 'home' — buscar texto "Reciente" o placeholder
  await expect(page.getByText(/reciente/i).first()).toBeVisible()

  await page.goto('/app/settings/apariencia')
  // Variant 'settings' — sección "Tu cuenta"
  await expect(page.getByText(/tu cuenta/i).first()).toBeVisible()

  await page.goto('/app/tools/pdf-workbench')
  // Variant 'app' — back link
  await expect(page.getByRole('link', { name: /volver a apps/i })).toBeVisible()
})

test('⌘K abre el command palette', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  await page.keyboard.press('Control+K')
  await expect(page.getByPlaceholder(/buscar o ejecutar/i).last()).toBeVisible()
  await page.getByPlaceholder(/buscar o ejecutar/i).last().fill('perfil')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/app\/settings\/perfil/, { timeout: 5_000 })
})

test('sidebar footer tiene user info y dropdown logout', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  await expect(page.getByText('admin@megacorp.local').first()).toBeVisible()
  // Click sobre el avatar/email para abrir el dropdown
  await page.getByRole('button', { name: /admin@megacorp\.local|admin/i }).first().click()
  await expect(page.getByRole('menuitem', { name: /cerrar sesión/i })).toBeVisible()
})
```

- [ ] **Step 2: Correr la suite del nuevo spec**

```bash
PLAYWRIGHT_PORT=3003 PLAYWRIGHT_BASE_URL=http://localhost:3003 pnpm test:e2e tests/e2e/shell.spec.ts
```

Expected: 4 passed. Si algún test falla por selectores (texto exacto que no matchea), inspeccionar el DOM en `playwright-report/` y ajustar — NO la implementación. Los selectores aceptables: ajustar `regex` para tolerar variaciones de casing/whitespace.

- [ ] **Step 3: Suite completa**

```bash
PLAYWRIGHT_PORT=3003 PLAYWRIGHT_BASE_URL=http://localhost:3003 pnpm test:e2e
```

Expected: 17 anteriores + 4 nuevos = **21 passed**. La suite ya está en `workers: 1` (desde 2.B), así que serializa naturalmente.

Si algún test pre-existente falla por el shell nuevo (ej. selectores de "MegaTools" header viejo), ajustar el spec, no el shell. Posibles ajustes:
- `golden-path.spec.ts:3` espera heading "MegaTools" en `/`. Esa ruta es pública, no afectada por el shell — debería pasar.
- `settings-profile.spec.ts:19` espera grid en `/app` — sigue ahí.
- `admin-flows.spec.ts` navega a `/app/settings/organizacion` — sigue funcionando con el sidebar global.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/shell.spec.ts
git commit -m "$(cat <<'EOF'
test(s2c): 4 specs E2E del shell (breadcrumbs, sidebar variants, ⌘K, footer)

Cubre el comportamiento clave del shell nuevo. Si algún spec previo
falló por selectores rotos del shell viejo, también incluir esos
ajustes en este commit.

Suite total: 17 + 4 = 21 passing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: README + push

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Agregar nota del shell al README**

Después del párrafo de "Onboarding" en la sección "## Diseño", agregar:

```markdown

**App shell.** Layout estilo Linear: sidebar contextual a la izquierda
que cambia según el módulo (recientes en home, info del app abierto
en herramientas, secciones de configuración en settings); topbar con
breadcrumbs, búsqueda **⌘K** (navegar a apps + cambiar tema + logout),
notificaciones y ayuda. El user menu vive en el footer del sidebar.
En mobile la sidebar se oculta y aparece un drawer con hamburger.
```

- [ ] **Step 2: Verificación final**

```bash
pnpm tsc --noEmit
PLAYWRIGHT_PORT=3003 PLAYWRIGHT_BASE_URL=http://localhost:3003 pnpm test:e2e 2>&1 | tail -5
git log --oneline 327ad24..HEAD | wc -l
```

Expected: tsc EXIT=0, suite 21/21, ~17 commits del sprint.

- [ ] **Step 3: Commit + push**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs(s2c): README menciona el nuevo app shell (sidebar contextual + ⌘K)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin feat/sprint-2c-app-shell 2>&1 | tail -3
```

---

## Definición de hecho (recap del spec)

- [x] `pnpm tsc --noEmit` y `pnpm lint` sin issues nuevos
- [x] `(app)/layout.tsx` tiene sidebar + topbar + main, sin header viejo
- [x] Sidebar tiene 3 variants funcionales según pathname (home / app / settings)
- [x] Sidebar footer muestra user + dropdown logout
- [x] Topbar tiene breadcrumbs + ⌘K trigger + bell + ❓ + theme
- [x] ⌘K palette abre con atajo + click + lista de comandos navegables
- [x] Mobile: hamburger en topbar + drawer con sidebar
- [x] localStorage tracking de recientes funciona; sidebar home los muestra
- [x] Settings sub-sidebar viejo eliminado; sus items viven en sidebar global
- [x] Item activo en sidebar marca con borde brand-accent (consistente con 2.A)
- [x] Especs E2E previos siguen pasando + 4 nuevos del shell = 21/21
- [x] PDF Workbench funcional dentro del nuevo shell sin regresiones
- [x] README mención del nuevo shell

## Notas para el implementador

- **No matar el dev :3003** — HMR aplica los cambios. Si en algún smoke aparece código viejo, esperar 1-2s y reintentar.
- **Cookie `/tmp/mtcookie.txt`** vence ocasionalmente — re-login con el snippet de T13 Step 2.
- **Postgres dev** en `:5435`. Si está caído: `docker compose -f docker-compose.dev.yml up -d`.
- **Lint del repo** trae 9 errores pre-existentes; tu cambio no debe sumar.
- **`bg-brand-accent`** y otras clases Tailwind 4 vienen de las CSS vars que definimos en 2.A — funcionan out of the box.
- **`<SheetTrigger>` API**: en Base UI (que es lo que usa shadcn en este repo), los triggers aceptan `render={<Button…/>}`. Si tsc se queja, ajustar al patrón `asChild` del propio sheet generado.
- **El switchover del shell (T13)** es el momento de mayor riesgo. Una vez aplicado, todas las rutas autenticadas usan el nuevo layout. Si algo se rompe, el debug es en el componente específico, no en el layout — los components fueron construidos y probados aisladamente en T2-T12.
- **Settings layout viejo eliminado en T14**: si las pages de settings tienen layout cruzado con flex/columns que asumían el sub-sidebar viejo, ajustar — pero probablemente no, porque el flex viejo estaba en el layout, no en las pages.
