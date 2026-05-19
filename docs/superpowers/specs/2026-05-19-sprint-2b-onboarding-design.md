# MegaTools — Sprint 2.B · Onboarding de 3 pasos

> Brainstormeado y aprobado el 2026-05-19. Source: `docs/brand/2026-05-megatools-brief-v1.html` + mockups del usuario (paso 1 bienvenida / paso 2 accent / paso 3 tour). Próximo paso: writing-plans.

## Objetivo

Flujo de onboarding para usuarios nuevos del portal. Al primer login (después de verify email), redirigir a `/onboarding`, donde el usuario pasa por 3 pasos: bienvenida, elegir su accent, y tour guiado de 6 pasos. Al finalizar (o saltar), marcamos `user.onboarded_at = now()` y redirigimos a `/app`. Un botón ❓ permanente en el header del shell autenticado reabre el tour cuando el usuario lo quiera.

## Decisiones cerradas en brainstorming

| Decisión | Valor |
|---|---|
| Persistencia | Columna `onboarded_at: timestamp` en `user`. NULL = aún no completó. Timestamp del momento del "Terminar" o "Saltar". |
| Routing | Single page `/onboarding` con estado interno para steps. Refresh resetea al paso 1 (acceptable — onboardings son cortos). |
| Auth redirect | En `(app)/layout.tsx`: si `session.user.onboardedAt` es NULL → redirect a `/onboarding`. El propio `/onboarding` requiere session (su layout chequea), pero NO chequea onboardedAt (sería un loop). |
| Tour de 6 pasos | Modal centrado propio (~80 líneas). Cada paso tiene número 01-06, título, descripción, mini-ilustración (mocked con divs / lucide icons). Sin highlights al DOM. |
| Skip | El usuario puede saltar en cualquier paso. Saltar marca `onboarded_at = now()` y redirige a `/app`. |
| Botón ❓ permanente | Se agrega al header del shell (`(app)/layout.tsx`), entre ThemeToggle y UserMenu. Click → re-abre el tour modal (paso 3) sin reasignar `onboarded_at`. |
| Step 2 (Accent) | Reusa `<AccentPicker>` del Sprint 2.A. El cambio aplica vía optimistic + DB. |
| Step 1 datos | `name`, `email`, `org name`, `role`, `apps disponibles count`, `invitado por` (si existe `invitation.inviterId`). |
| Idioma | Español rioplatense. "Bienvenida a bordo", "Hola, *Pedro*.", "Empezar el recorrido", "Saltar e ir a apps". |
| Tipografía hero | "Hola, *Pedro*." y "Elegí tu *accent*." usan Instrument Serif italic (font-serif) en el segmento variable, Geist en el resto. |
| Pasos del tour (6) | Contenido fijo, hardcoded en array. Cubren: bienvenida al portal, registry de apps, accent activable, settings, perfil/org, y un cierre. |

## Arquitectura

Single page client component bajo `/onboarding`. Server component thin verifica session, lee user data + invitation (si aplica) y se lo pasa al cliente como `initialData`. Cliente maneja state machine de 3 pasos + tour modal sub-state.

Una server action `markOnboardingComplete()` setea `onboarded_at` y revalida. Se llama al "Terminar" del paso 3, al "Saltar tutorial" del paso 3, y al "Saltar e ir a apps" de los pasos 1 y 2.

El botón ❓ del header dispara un componente `<TourLauncher />` que abre el tour modal aislado (sin pasos 1 y 2). Ya el user pasó por onboarding, el tour es solo refresh.

## Estructura de archivos

```
NUEVOS:
src/app/(public)/onboarding/
├── layout.tsx                          # gate: requiere session, NO onboardedAt check
├── page.tsx                            # server component, lee user/org/invitation
└── onboarding-flow.tsx                 # 'use client', state machine 3 pasos

src/components/onboarding/
├── welcome-step.tsx                    # paso 1: hero + card "TU CUENTA"
├── accent-step.tsx                     # paso 2: hero + AccentPicker + preview
├── tour-modal.tsx                      # modal de 6 pasos, reusable (paso 3 + ❓ button)
├── tour-steps.ts                       # array de los 6 pasos (data)
├── progress-bar.tsx                    # barra inferior con segments según paso
└── account-card.tsx                    # card "TU CUENTA" del paso 1

src/components/help/
└── tour-launcher.tsx                   # 'use client', botón ❓ del header

src/lib/onboarding/
└── actions.ts                          # 'use server', markOnboardingComplete()

drizzle/
└── 0002_<random>_onboarded_at.sql      # ALTER user ADD onboarded_at

tests/e2e/
└── onboarding.spec.ts                  # 3 specs

MODIFICADOS:
src/lib/db/schema/auth.ts               # onboardedAt timestamp
src/lib/auth/server.ts                  # additionalFields.onboardedAt (output: read-only para el client)
src/app/(app)/layout.tsx                # redirect a /onboarding si !onboardedAt; <TourLauncher /> en header
src/app/(public)/layout.tsx             # (probable) — depende de si ya envuelve a /onboarding correctamente
```

