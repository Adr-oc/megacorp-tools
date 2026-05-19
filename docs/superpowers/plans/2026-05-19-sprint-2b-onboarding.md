# Sprint 2.B — Onboarding de 3 pasos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Flujo de onboarding de 3 pasos para usuarios nuevos (bienvenida + accent + tour de 6 pasos), persistido vía `user.onboarded_at`. Botón ❓ permanente en el header reabre el tour. Reusa el `<AccentPicker>` del Sprint 2.A.

**Architecture:** Single page client component `/onboarding` con state machine 3 pasos. Server action `markOnboardingComplete()` setea timestamp. Tour modal propio (~80 líneas), sin librerías. Auth redirect en `(app)/layout.tsx` si `!onboardedAt`.

**Tech Stack:** Next 16, Drizzle, Better Auth (additionalFields), shadcn/ui, lucide-react. Sin deps nuevas.

**Convenciones:** branch `feat/sprint-2b-onboarding`, commits `feat(s2b): …`, `fix(s2b): …`, etc. con HEREDOC + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. tsc verde por commit. Dev `:3003`, cookie en `/tmp/mtcookie.txt`. Spanish rioplatense.

---

## File structure

```
NUEVOS:
src/app/(public)/onboarding/
├── layout.tsx                   # gate session (no chequea onboardedAt para no loopear)
├── page.tsx                     # server: lee user + org + invitation
└── onboarding-flow.tsx          # 'use client' state machine 3 pasos

src/components/onboarding/
├── welcome-step.tsx             # paso 1
├── account-card.tsx             # card "TU CUENTA" del paso 1
├── accent-step.tsx              # paso 2 (reusa AccentPicker)
├── accent-preview.tsx           # mock card preview en paso 2
├── tour-modal.tsx               # modal de 6 pasos
├── tour-steps.ts                # array data de los 6 pasos
└── progress-bar.tsx             # barra inferior 3 segmentos

src/components/help/
└── tour-launcher.tsx            # 'use client' botón ❓ + reabre tour modal

src/lib/onboarding/
└── actions.ts                   # 'use server' markOnboardingComplete()

drizzle/0002_<random>.sql        # generado

tests/e2e/onboarding.spec.ts     # 3 specs

MODIFICADOS:
src/lib/db/schema/auth.ts        # onboardedAt timestamp
src/lib/auth/server.ts           # additionalFields.onboardedAt
src/app/(app)/layout.tsx         # redirect + <TourLauncher />
README.md                        # nota del onboarding
```

---

## Task 1: Migración + Better Auth field

**Files:** `src/lib/db/schema/auth.ts`, `src/lib/auth/server.ts`, nueva `drizzle/0002_*.sql`.

- [ ] **Step 1: Agregar `onboardedAt` a `user` en schema/auth.ts**

Localizar el `pgTable("user", { ... })`, dentro del bloque agregar después de `accentColor`:

```ts
  accentColor: text("accent_color").notNull().default("mustard"),
  onboardedAt: timestamp("onboarded_at"),
});
```

- [ ] **Step 2: Generar y aplicar migración**

```bash
pnpm db:generate
ls drizzle/0002_*.sql
cat drizzle/0002_*.sql
pnpm db:migrate
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev -c "\d \"user\"" | grep onboarded_at
```

Expected: column existe, nullable (sin DEFAULT, sin NOT NULL).

- [ ] **Step 3: Resetear el admin a NULL para que recorra el flow**

```bash
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev \
  -c "UPDATE \"user\" SET onboarded_at = NULL WHERE email = 'admin@megacorp.local';"
```

- [ ] **Step 4: Better Auth — exponer `onboardedAt` como additional field**

En `src/lib/auth/server.ts`, dentro del bloque `user.additionalFields`, agregar:

