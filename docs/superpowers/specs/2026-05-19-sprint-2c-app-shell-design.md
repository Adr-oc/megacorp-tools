# MegaTools — Sprint 2.C · App shell rediseñado

> Brainstormeado y aprobado el 2026-05-19. Source: `docs/brand/2026-05-megatools-brief-v1.html` + mockups del usuario. Próximo paso: writing-plans.

## Objetivo

Reemplazar el shell autenticado actual (header simple con logo + theme + UserMenu) por un layout de aplicación pro estilo Linear:

- **Sidebar contextual** a la izquierda — su contenido cambia según el módulo donde estás (home / app / settings).
- **Topbar** con breadcrumbs + búsqueda ⌘K + acciones (notifs, help, theme).
- **Sidebar footer** con info del user + dropdown (logout, etc.) — reemplaza el UserMenu del header.
- **Mobile drawer**: en pantallas <lg, sidebar oculta + botón hamburger en topbar.
- **Command palette ⌘K**: navegar a apps, settings, theme toggle, logout.
- **Recientes** en sidebar home: vía localStorage cliente.

Settings pierde su sub-sidebar interno (`(app)/app/settings/layout.tsx`); sus secciones pasan al sidebar contextual variant "settings".

## Decisiones cerradas en brainstorming

| Decisión | Valor |
|---|---|
| Recientes | **localStorage cliente** (timestamp + ulid de app). Por device, sin sync. |
| Mobile | **Drawer con hamburger** en topbar. Sidebar visible ≥ lg, oculta < lg con `<Sheet>` (shadcn). |
| User menu | **Mover al sidebar footer**. Header queda solo con tools (⌘K + ❓ + notifs + theme). |
| Switcher de organización | El user tiene `organizationLimit: 1`. Mostramos solo label "MEGACORP / workspace" sin dropdown. |
| Notificaciones | Bell placeholder con dropdown "No tenés notificaciones". Sin backend real en este sprint. |
| Command palette | `cmdk` (lib oficial Radix, ~15KB). Comandos: navegar a apps disponibles, secciones de settings, theme toggle, logout. |
| Sidebar collapse | Fuera de scope. Siempre abierta en desktop (240px ancho). |
| Variants del sidebar | 3: **home** (recientes), **app** (info del app abierto + acciones), **settings** (secciones). Cambia por route prefix. |
| Settings sub-sidebar interno | Se elimina. Sus items (Perfil/Organización/Apariencia/Notificaciones) van al sidebar global. |
| Settings page direct render | Las pages `/app/settings/perfil` etc. ya no usan el layout local — son children directos del shell global. |
| Breadcrumbs | `MEGACORP > {sección}` calculado server-side desde pathname + registry. |
| ❓ help button | Sigue siendo `<TourLauncher />` de 2.B. Se mueve del header viejo a la topbar nueva. |
| Theme toggle | Sigue como está, vive en la topbar nueva. |

## Arquitectura técnica

El nuevo shell vive en `src/app/(app)/layout.tsx`. Layout:

```
┌─────────────────────────────────────────────────────────┐
│ [Sidebar 240px]  │ [Topbar h-14]                        │
│                  ├──────────────────────────────────────┤
│  Sidebar         │ [Main content — children]            │
│  contextual      │                                      │
│  (3 variants)    │                                      │
│                  │                                      │
│  ───────         │                                      │
│  Sidebar footer  │                                      │
│  (user menu)     │                                      │
└─────────────────────────────────────────────────────────┘
```

- En mobile: Sidebar oculta. Hamburger en topbar abre `<Sheet>` con el sidebar como drawer izquierdo.
- Sidebar variant lo decide un hook `useSidebarVariant()` basado en pathname:
  - `/app/tools/*` → `'app'`
  - `/app/settings/*` → `'settings'`
  - else → `'home'`

## Estructura de archivos

