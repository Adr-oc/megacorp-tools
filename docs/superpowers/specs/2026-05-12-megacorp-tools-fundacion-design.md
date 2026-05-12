# MegaTools — Diseño de la Fundación (Sprint 0)

**Estado:** Diseño aprobado, listo para plan de implementación
**Fecha:** 2026-05-12
**Owner:** Adolfo (IT, ERPConnectAI)

---

## 1. Resumen ejecutivo

MegaTools es un **portal web interno** del grupo MEGACORP que aloja herramientas livianas (separación de PDFs, procesamiento de imágenes con IA, etc.). Esta especificación cubre la **fundación** del producto: el cascarón funcional sobre el que vivirán las herramientas. No se construye ninguna herramienta en este sprint — el entregable es el portal mismo: landing, autenticación, gestión de usuarios y organizaciones, RBAC, y app de Settings.

La meta del Sprint 0 es que **una persona invitada pueda recibir un email, crear su contraseña, entrar al portal, ver el home (grid de apps), navegar la app de Settings y modificar su perfil**.

## 2. Decisiones de arquitectura

### 2.1 Forma del portal

**App única con módulos internos.** Un solo proyecto Next.js. Cada herramienta es una ruta/módulo dentro de `app/(app)/tools/<id>/`. Auth, usuarios y settings compartidos nativamente. Si en el futuro alguna herramienta debe exponerse como API pública, se agrega un endpoint en `app/api/v1/<id>/` reutilizando la lógica del módulo.

**Descartadas:** monorepo (sobreingeniería para herramientas livianas), launcher + apps independientes (complejidad de SSO innecesaria).

### 2.2 Tenancy

**Multi-tenant por organización, base de datos compartida.** Concepto de "organización" desde el día 1 (MEGACORP, EGAMSA, 301 Megapólizas, etc.). Cada usuario pertenece a una o más organizaciones. Todo dato propio de una organización lleva `organizationId` y se filtra en queries.

**Descartado:** single-tenant (impide a futuro abrir el portal a clientes externos sin reescribir el modelo), DB-por-cliente (sobreingeniería sin requisito legal que lo justifique).

### 2.3 Permisos (RBAC simple)

Tres roles fijos por organización:

| Rol | Capacidades |
|---|---|
| **owner** | Todo. Único que puede eliminar la org o transferir ownership. |
| **admin** | Invitar/remover miembros, cambiar settings de la org, usar todas las apps. |
| **member** | Usar las apps a las que su rol da acceso. No puede invitar ni tocar settings de org. |

Acceso a apps se decide **por rol únicamente** (no por usuario, no por organización). Es decir: si una app está habilitada para "member", todos los members de cualquier organización la ven.

### 2.4 Stack tecnológico (verificado mayo 2026)

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, RSC) | 16.2.x |
| Lenguaje | TypeScript estricto | 5.x |
| Estilos | Tailwind CSS | 4.3 |
| Componentes UI | shadcn/ui (CLI v4, paquete `radix-ui` unificado) | última |
| Database | PostgreSQL self-hosted | 16+ |
| ORM / migraciones | Drizzle ORM + drizzle-kit | 0.45.x stable |
| Autenticación | Better Auth + plugin `organization` + `@better-auth/drizzle-adapter` | última |
| Validación | Zod | 4.4.x |
| Email transaccional | Resend | última |
| Tema (light/dark) | next-themes | última |
| Tests E2E | Playwright | última |
| Deploy | Docker + docker-compose | — |

**Nota Auth.js → Better Auth:** El equipo de Auth.js anunció oficialmente en mayo 2026 que para proyectos nuevos se recomienda **Better Auth** (issue `nextauthjs/next-auth#13252`). Auth.js v5 sigue válido para migraciones, pero greenfield va a Better Auth. Adicionalmente, Next.js 16 renombró `middleware.ts` → `proxy.ts`, lo que Better Auth soporta nativamente.

**Nota Drizzle:** Drizzle v1.0 está en `1.0.0-beta.x`. Usamos `0.45.x stable` y migramos cuando v1 salga de beta.

## 3. Modelo de datos