```ts
  user: {
    additionalFields: {
      accentColor: {
        type: 'string',
        defaultValue: 'mustard',
        required: false,
        input: true,
      },
      onboardedAt: {
        type: 'date',
        required: false,
        input: false,  // solo el server lo setea (vía la server action)
      },
    },
  },
```

- [ ] **Step 5: Smoke**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/auth.ts src/lib/auth/server.ts drizzle/0002_*.sql
git commit -m "feat(s2b): user.onboarded_at + Better Auth expose como additional field"
```

(HEREDOC + Co-Authored-By trailer)

---

## Task 2: Server action `markOnboardingComplete`

**Files:** `src/lib/onboarding/actions.ts`

- [ ] **Step 1: Crear `src/lib/onboarding/actions.ts`**

```ts
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
  revalidatePath('/', 'layout')
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/lib/onboarding/actions.ts
git commit -m "feat(s2b): server action markOnboardingComplete()"
```

---

## Task 3: Auth redirect en (app)/layout

**Files:** `src/app/(app)/layout.tsx`

- [ ] **Step 1: Agregar redirect a /onboarding si onboardedAt es NULL**

Después del `if (!session.user.emailVerified) redirect('/verify-email-pending')`, agregar:

```tsx
if (!(session.user as { onboardedAt?: Date | null }).onboardedAt) {
  redirect('/onboarding')
}
```

- [ ] **Step 2: Smoke — login del admin debería caer en /onboarding**

```bash
pnpm tsc --noEmit
# Re-loguear (cookie pudo vencer)
curl -sS -o /dev/null -X POST http://localhost:3003/api/auth/sign-in/email \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3003' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/mtcookie.txt
# Pedir /app debería dar 307 a /onboarding
curl -sS -o /dev/null -w "http=%{http_code} loc=%{redirect_url}\n" http://localhost:3003/app -b /tmp/mtcookie.txt
```

Expected: http=307, redirect a `/onboarding`.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/(app)/layout.tsx'
git commit -m "feat(s2b): redirect a /onboarding si user.onboardedAt es NULL"
```

---

## Task 4: Layout y page de /onboarding (skeleton)

**Files:**
- `src/app/(public)/onboarding/layout.tsx`
- `src/app/(public)/onboarding/page.tsx`
- `src/app/(public)/onboarding/onboarding-flow.tsx`

- [ ] **Step 1: Crear `src/app/(public)/onboarding/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  if (!session.user.emailVerified) redirect('/verify-email-pending')
  // NO chequeamos onboardedAt — sería un loop. Si ya está, igual permitimos refresh.
  return <div className="min-h-screen flex flex-col">{children}</div>
}
```

- [ ] **Step 2: Crear `src/app/(public)/onboarding/page.tsx`**

```tsx
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { invitation, member, organization, user } from '@/lib/db/schema/auth'
import { apps } from '@/lib/apps/registry'
import { coerceAccent } from '@/lib/accent/presets'
import { OnboardingFlow } from './onboarding-flow'

export default async function OnboardingPage() {
  const session = (await auth.api.getSession({ headers: await headers() }))!
  const activeOrgId = session.session.activeOrganizationId

  // Datos del user actual
  const u = session.user
  const accent = coerceAccent((u as { accentColor?: unknown }).accentColor)

  // Org + rol
  let orgName: string | null = null
  let role: 'owner' | 'admin' | 'member' = 'member'
  let inviterName: string | null = null

  if (activeOrgId) {
    const [org] = await db.select().from(organization).where(eq(organization.id, activeOrgId)).limit(1)
    orgName = org?.name ?? null

    const [m] = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, u.id), eq(member.organizationId, activeOrgId)))
      .limit(1)
    role = (m?.role ?? 'member') as 'owner' | 'admin' | 'member'

    // Invitación aceptada (si existe)
    const [inv] = await db
      .select()
      .from(invitation)
      .where(and(eq(invitation.email, u.email), eq(invitation.organizationId, activeOrgId)))
      .limit(1)
    if (inv?.inviterId) {
      const [inviter] = await db.select({ name: user.name }).from(user).where(eq(user.id, inv.inviterId)).limit(1)
      inviterName = inviter?.name ?? null
    }
  }

  const appsCount = apps.filter((a) => a.status === 'available' && a.requiredRoles.includes(role)).length

  return (
    <OnboardingFlow
      data={{
        name: u.name,
        email: u.email,
        accent,
        orgName,
        role,
        inviterName,
        appsCount,
      }}
    />
  )
}
```