```
NUEVOS:
src/components/shell/
├── app-sidebar.tsx              # wrapper que elige variant + footer
├── sidebar-home.tsx             # variant 'home': recent apps + quick links
├── sidebar-app.tsx              # variant 'app': back + stats + acciones del app abierto
├── sidebar-settings.tsx         # variant 'settings': back + secciones
├── sidebar-footer.tsx           # user info + dropdown (logout)
├── sidebar-section.tsx          # helper: <h3 label> + <nav>
├── sidebar-item.tsx             # helper: <Link> con icon + active state
├── topbar.tsx                   # breadcrumbs + cmd-k trigger + actions
├── breadcrumbs.tsx              # derivado de pathname + registry
├── command-palette.tsx          # cmdk root, lista de comandos
├── notifications-button.tsx     # bell placeholder con dropdown vacío
└── mobile-nav.tsx               # hamburger + Sheet wrapper

src/lib/recents/
├── client.ts                    # 'use client' hook useRecents() + addRecent()
└── types.ts                     # RecentApp

drizzle/                          # (sin migración nueva, todo client-side)

tests/e2e/
└── shell.spec.ts                # specs del shell nuevo

MODIFICADOS:
src/app/(app)/layout.tsx          # rewrite total
src/app/(app)/app/page.tsx        # ajustar — el sidebar variant 'home' ya hace nav, el page queda con grid + bienvenida
src/app/(app)/app/settings/layout.tsx  # ELIMINAR (su nav vivirá en sidebar-settings)
src/app/(app)/app/settings/page.tsx    # mantiene el redirect a /perfil
src/app/(app)/app/tools/pdf-workbench/workbench.tsx  # leve cleanup del header propio (el nuevo shell ya da topbar)
package.json                      # + cmdk

ELIMINADOS:
src/components/auth/user-menu.tsx → reused en sidebar-footer (movido)
                                    // Optionally renamed
```

## Modelo de datos — Recents

```ts
// src/lib/recents/types.ts
export type RecentApp = {
  appId: string  // del registry: 'settings', 'pdf-workbench', etc.
  visitedAt: number  // Date.now()
}

// src/lib/recents/client.ts
const KEY = 'megatools:recents:v1'
const MAX = 8

export function loadRecents(): RecentApp[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecentApp[]
  } catch { return [] }
}

export function addRecent(appId: string): void {
  if (typeof window === 'undefined') return
  const list = loadRecents().filter((r) => r.appId !== appId)
  list.unshift({ appId, visitedAt: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
}

export function useRecents(): RecentApp[] {
  // Hook que retorna los recents actuales + re-renderiza cuando cambia
  const [list, setList] = useState<RecentApp[]>([])
  useEffect(() => {
    setList(loadRecents())
    const handler = () => setList(loadRecents())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  return list
}
```

`addRecent(appId)` se llama en client effects de cada page que querramos trackear:
- `/app/tools/pdf-workbench` → `addRecent('pdf-workbench')`
- `/app/settings/*` → `addRecent('settings')` (cualquier sub-section cuenta)

## Sidebar variant — Home

```
┌─────────────────────────┐
│ ⊙ MEGACORP              │  ← workspace label (no dropdown)
│   workspace             │
├─────────────────────────┤
│ [⌘K Buscar o ejecutar...] │  ← cmd-k trigger
├─────────────────────────┤
│ RECIENTE                │
│ 📄 PDF Workbench  4 min │
│ ⚙ Miembros        1 h   │  ← navega a /app/settings/organizacion (sec inferida)
│                         │
└─────────────────────────┘
```

`Reciente` se popula desde `useRecents()`. Si no hay recientes, mostramos placeholder "Tus apps recientes aparecerán acá."

## Sidebar variant — App (cuando estás en /app/tools/pdf-workbench)

```
┌─────────────────────────┐
│ ⊙ MEGACORP              │
├─────────────────────────┤
│ ← Volver a apps          │
├─────────────────────────┤
│ WORKSPACE               │
│ 📄 3 documentos          │  ← muestra contador real del workspace
│ 📑 14 páginas            │
├─────────────────────────┤
│ ACCIONES                │
│ ⬆ Añadir PDFs            │  ← trigger del file picker
│ ⬇ Exportar               │  ← trigger del export menu
└─────────────────────────┘
```