### 3.1 Tablas de Better Auth (auto-generadas por plugin `organization`)

```
user                Usuarios. id, email, name, image, emailVerified, createdAt
session             Sesiones activas. token, userId, expiresAt, activeOrganizationId
account             Credenciales/OAuth vinculadas
verification        Tokens de verificación (email, magic link, reset)
organization        Empresas. id, name, slug, logo, createdAt
member              Membresía. userId, organizationId, role (owner|admin|member)
invitation          Invitaciones. email, organizationId, role, token, expiresAt
```

### 3.2 Tablas propias

```
app_setting         Preferencias por usuario.
                    userId, key, value (jsonb), updatedAt
                    Ejemplos de key: 'theme', 'locale'

org_setting         Preferencias por organización.
                    organizationId, key, value (jsonb), updatedAt
                    Ejemplos de key: 'branding.color', 'notifications.smtp'

audit_log           Trazabilidad básica.
                    id, userId, organizationId, action, target,
                    metadata (jsonb), createdAt
                    Ejemplos de action: 'user.invited', 'org.updated',
                    'member.role_changed', 'app.used'
```

**Decisión clave:** `app_setting` y `org_setting` usan **key-value flexible con `jsonb`** en lugar de columnas tipadas. Razón: la app de Settings va a crecer, agregar una columna por preferencia es fricción. El tipado vive en código con esquemas de Zod en `lib/settings/schema.ts`.

### 3.3 Scope de tenancy

Toda query a tablas con `organizationId` debe filtrar por la organización activa de la sesión. Se implementa via helpers de Drizzle (no via RLS de Postgres en Sprint 0). Si en el futuro crece la app y queremos defensa en profundidad, se agrega RLS — Drizzle lo soporta.

## 4. Flujo de autenticación

### 4.1 Métodos habilitados en Sprint 0

- **Email + contraseña** (con verificación de email obligatoria)
- **Magic link** (mismo flujo de Better Auth)
- OAuth (Google/Microsoft): **fuera de scope** — Sprint 1+

### 4.2 Modelo de signup

**Solo por invitación.** No hay `/signup` público. El primer usuario y la organización inicial se crean con un comando de CLI (`pnpm bootstrap`). A partir de ahí, owners/admins invitan a más usuarios desde Settings → Organización.

### 4.3 Rutas y flujos

```
/                              Landing pública (visitante sin sesión)
/login                         Email+contraseña o magic link
/accept-invitation?token=...   Crear cuenta desde invitación (define contraseña)
/verify-email?token=...        Confirma email, redirige a /app
/forgot-password               Envía email con link de reset
/reset-password?token=...      Define nueva contraseña
/onboarding/create-org         (solo si llega a /app sin org)
/onboarding/accept-invitations (si tiene invitaciones pendientes)
/app                           Home autenticado (grid de apps)
/app/settings/*                App de configuración
/app/tools/*                   Futuras herramientas
/logout                        Cierra sesión
```

### 4.4 Gating (proxy.ts en Next.js 16)

- Rutas en `(public)` → libres
- Rutas en `(app)` → requieren sesión + `emailVerified === true`
- Si usuario no tiene organización → `/onboarding/create-org`
- Si usuario tiene varias orgs → `activeOrganizationId` en sesión gestionado por Better Auth
- Email **no verificado** → pantalla "verifica tu email" + opción de reenviar

### 4.5 Cambio de organización

Componente `<OrgSwitcher />` en el header. Llama a `authClient.organization.setActive(orgId)`. Todas las queries del servidor leen la org activa de la sesión.

## 5. Registry de apps y permisos

### 5.1 Registry

Archivo: `lib/apps/registry.ts`. Single source of truth para qué herramientas existen y quién las ve.

```ts
export const apps = [
  {
    id: 'settings',
    name: 'Configuración',
    description: 'Perfil, organización, apariencia, notificaciones',
    icon: SettingsIcon,
    href: '/app/settings',
    requiredRoles: ['member', 'admin', 'owner'],
    visible: true,
    status: 'available', // 'available' | 'coming-soon' | 'disabled'
  },
] satisfies AppDefinition[]
```