- [ ] **Step 3: Crear `src/app/(public)/onboarding/onboarding-flow.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { AccentColor } from '@/lib/accent/presets'
import { markOnboardingComplete } from '@/lib/onboarding/actions'
import { WelcomeStep } from '@/components/onboarding/welcome-step'
import { AccentStep } from '@/components/onboarding/accent-step'
import { TourModal } from '@/components/onboarding/tour-modal'
import { ProgressBar } from '@/components/onboarding/progress-bar'

export type OnboardingData = {
  name: string
  email: string
  accent: AccentColor
  orgName: string | null
  role: 'owner' | 'admin' | 'member'
  inviterName: string | null
  appsCount: number
}

type Step = 1 | 2 | 3

export function OnboardingFlow({ data }: { data: OnboardingData }) {
  const [step, setStep] = useState<Step>(1)
  const router = useRouter()

  async function finishOnboarding() {
    try {
      await markOnboardingComplete()
      router.push('/app')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cerrar el onboarding')
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1">
        {step === 1 && (
          <WelcomeStep data={data} onContinue={() => setStep(2)} onSkip={finishOnboarding} />
        )}
        {step === 2 && (
          <AccentStep
            initialAccent={data.accent}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
            onSkip={finishOnboarding}
          />
        )}
        {step === 3 && (
          <TourModal mode="onboarding" onClose={finishOnboarding} onSkip={finishOnboarding} />
        )}
      </div>
      <ProgressBar step={step} />
    </div>
  )
}
```

- [ ] **Step 4: Stubs para WelcomeStep / AccentStep / TourModal / ProgressBar**

Crear los 4 archivos como stubs con un texto para que el flow compile:

```tsx
// src/components/onboarding/welcome-step.tsx
'use client'
import type { OnboardingData } from '@/app/(public)/onboarding/onboarding-flow'
type Props = { data: OnboardingData; onContinue: () => void; onSkip: () => void }
export function WelcomeStep({ data, onContinue, onSkip }: Props) {
  return <div>Welcome stub — {data.name} <button onClick={onContinue}>continuar</button> <button onClick={onSkip}>saltar</button></div>
}
```

Misma cosa para `accent-step.tsx` (props `initialAccent`, `onBack`, `onContinue`, `onSkip`), `tour-modal.tsx` (props `mode: 'onboarding' | 'help'`, `onClose: () => void`, `onSkip: () => void`), y `progress-bar.tsx` (prop `step: 1|2|3`).

- [ ] **Step 5: Smoke + commit**

```bash
pnpm tsc --noEmit
# Loguear y navegar
curl -sS -o /tmp/o.html -w "http=%{http_code}\n" http://localhost:3003/onboarding -b /tmp/mtcookie.txt
grep -oE "Welcome stub|continuar|saltar" /tmp/o.html | head -3
git add 'src/app/(public)/onboarding/' src/components/onboarding/
git commit -m "feat(s2b): /onboarding skeleton con state machine 3 pasos + stubs"
```

---

## Task 5: WelcomeStep (paso 1) + AccountCard

**Files:** `src/components/onboarding/welcome-step.tsx`, `src/components/onboarding/account-card.tsx`

- [ ] **Step 1: Crear `src/components/onboarding/account-card.tsx`**