**Implementación**: el sidebar variant 'app' no conoce del estado del workspace (eso vive en el Context de PDF Workbench). Para conectarlos, exponemos los counts via un mini-context global o via `data-*` attributes en el body que el sidebar lee. Para evitar acoplamiento, **dejamos placeholders estáticos en este sprint** ("Workspace abierto") y los datos reales los conectamos en Sprint 2.C.1 si vale la pena. El brief flagea las stats como "nice to have", no como crítico.

Decisión simplificadora: para Sprint 2.C, sidebar app variant muestra:
- Back button a `/app`
- Título del app actual ("PDF Workbench")
- Lista de acciones genéricas que dispatchan eventos custom al window que el PDF Workbench escucha (`window.dispatchEvent(new CustomEvent('mtools:pdf-workbench:upload'))`). El page del workbench monta listeners para esos eventos.

## Sidebar variant — Settings

```
┌─────────────────────────┐
│ ⊙ MEGACORP              │
├─────────────────────────┤
│ ← Volver a apps          │
├─────────────────────────┤
│ TU CUENTA               │
│ 👤 Mi perfil             │
│ ☀ Apariencia             │
├─────────────────────────┤
│ ORGANIZACIÓN            │
│ 🏢 Organización          │
│ 👥 Miembros              │  ← (admin/owner only)
│ 📋 Audit log             │  ← (admin/owner only) — placeholder, no existe ruta todavía
├─────────────────────────┤
│ NOTIFICACIONES          │
│ 🔔 Notificaciones        │
└─────────────────────────┘
```

El item activo lleva borde brand-accent (mismo patrón del settings sub-sidebar viejo). Items de Org sólo visibles para admin/owner — el sidebar usa el rol del session.

## Sidebar footer (user menu reubicado)

```
┌─────────────────────────┐
│ ─────────────────────── │
│ [AD] admin@megacorp.local│  ← clickable, abre dropdown
│      owner               │
└─────────────────────────┘
```

Dropdown del footer (mismo contenido del UserMenu actual):
- Nombre + email
- Cerrar sesión

Reusa el `<UserMenu />` actual con CSS adaptado para alinear con el footer del sidebar.

## Topbar

```
┌──────────────────────────────────────────────────────────────────┐
│ ☰  MEGACORP  >  PDF Workbench           [⌘K]  🔔  ❓  ☀         │
└──────────────────────────────────────────────────────────────────┘
```

- **Hamburger** (mobile only, `lg:hidden`) — abre el sidebar drawer
- **Breadcrumbs**: derivados del pathname y registry. Ejemplos:
  - `/app` → `MEGACORP > Apps`
  - `/app/tools/pdf-workbench` → `MEGACORP > Apps > PDF Workbench`
  - `/app/settings/perfil` → `MEGACORP > Configuración > Mi perfil`
- **Búsqueda ⌘K**: input fake (`Buscar...`) con kbd hint `⌘K`. Click o tecla `Cmd/Ctrl+K` abre el palette.
- **Bell**: dropdown con "No tenés notificaciones." Por ahora siempre vacío.
- **❓**: `<TourLauncher />` de Sprint 2.B (sin cambios).
- **Theme**: `<ThemeToggle />` de antes (sin cambios).

## Command palette (cmdk)

```tsx
<Dialog>
  <CommandInput placeholder="Buscar o ejecutar..." />
  <CommandList>
    <CommandGroup heading="Navegación">
      <CommandItem onSelect={() => navigate('/app')}>Apps</CommandItem>
      <CommandItem onSelect={() => navigate('/app/tools/pdf-workbench')}>PDF Workbench</CommandItem>
      <CommandItem onSelect={() => navigate('/app/settings/perfil')}>Mi perfil</CommandItem>
      <CommandItem onSelect={() => navigate('/app/settings/apariencia')}>Apariencia</CommandItem>
      <CommandItem onSelect={() => navigate('/app/settings/organizacion')}>Organización</CommandItem>
    </CommandGroup>
    <CommandGroup heading="Acciones">
      <CommandItem onSelect={toggleTheme}>Cambiar tema (☀️/🌙)</CommandItem>
      <CommandItem onSelect={logout}>Cerrar sesión</CommandItem>
    </CommandGroup>
  </CommandList>
</Dialog>
```