## Modelo de datos

```ts
// src/lib/db/schema/auth.ts — agregar a user
onboardedAt: timestamp("onboarded_at"),  // nullable, NULL = no onboardeado
```

Migración 0002: `ALTER TABLE "user" ADD COLUMN "onboarded_at" timestamp;` (sin default — NULL es la señal de "no onboardeado").

**Nota sobre admin@megacorp.local**: el bootstrap NO setea `onboardedAt`, así que el admin va a recibir el onboarding una vez al loguearse. Eso es deseado (lo probamos). Si quisiéramos saltarlo para admins existentes, podríamos correr `UPDATE "user" SET onboarded_at = NOW();` en el migrate post-step, pero el spec acuerda no hacerlo — queremos ver el flow.

## Auth flow

```
Login → (app)/layout.tsx
  ├── no session → /login (existente)
  ├── !emailVerified → /verify-email-pending (existente)
  ├── !onboardedAt → /onboarding (NUEVO)
  └── todo OK → renderiza shell + children
```

`/onboarding` tiene su propio layout server-side:
```
/onboarding/layout.tsx:
  ├── no session → /login
  ├── !emailVerified → /verify-email-pending
  └── renderiza onboarding (sin chequear onboardedAt para no loopear)
```

## Step 1 — Bienvenida (welcome-step.tsx)

Layout: 2 columnas (max 1024px ancho, gap 80px).

- **Izquierda**: eyebrow uppercase mono "BIENVENIDA A BORDO" + h1 "Hola, *{firstName}*." (font-serif italic en el nombre) + párrafo de bienvenida + 2 botones: "Empezar el recorrido →" (primary) y "Saltar e ir a apps" (outline).
- **Derecha**: card "TU CUENTA" con:
  - Avatar circular con iniciales (PV de "Pedro Vargas")
  - Nombre + email
  - Tabla 2-col: `Organización`, `Rol`, `Invitado por`, `Apps disponibles` (count)

Datos vienen del page server-side. `Invitado por` solo aparece si hay `invitation.inviterId` para este user en la org activa.

## Step 2 — Accent (accent-step.tsx)

Layout: 2 columnas (50/50).

- **Izquierda**: eyebrow "PASO 2 DE 3" + h1 "Elegí tu *accent*." (italic) + párrafo de explicación + AccentPicker (los 6 swatches) + 2 botones: "Continuar →" (primary) y "Atrás" (ghost) + label inferior "Seleccionado: Mustard · #C9961B" (dinámico).
- **Derecha**: eyebrow "VISTA PREVIA EN VIVO" + 3 cards mock:
  1. **Card PDF Workbench**: icon + título + descripción + botón primary "Abrir herramienta →" + badge "DISPONIBLE"
  2. **Card Botones**: label "Botones" + ejemplos de variants (Primario, Outline, Subtle)
  3. **Card Uso este mes**: "Uso este mes" + progress bar con valor + porcentaje

Cuando el user clickea un swatch, el AccentPicker dispara optimistic update + persiste en DB. El preview en vivo refleja el cambio porque consume las CSS vars del `data-accent` que se actualiza en `<html>`.

## Step 3 — Tour modal (tour-modal.tsx + tour-steps.ts)

Modal centrado, fondo dim. Width ~600px. Cada paso tiene:

- Mini-ilustración a la izquierda (icon en círculo + número grande "01" / "02" / etc.)
- Título grande
- Descripción 2-3 líneas
- Mini-thumbnails (3 cards mock) abajo

Footer del modal: "Saltar tutorial" (ghost izquierda) · "Atrás" (outline) · "Siguiente" (primary derecha). En paso 6, "Siguiente" pasa a ser "Terminar →".

Indicador de progreso del tour: 6 dots horizontales centrados arriba del footer, el actual lleva el accent.

**6 pasos hardcoded** en `tour-steps.ts`:

```ts
export const TOUR_STEPS = [
  { number: '01', label: 'BIENVENIDA', title: 'Bienvenido a MegaTools', body: 'Este es el portal interno del grupo MEGACORP — todas tus herramientas en un solo lugar, con tu cuenta.' },
  { number: '02', label: 'APPS REGISTRY', title: 'Cada herramienta es una app', body: 'El panel principal lista todas las apps disponibles para tu rol. Hoy: PDF Workbench (operar sobre PDFs) y Configuración. Próximamente: Imágenes con IA. Iremos sumando más.' },
  { number: '03', label: 'TU COLOR', title: 'Tu accent te acompaña', body: 'El color que elegiste tiñe botones, focos y resaltes en todo el portal. Lo cambiás cuando quieras desde Configuración → Apariencia.' },
  { number: '04', label: 'CONFIGURACIÓN', title: 'Todo lo personal está en Settings', body: 'Tu perfil, apariencia, organización y notificaciones viven en Configuración. Owner/admin también ven Miembros.' },
  { number: '05', label: 'ATAJOS', title: 'Tip — atajos de teclado', body: 'En herramientas que los soportan, mirá el bottom-left para ver atajos. En PDF Workbench: Del, R, Cmd/Ctrl+D, Esc, Cmd/Ctrl+A.' },
  { number: '06', label: 'AYUDA', title: 'Siempre a un click', body: 'Si te perdés o querés repasar este tour, el botón ❓ del header te trae de vuelta acá.' },
] as const
```

## Botón ❓ permanente (tour-launcher.tsx)

```tsx
<button> con ícono HelpCircle de lucide
onClick → setOpen(true)
{open && <TourModal onClose={() => setOpen(false)} />}
```

Aparece entre `<ThemeToggle />` y `<UserMenu />` en el header del shell autenticado. NO modifica `onboarded_at`.

## Progress bar

Barra inferior fina (h-1) full-width:

- Paso 1: primer segmento (1/3) en brand-accent, resto en muted
- Paso 2: primeros 2 segmentos en brand-accent
- Paso 3 (tour): los 3 segmentos en brand-accent + sub-progress de los 6 dots del tour

## Server action — markOnboardingComplete()

```ts
// src/lib/onboarding/actions.ts
'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema/auth'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function markOnboardingComplete(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('No autenticado')
  await db
    .update(user)
    .set({ onboardedAt: new Date() })
    .where(eq(user.id, session.user.id))
  revalidatePath('/', 'layout')  // invalida caches del session
}
```

## Tests E2E

`tests/e2e/onboarding.spec.ts`:

1. **User nuevo es redirigido a `/onboarding`**: crear user de prueba sin onboardedAt → login → expect URL `/onboarding`.
2. **"Saltar e ir a apps" desde paso 1 marca onboardedAt y redirige a `/app`**: en `/onboarding`, click Skip → expect URL `/app` → verify DB tiene onboardedAt ≠ NULL.
3. **Tour completo persiste**: click "Empezar" → siguiente 6 veces → "Terminar" → expect URL `/app` → verify onboardedAt ≠ NULL. Verify que el botón ❓ del header existe.

Para crear el "user de prueba sin onboardedAt", el spec usa un script de bootstrap secundario o un endpoint de testing. Lo más simple: hacer un `UPDATE user SET onboarded_at = NULL WHERE email = '...'` directo en Postgres antes del test (via `docker exec ... psql ...` en un `test.beforeEach`).

## Fuera de scope

- **Sidebar contextual + topbar + ⌘K** → Sprint 2.C (el tour del paso 3 sigue funcionando en el shell actual; en 2.C ajustamos los textos de los 6 pasos si hace falta).
- **Landing pública nueva** → Sprint 2.D.
- **Animaciones avanzadas** entre pasos del onboarding (slide / fade). Por ahora: transiciones simples opacity/scale.
- **Onboarding re-skippable**: si querés re-onboardear, hay que setear `onboarded_at = NULL` manualmente. No exponemos UI para eso (sería ruido).

## Definición de hecho

- [x] Migración `0002_onboarded_at.sql` aplicada (column nullable)
- [x] Better Auth expone `onboardedAt` en session (additionalFields)
- [x] `(app)/layout.tsx` redirige a `/onboarding` si `!onboardedAt`
- [x] `/onboarding` muestra los 3 pasos con state machine cliente
- [x] Step 1 muestra el nombre con italic serif, card de cuenta con datos reales
- [x] Step 2 usa AccentPicker existente + preview en vivo
- [x] Step 3 abre el tour modal con 6 pasos, navegación Atrás/Siguiente, dots
- [x] "Saltar" en cualquier paso marca `onboarded_at` y va a `/app`
- [x] "Terminar" del tour idem
- [x] Botón ❓ permanente en header reabre el tour sin afectar `onboarded_at`
- [x] tsc verde, 14 E2E previos + 3 nuevos = 17 passing
- [x] README mención