```tsx
type Props = {
  name: string
  email: string
  orgName: string | null
  role: string
  inviterName: string | null
  appsCount: number
}

function initials(name: string, email: string): string {
  const base = name?.trim() || email
  const parts = base.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

export function AccountCard({ name, email, orgName, role, inviterName, appsCount }: Props) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Tu cuenta</div>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-md bg-brand-accent text-brand-accent-foreground flex items-center justify-center font-mono font-bold">
          {initials(name, email)}
        </div>
        <div>
          <div className="font-semibold">{name || email}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
        </div>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Organización</dt>
        <dd>{orgName ?? '—'}</dd>
        <dt className="text-muted-foreground">Rol</dt>
        <dd><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">{role}</code></dd>
        {inviterName && (
          <>
            <dt className="text-muted-foreground">Invitado por</dt>
            <dd>{inviterName}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Apps disponibles</dt>
        <dd>{appsCount}</dd>
      </dl>
    </div>
  )
}
```

- [ ] **Step 2: Reescribir `src/components/onboarding/welcome-step.tsx`**

```tsx
'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MegacorpLogo } from '@/components/brand/logo'
import { AccountCard } from './account-card'
import type { OnboardingData } from '@/app/(public)/onboarding/onboarding-flow'

type Props = { data: OnboardingData; onContinue: () => void; onSkip: () => void }

export function WelcomeStep({ data, onContinue, onSkip }: Props) {
  const firstName = data.name?.split(/\s+/)[0] || data.email.split('@')[0] || 'colega'
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MegacorpLogo variant="brand" size={28} />
          <span className="font-semibold">MegaTools</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
          1 / 3 · Bienvenida
        </span>
      </header>
      <main className="flex-1 container mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center max-w-5xl">
        <div className="space-y-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            Bienvenida a bordo
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Hola, <span className="font-serif italic text-brand-accent">{firstName}</span>.
          </h1>
          <p className="text-muted-foreground max-w-md leading-relaxed">
            Bienvenido a <strong className="text-foreground">MegaTools</strong>, el portal de herramientas internas
            del grupo MEGACORP. Tu cuenta está lista: ya formás parte
            {data.orgName ? <> de <strong className="text-foreground">{data.orgName}</strong></> : null}
            {' '}con rol <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">{data.role}</code>.
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            Antes de empezar, te llevamos por un recorrido corto: elegir tu color y un tour de tres minutos.
            Después, todas las herramientas son tuyas.
          </p>
          <div className="flex gap-3 pt-2">
            <Button onClick={onContinue} className="gap-2">
              Empezar el recorrido <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onSkip}>
              Saltar e ir a apps
            </Button>
          </div>
        </div>
        <AccountCard
          name={data.name}
          email={data.email}
          orgName={data.orgName}
          role={data.role}
          inviterName={data.inviterName}
          appsCount={data.appsCount}
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Smoke + commit**

```bash
pnpm tsc --noEmit
curl -sS http://localhost:3003/onboarding -b /tmp/mtcookie.txt | grep -oE "Hola,|Empezar el recorrido|Tu cuenta" | sort -u
git add src/components/onboarding/welcome-step.tsx src/components/onboarding/account-card.tsx
git commit -m "feat(s2b): paso 1 — bienvenida con hero italic + card de cuenta"
```

---

## Task 6: AccentStep (paso 2) + AccentPreview

**Files:** `src/components/onboarding/accent-step.tsx`, `src/components/onboarding/accent-preview.tsx`

- [ ] **Step 1: Crear `src/components/onboarding/accent-preview.tsx`**

```tsx
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AccentPreview() {
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
        Vista previa en vivo
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="rounded-md bg-muted p-2">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] px-2 py-0.5 rounded border border-brand-accent text-brand-accent">
            Disponible
          </span>
        </div>
        <div>
          <div className="font-semibold mb-1">PDF Workbench</div>
          <p className="text-sm text-muted-foreground">
            Combiná, separá, reordená y rotá páginas. Todo en tu navegador.
          </p>
        </div>
        <Button size="sm">Abrir herramienta →</Button>
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="text-sm font-medium">Botones</div>
        <div className="flex gap-2">
          <Button size="sm">Primario</Button>
          <Button size="sm" variant="outline">Outline</Button>
          <Button size="sm" variant="ghost">Subtle</Button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Tags</span>
          <span className="px-1.5 py-0.5 rounded bg-muted font-mono">pdf-workbench</span>
          <span className="px-1.5 py-0.5 rounded bg-muted font-mono">settings</span>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Uso este mes</span>
          <span className="font-mono text-xs">72 %</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-brand-accent" style={{ width: '72%' }} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reescribir `src/components/onboarding/accent-step.tsx`**