El home renderiza el grid leyendo este array, filtrando por rol del usuario.

### 5.2 Helpers de gating

```ts
// Server (en page.tsx, route handler):
await requireApp('pdf-splitter') // redirige si no tiene permiso

// Cliente (en componentes):
const { hasApp } = usePermissions()
{hasApp('pdf-splitter') && <Link to="/app/tools/pdf-splitter">...</Link>}
```

**Fail-closed:** sin permiso explícito en el registry para el rol del usuario, la app no aparece. Si alguien navega directo a la URL sin permiso, redirige a `/app` con toast informativo.

### 5.3 Permisos custom de Better Auth

Better Auth permite extender el `access` por rol. Lo usamos para acciones de organización (invitar, remover, etc.). Configuración en `lib/permissions/access.ts`.

## 6. UI / Layout

### 6.1 Layouts

**Layout público** (`app/(public)/layout.tsx`): header simple con logo + CTA "Iniciar sesión".

**Layout autenticado** (`app/(app)/layout.tsx`):
- Header siempre visible: logo, `<OrgSwitcher />`, notificaciones (placeholder), avatar con dropdown (perfil, logout)
- Sidebar colapsable con: Inicio, lista de apps disponibles, Ayuda, Logout
- Main slot para contenido

**Home grid** (`app/(app)/page.tsx`): tarjetas por cada app disponible para el rol del usuario. Apps `coming-soon` se muestran grises (roadmap visible).

**Settings** (`app/(app)/settings/layout.tsx`): sub-sidebar con secciones: Perfil, Organización, Apariencia, Notificaciones.

### 6.2 Componentes shadcn/ui a instalar en Sprint 0

`button`, `input`, `label`, `card`, `dialog`, `dropdown-menu`, `avatar`, `select`, `switch`, `tabs`, `toast` (sonner), `form`, `sidebar`, `table`, `separator`, `badge`, `skeleton`.

### 6.3 Theming

- Light / dark / system via `next-themes`
- 1 color de acento ajustable en Settings → Apariencia (persistido en `app_setting.theme`)
- Modo oscuro nativo de shadcn/ui

### 6.4 Branding mínimo

- **Nombre:** "MegaTools" (placeholder en `lib/branding.ts`, cambiable)
- **Logo:** SVG placeholder hasta tener branding definitivo
- **Paleta:** neutral base + 1 acento

## 7. Estructura del repositorio

```
megacorp-tools/
├── app/
│   ├── (public)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  Landing
│   │   ├── login/
│   │   ├── accept-invitation/
│   │   ├── verify-email/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (app)/
│   │   ├── layout.tsx                Shell autenticado
│   │   ├── page.tsx                  Home (grid)
│   │   ├── onboarding/
│   │   ├── settings/
│   │   │   ├── layout.tsx
│   │   │   ├── perfil/
│   │   │   ├── organizacion/
│   │   │   ├── apariencia/
│   │   │   └── notificaciones/
│   │   └── tools/                    (vacío en Sprint 0)
│   └── api/
│       └── auth/[...all]/route.ts    Better Auth handler
├── lib/
│   ├── db/                           Drizzle schema, client, queries
│   ├── auth/                         Better Auth config (server + client)
│   ├── apps/                         Registry de apps
│   ├── permissions/                  Helpers RBAC
│   ├── settings/                     Esquemas Zod de settings
│   ├── email/                        Resend client + plantillas
│   └── branding.ts                   Constantes de branding
├── components/                       UI compartida (shadcn/ui copiados)
├── proxy.ts                          Next.js 16 (antes middleware.ts)
├── drizzle.config.ts
├── docker-compose.yml                app + postgres
├── Dockerfile
└── scripts/
    ├── bootstrap.ts                  CLI: crear superadmin + org inicial
    └── seed.ts                       Datos de desarrollo
```

## 8. Plan de Sprint 0 (2 semanas)