Atajo global: `Cmd/Ctrl + K` en cualquier route autenticada abre el palette. `Esc` lo cierra.

## Refactor de páginas existentes

| Archivo | Cambio |
|---|---|
| `src/app/(app)/layout.tsx` | Rewrite total con sidebar + topbar + main. Mantiene checks de session, emailVerified, onboardedAt. |
| `src/app/(app)/app/page.tsx` | Sin cambios funcionales — el grid sigue dentro de `<main>`. Saludo "Hola, {name}" + grid de apps. Agregar `addRecent` para tracking de la home (decisión: la home NO se trackea como recent — solo apps). |
| `src/app/(app)/app/settings/layout.tsx` | **ELIMINAR**. El sidebar global ahora hace ese trabajo. |
| `src/app/(app)/app/settings/page.tsx` | Sin cambios — sigue redirigiendo a `/perfil`. |
| `src/app/(app)/app/settings/perfil/page.tsx`, `apariencia/page.tsx`, etc. | Renderizan directo en el `<main>` del shell global (sin el wrapper de 2 cols del layout viejo). |
| `src/app/(app)/app/tools/pdf-workbench/workbench.tsx` | El header propio del workbench ("PDF Workbench" + Cargar más + Exportar) puede quedar — el breadcrumb de la topbar es complementario. Pequeño cleanup: remover el `<h1>PDF Workbench</h1>` que duplicaría el breadcrumb. |

## Tests E2E

`tests/e2e/shell.spec.ts`:

1. **Topbar muestra breadcrumbs según pathname**: login → `/app` → expect "MEGACORP" + "Apps". Navegar a `/app/settings/perfil` → expect "MEGACORP" + "Configuración" + "Mi perfil".
2. **Sidebar variant cambia con la ruta**: en `/app` ver sidebar home (con título "Reciente"). Navegar a `/app/settings/apariencia` ver sidebar settings (con título "Tu cuenta"). Navegar a `/app/tools/pdf-workbench` ver sidebar app (con back button "Volver a apps").
3. **⌘K abre command palette**: en `/app`, presionar Cmd/Ctrl+K → expect input visible. Tipear "perfil" → expect resultado "Mi perfil" → seleccionar → expect URL `/app/settings/perfil`.
4. **Sidebar footer tiene user info y dropdown**: en `/app`, ver email del admin en el footer del sidebar. Click → ver menuitem "Cerrar sesión".

**Specs existentes a actualizar**:
- `tests/e2e/settings-profile.spec.ts:19` ("home muestra grid de apps con Settings disponible y placeholders"): el grid sigue ahí, debería pasar sin cambios.
- `tests/e2e/admin-flows.spec.ts`: nav a `/app/settings/organizacion` directa, sin tocar el sub-sidebar viejo. Debería pasar.
- Otros specs tocan flows internos de cada page — no afectados por el shell.

## Routing & permisos

Sin cambios. `requireApp` y `usePermissions` siguen funcionando. El sidebar settings filtra items por rol (admin/owner ven Miembros / Audit log).

## Fuera de scope

- **Sidebar collapsible** (toggle minimize) — queda para Sprint 2.C.1 si lo necesitamos.
- **Sync de recientes server-side** — localStorage suficiente.
- **Notificaciones reales** — bell placeholder, vacío siempre.
- **Audit log page** — el item del sidebar settings queda hardcoded como deshabilitado o link a página vacía. Decisión: linkable a `/app/settings/audit` con un placeholder "Próximamente".
- **Workspace stats reales** en sidebar app variant — placeholders estáticos. Sprint 2.C.1.
- **Switcher de organización** — el plugin tiene `organizationLimit: 1`, no aplica.
- **Animaciones del sidebar** entre variants — transición CSS simple, sin framer-motion.

## Definición de hecho

- [x] `pnpm tsc --noEmit` y `pnpm lint` sin issues nuevos
- [x] `(app)/layout.tsx` tiene sidebar + topbar + main, sin header viejo
- [x] Sidebar tiene 3 variants funcionales según pathname
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