```tsx
'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccentPicker } from '@/components/settings/accent-picker'
import { ACCENT_PRESETS, type AccentColor } from '@/lib/accent/presets'
import { AccentPreview } from './accent-preview'
import { useState } from 'react'

type Props = {
  initialAccent: AccentColor
  onBack: () => void
  onContinue: () => void
  onSkip: () => void
}

export function AccentStep({ initialAccent, onBack, onContinue, onSkip }: Props) {
  const [currentAccent, setCurrentAccent] = useState<AccentColor>(initialAccent)
  // Trackeamos cambios de data-accent en el DOM para mostrar el label "Seleccionado: X · #..."
  // Usamos un MutationObserver simple ligado al data-accent del <html>.
  // Para simplicidad, sondeamos en useEffect cada vez que se cambia algo.

  if (typeof document !== 'undefined') {
    const observed = document.documentElement.getAttribute('data-accent')
    if (observed && observed !== currentAccent && (ACCENT_PRESETS.map((p) => p.id) as string[]).includes(observed)) {
      // Diferido al próximo tick para no romper render
      queueMicrotask(() => setCurrentAccent(observed as AccentColor))
    }
  }

  const meta = ACCENT_PRESETS.find((p) => p.id === currentAccent) ?? ACCENT_PRESETS[0]!

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <header className="lg:col-span-2 container mx-auto w-full px-6 py-6 flex items-center justify-between">
        <span className="font-semibold">MegaTools</span>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
          2 / 3 · Tu color
        </span>
      </header>
      <section className="p-12 flex flex-col justify-center">
        <div className="max-w-md space-y-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            Paso 2 de 3
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Elegí tu <span className="font-serif italic text-brand-accent">accent</span>.
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Es un detalle, pero es tuyo. Aparece en los botones de acción, los estados activos y los resaltes.
            Se guarda con tu perfil y podés cambiarlo cuando quieras desde
            {' '}<strong className="text-foreground">Configuración → Apariencia</strong>.
          </p>
          <AccentPicker value={initialAccent} />
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={onContinue} className="gap-2">
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={onBack}>Atrás</Button>
            <Button variant="ghost" onClick={onSkip} className="ml-auto">Saltar</Button>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            Seleccionado: {meta.label} · {meta.hex}
          </div>
        </div>
      </section>
      <section className="p-12 bg-muted/30 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <AccentPreview />
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/onboarding/accent-step.tsx src/components/onboarding/accent-preview.tsx
git commit -m "feat(s2b): paso 2 — elegí tu accent + preview en vivo"
```

---

## Task 7: TourModal + tour-steps + dots de progreso

**Files:** `src/components/onboarding/tour-steps.ts`, `src/components/onboarding/tour-modal.tsx`

- [ ] **Step 1: Crear `src/components/onboarding/tour-steps.ts`**