| # | Entregable | Estimación |
|---|---|---|
| 0.1 | Setup repo: Next.js 16, TS, Tailwind 4, shadcn/ui CLI v4, ESLint, Prettier | 1 d |
| 0.2 | Postgres + Drizzle schema base + migraciones + `db:seed` | 1 d |
| 0.3 | Better Auth con plugin `organization` + Drizzle adapter | 1 d |
| 0.4 | Layouts `(public)` y `(app)` + theme provider + sidebar | 1 d |
| 0.5 | Landing + `/login` (email+pass + magic link) | 1 d |
| 0.6 | Flujos invitación, verificación email, forgot/reset password | 2 d |
| 0.7 | Onboarding (`create-org`, `accept-invitations`) | 1 d |
| 0.8 | Registry de apps + helpers `requireApp`/`usePermissions` + home grid | 1 d |
| 0.9 | Settings: Perfil + Apariencia | 1 d |
| 0.10 | Settings: Organización (datos + miembros + invitaciones) | 2 d |
| 0.11 | Settings: Notificaciones (config SMTP/Resend + plantillas) | 1 d |
| 0.12 | `audit_log` mínimo + CLI `bootstrap` | 1 d |
| 0.13 | E2E Playwright (golden path: invitar → aceptar → login → entrar) | 1 d |
| 0.14 | Dockerfile + docker-compose | 1 d |

### 8.1 Definition of Done — Sprint 0

- Cualquier persona invitada puede entrar al portal y ver el home con apps disponibles
- Settings completo con las 4 secciones definidas funciona end-to-end
- Tests E2E del golden path pasan
- App desplegable con `docker compose up` en servidor self-hosted
- README con instrucciones para correr en local y deploy
- Comando `pnpm bootstrap` crea el primer superadmin + organización

## 9. Roadmap post-Sprint 0

### Sprint 1 — Separador de PDFs (2 semanas)

Primera herramienta real. Sirve también para **validar el contrato del registry de apps** (cuánto cuesta agregar una herramienta nueva).

- UI drag-and-drop + preview de páginas + selección de rangos
- Lógica server con `pdf-lib`
- Historial opcional (decidir en kickoff)
- E2E test

### Sprint 2 — Procesador de imágenes con IA (2 semanas)

- UI subida de imágenes + selector de operación (background removal, OCR, descripción)
- Integración con Claude API (vision)
- Rate limiting / cuotas por organización
- E2E test

### Sprint 3+ — Por definir

Candidatos: OAuth Google/Microsoft, exponer herramientas como API pública con API keys, notificaciones in-app, más herramientas según necesidades del grupo.

## 10. Decisiones explícitamente fuera de scope (Sprint 0)

- OAuth (Google/Microsoft)
- Signup público abierto
- Override de acceso a apps por usuario o por organización
- Notificaciones in-app (solo email transaccional)
- Row-Level Security de Postgres (defensa en profundidad — se agrega si crece)
- Multi-idioma real (solo placeholder en Apariencia — i18n viene después)
- Cuotas/billing
- Storage de archivos persistente (cada herramienta lo decide en su sprint)

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Better Auth aún joven, breaking changes posibles | Pinning estricto de versión + revisar changelog antes de bumps. Adapter de Drizzle estable. |
| Tailwind 4 + shadcn CLI v4 son recientes, posible fricción | Documentación oficial muy actualizada. Si surge bloqueo, fallback a Tailwind 3.4 (estable). |
| Self-hosting de Postgres requiere disciplina de backups | Documentar en `docs/ops/` el procedimiento de backup + restore. Cronjob de `pg_dump` desde día 1. |
| Drizzle 0.45.x stable mientras v1 está en beta | Quedarnos en 0.45.x. Migrar a v1 cuando salga estable (no urgente). |
| Email transaccional (Resend) tiene quota free limitada | Suficiente para Sprint 0. Para producción real, plan pago o switch a SMTP propio. |

## 12. Referencias

- Next.js: https://nextjs.org/blog/next-16-2
- Better Auth: https://better-auth.com/docs/adapters/drizzle
- Auth.js → Better Auth: https://github.com/nextauthjs/next-auth/discussions/13252
- Drizzle ORM: https://orm.drizzle.team/docs/latest-releases
- Tailwind CSS v4: https://tailwindcss.com/blog/tailwindcss-v4
- shadcn/ui CLI v4: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- Zod 4: https://zod.dev/v4