```ts
export type TourStep = {
  number: string
  label: string
  title: string
  body: string
}

export const TOUR_STEPS: readonly TourStep[] = [
  { number: '01', label: 'BIENVENIDA',    title: 'Bienvenido a MegaTools',     body: 'Este es el portal interno del grupo MEGACORP — todas tus herramientas en un solo lugar, con tu cuenta.' },
  { number: '02', label: 'APPS REGISTRY', title: 'Cada herramienta es una app', body: 'El panel principal lista todas las apps disponibles para tu rol. Hoy: PDF Workbench (operar sobre PDFs) y Configuración. Próximamente: Imágenes con IA. Iremos sumando más.' },
  { number: '03', label: 'TU COLOR',      title: 'Tu accent te acompaña',       body: 'El color que elegiste tiñe botones, focos y resaltes en todo el portal. Lo cambiás cuando quieras desde Configuración → Apariencia.' },
  { number: '04', label: 'CONFIGURACIÓN', title: 'Todo lo personal está en Settings', body: 'Tu perfil, apariencia, organización y notificaciones viven en Configuración. Owner/admin también ven Miembros.' },
  { number: '05', label: 'ATAJOS',        title: 'Tip — atajos de teclado',     body: 'En herramientas que los soportan, mirá el bottom-left para ver atajos. En PDF Workbench: Del, R, Cmd/Ctrl+D, Esc, Cmd/Ctrl+A.' },
  { number: '06', label: 'AYUDA',         title: 'Siempre a un click',          body: 'Si te perdés o querés repasar este tour, el botón ❓ del header te trae de vuelta acá.' },
] as const
```

- [ ] **Step 2: Crear `src/components/onboarding/tour-modal.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MegacorpLogo } from '@/components/brand/logo'
import { TOUR_STEPS } from './tour-steps'

type Props = {
  mode: 'onboarding' | 'help'
  onClose: () => void
  onSkip: () => void
}

export function TourModal({ mode, onClose, onSkip }: Props) {
  const [i, setI] = useState(0)
  const step = TOUR_STEPS[i]!
  const isLast = i === TOUR_STEPS.length - 1
  const isFirst = i === 0

  function next() {
    if (isLast) onClose()
    else setI((v) => v + 1)
  }
  function back() {
    if (!isFirst) setI((v) => v - 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-card border shadow-xl overflow-hidden">
        <div className="grid grid-cols-[180px_1fr]">
          <div className="bg-muted/40 p-8 flex flex-col items-start justify-between border-r">
            <MegacorpLogo variant="mono" size={32} />
            <div>
              <div className="text-7xl font-bold text-brand-accent leading-none">{step.number}</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mt-2">
                de 06
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-6 w-full">
              <div className="rounded bg-brand-accent/30 aspect-square flex items-center justify-center">
                <FileText className="h-4 w-4 text-brand-accent" />
              </div>
              <div className="rounded bg-muted aspect-square" />
              <div className="rounded bg-muted aspect-square" />
            </div>
          </div>
          <div className="p-8 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                Paso {step.number} · {step.label}
              </div>
              {mode === 'help' && (
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Cerrar">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-3">{step.title}</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed flex-1">{step.body}</p>
            <div className="flex items-center justify-center gap-1.5 mt-6">
              {TOUR_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={
                    'h-1.5 rounded-full transition-all ' +
                    (idx === i ? 'w-6 bg-brand-accent' : 'w-1.5 bg-muted')
                  }
                />
              ))}
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              {mode === 'onboarding' ? (
                <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground">
                  Saltar tutorial
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={back} disabled={isFirst} className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Atrás
                </Button>
                <Button size="sm" onClick={next} className="gap-1.5">
                  {isLast ? 'Terminar' : 'Siguiente'} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/onboarding/tour-modal.tsx src/components/onboarding/tour-steps.ts
git commit -m "feat(s2b): tour modal de 6 pasos con dots de progreso"
```

---

## Task 8: ProgressBar

**Files:** `src/components/onboarding/progress-bar.tsx`

- [ ] **Step 1: Reescribir el stub creado en T4 con la versión real**

```tsx
type Props = { step: 1 | 2 | 3 }

export function ProgressBar({ step }: Props) {
  return (
    <div className="h-1 bg-muted/40 grid grid-cols-3">
      <div className={step >= 1 ? 'bg-brand-accent' : ''} />
      <div className={step >= 2 ? 'bg-brand-accent' : ''} />
      <div className={step >= 3 ? 'bg-brand-accent' : ''} />
    </div>
  )
}
```

- [ ] **Step 2: Smoke + commit**

```bash
pnpm tsc --noEmit
git add src/components/onboarding/progress-bar.tsx
git commit -m "feat(s2b): barra de progreso del onboarding con 3 segmentos"
```

---

## Task 9: TourLauncher (botón ❓) + integración en header

**Files:** `src/components/help/tour-launcher.tsx`, `src/app/(app)/layout.tsx`

- [ ] **Step 1: Crear `src/components/help/tour-launcher.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { TourModal } from '@/components/onboarding/tour-modal'

export function TourLauncher() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition"
        aria-label="Reabrir tour"
        title="Reabrir tour"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && <TourModal mode="help" onClose={() => setOpen(false)} onSkip={() => setOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Agregar `<TourLauncher />` al header de `(app)/layout.tsx`**

En el bloque `<div className="flex items-center gap-2">` del header, agregar `<TourLauncher />` ANTES de `<ThemeToggle />`:

```tsx
<div className="flex items-center gap-2">
  <TourLauncher />
  <ThemeToggle />
  <UserMenu user={session.user} />
</div>
```

Y agregar el import al top: `import { TourLauncher } from '@/components/help/tour-launcher'`.

- [ ] **Step 3: Smoke + commit**

```bash
pnpm tsc --noEmit
# El admin todavía no está onboardeado, primero completar el flow o set manually
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev \
  -c "UPDATE \"user\" SET onboarded_at = NOW() WHERE email = 'admin@megacorp.local';"
# Re-loguear (cookie pudo vencer; la sesión vieja arrastra onboardedAt=NULL)
curl -sS -o /dev/null -X POST http://localhost:3003/api/auth/sign-in/email \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3003' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/mtcookie.txt
# Ahora /app debería renderizar normal con el botón ❓ en el header
curl -sS http://localhost:3003/app -b /tmp/mtcookie.txt | grep -oE "Reabrir tour|HelpCircle" | head -2
git add src/components/help/tour-launcher.tsx 'src/app/(app)/layout.tsx'
git commit -m "feat(s2b): botón ❓ permanente en header reabre el tour"
```

---

## Task 10: 3 specs E2E + suite completa

**Files:** `tests/e2e/onboarding.spec.ts`

- [ ] **Step 1: Crear `tests/e2e/onboarding.spec.ts`**

```ts
import { test, expect, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'

function resetAdminOnboarding(value: 'NULL' | 'NOW()') {
  execSync(
    `docker exec megatools-postgres-dev psql -U megatools -d megatools_dev -c "UPDATE \\"user\\" SET onboarded_at = ${value} WHERE email = 'admin@megacorp.local';"`,
    { stdio: 'ignore' },
  )
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
}

test.describe('onboarding', () => {
  test.beforeEach(() => {
    resetAdminOnboarding('NULL')
  })

  test.afterAll(() => {
    resetAdminOnboarding('NOW()')
  })

  test('user nuevo es redirigido a /onboarding después del login', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /hola,/i })).toBeVisible()
  })

  test('"Saltar e ir a apps" marca onboardedAt y va a /app', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 })
    await page.getByRole('button', { name: /saltar e ir a apps/i }).click()
    await expect(page).toHaveURL(/\/app(?!\/)/, { timeout: 10_000 })
  })

  test('tour completo: 6 pasos + terminar va a /app', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 })

    // Paso 1 → 2
    await page.getByRole('button', { name: /empezar el recorrido/i }).click()

    // Paso 2 → 3
    await page.getByRole('button', { name: /^continuar$/i }).click()

    // Tour modal: 6 "Siguiente" + "Terminar"
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /siguiente/i }).click()
    }
    await page.getByRole('button', { name: /terminar/i }).click()

    await expect(page).toHaveURL(/\/app(?!\/)/, { timeout: 10_000 })
    // Verificar que el botón ❓ ya está en el header (post-onboarding)
    await expect(page.getByRole('button', { name: /reabrir tour/i })).toBeVisible()
  })
})
```

- [ ] **Step 2: Correr la suite del nuevo spec**

```bash
PLAYWRIGHT_PORT=3003 PLAYWRIGHT_BASE_URL=http://localhost:3003 pnpm test:e2e tests/e2e/onboarding.spec.ts
```

Expected: 3 passed.

- [ ] **Step 3: Suite completa**

```bash
PLAYWRIGHT_PORT=3003 PLAYWRIGHT_BASE_URL=http://localhost:3003 pnpm test:e2e
```

Expected: 14 anteriores + 3 nuevos = **17 passed**.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/onboarding.spec.ts
git commit -m "test(s2b): 3 specs E2E del onboarding (redirect / saltar / tour completo)"
```

---

## Task 11: README + push

**Files:** `README.md`

- [ ] **Step 1: Agregar bloque al README en la sección Diseño existente**

Después del párrafo de "## Diseño" agregado en Sprint 2.A, agregar:

```markdown

**Onboarding.** Al primer login (usuarios sin `user.onboarded_at`),
el portal los lleva por 3 pasos: bienvenida con datos de su cuenta,
elegir su color accent, y un tour guiado de 6 pasos. El botón ❓ del
header reabre el tour en cualquier momento.
```

- [ ] **Step 2: Verificación final**

```bash
pnpm tsc --noEmit
PLAYWRIGHT_PORT=3003 PLAYWRIGHT_BASE_URL=http://localhost:3003 pnpm test:e2e 2>&1 | tail -5
git log --oneline 1f56943..HEAD | wc -l
```

Expected: tsc EXIT=0, suite 17/17, ~11 commits del sprint.

- [ ] **Step 3: Commit + push**

```bash
git add README.md
git commit -m "docs(s2b): README menciona onboarding y botón ❓"
git push -u origin feat/sprint-2b-onboarding
```

---

## Definición de hecho (recap del spec)

- [x] Migración `0002_*.sql` aplicada (onboarded_at nullable timestamp)
- [x] Better Auth expone `onboardedAt` en additionalFields (input: false, server-only)
- [x] `(app)/layout.tsx` redirige a `/onboarding` si `!onboardedAt`
- [x] `/onboarding` con state machine cliente 3 pasos
- [x] Step 1: hero italic + AccountCard con datos reales
- [x] Step 2: AccentPicker existente + AccentPreview
- [x] Step 3: TourModal propio con 6 pasos + dots
- [x] Saltar marca onboardedAt y va a /app
- [x] Terminar tour idem
- [x] Botón ❓ en header reabre tour (mode='help', no afecta onboardedAt)
- [x] 17 specs E2E pasan
- [x] README mención

## Notas para el implementador

- Dev `:3003` corriendo; HMR aplica cambios. Si en algún smoke aparece código viejo, esperá 1-2s y reintentá.
- Cookie `/tmp/mtcookie.txt` se invalida ocasionalmente — re-loguear con el snippet en T3 Step 2.
- Las 9 errores de lint pre-existentes no son tu problema; verificá que no sumes nuevos.
- El test E2E del Step 3 (tour completo) hace 7 clicks de "Siguiente"/"Terminar"; usá selectores por role+name para que sea robusto.
- Si la migración 0002 tira parse warnings de drizzle-kit ("transformCreateStmt"), es ruido pre-existente, se puede ignorar mientras "migrations applied successfully" aparezca.
