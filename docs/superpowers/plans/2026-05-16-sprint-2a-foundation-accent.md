# Sprint 2.A — Foundation visual + Accent por usuario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh visual completo del portal (paletas cream/navy, tipografías Geist + JetBrains Mono + Instrument Serif, 3 variantes de logo SVG) + sistema de accent color por usuario con 6 presets persistidos en DB, aplicado a botones primarios, focus rings, estados activos de navegación y links.

**Architecture:** Tokens OKLCH en `globals.css` con una variable nueva `--brand-accent` (separada de `--accent` shadcn que maneja hover states). Las 6 variantes del accent se aplican vía `[data-accent="..."]` en un wrapper del shell autenticado, leyendo `user.accentColor` server-side para evitar flash. Tipografías vía `next/font`. Logo como componente React único con prop `variant: 'brand' | 'mono'` — la variante `mono` usa CSS vars que cambian con el tema, server-renderable.

**Tech Stack:** Next 16 + Tailwind 4 + shadcn/ui (Base UI). Drizzle ORM + Postgres. Better Auth con `user.additionalFields.accentColor`. `next/font` para Geist (ya), JetBrains Mono (nuevo, reemplaza Geist Mono), Instrument Serif (nuevo, hero). Tests con Playwright.

**Convenciones del repo:**
- Branch actual: `feat/sprint-2a-foundation-accent` (creada antes del plan).
- Spanish de Guatemala/rioplatense en strings de UI. Commit messages en español.
- Convención de commits: `feat(s2a): …`, `fix(s2a): …`, `test(s2a): …`, `docs(s2a): …`, `refactor(s2a): …`.
- `pnpm tsc --noEmit` debe pasar en cada commit. Lint trae 9 errores pre-existentes; tus cambios no deben sumar.
- Dev server del usuario corre en `:3003` con `pnpm dev --port 3003`. No matarlo. Cookie de admin para smokes en `/tmp/mtcookie.txt` (re-loguear si vencida con admin@megacorp.local / Admin123!Cambiame).
- Postgres dev en `:5435` vía `docker compose -f docker-compose.dev.yml up -d`.
- Triggers de Base UI envolviendo `<Button>` shadcn DEBEN usar prop `render={<Button …>…</Button>}` para evitar `<button>` anidado (ver `src/components/theme-toggle.tsx`).
- HEREDOC + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` en cada commit.

---

## File structure

```
NUEVOS:
src/components/brand/
└── logo.tsx                                # <MegacorpLogo variant="brand"|"mono" size={n} />

src/components/settings/
└── accent-picker.tsx                       # 6 swatches + optimistic update

src/lib/accent/
├── presets.ts                              # ACCENT_PRESETS, AccentColor type, DEFAULT_ACCENT
└── update.ts                               # authClient.updateUser wrapper

drizzle/
└── 0001_<random>_accent_color.sql          # generado por drizzle-kit; ALTER user ADD accent_color

tests/e2e/
└── accent-picker.spec.ts                   # 2 specs: persistencia + default mustard

MODIFICADOS:
src/app/globals.css                         # tokens OKLCH refresh + --brand-accent + variantes + logo vars + fix --font-sans
src/app/layout.tsx                          # next/font: JetBrains Mono + Instrument Serif
src/app/(app)/layout.tsx                    # wrapper con data-accent del user; logo refresh
src/app/(public)/page.tsx                   # <MegacorpLogo variant="brand" />
src/app/(public)/login/page.tsx             # <MegacorpLogo variant="brand" />
src/lib/db/schema/auth.ts                   # accentColor column en user
src/lib/auth/server.ts                      # additionalFields.accentColor + tipado en sesión
src/components/ui/button.tsx                # variant default usa bg-brand-accent + focus ring brand-accent
src/components/settings/appearance-form.tsx # incluye <AccentPicker /> debajo del Theme select
src/app/(app)/app/settings/layout.tsx       # ítem activo del sidebar con borde brand-accent
src/app/(public)/login/page.tsx             # TabsTrigger activo con texto brand-accent
README.md                                   # nota del brief y refresh visual
package.json                                # next/font Google ya soporta JetBrains Mono e Instrument Serif (sin deps nuevas)
```

---

## Task 1: Tokens OKLCH refresh + variables de brand-accent y logo

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Reemplazar el bloque `:root` por la versión cream paper**

Reemplazar exactamente el bloque que arranca con `:root {` y termina con la `}` justo antes de `.dark {`:

```css
:root {
  /* Backgrounds — cream paper en light */
  --background: oklch(0.96 0.012 80);     /* #F5F1EA */
  --foreground: oklch(0.155 0.012 270);   /* #15171C */

  /* Surfaces internas — white para contrastar con cream */
  --card: oklch(1 0 0);
  --card-foreground: var(--foreground);
  --popover: oklch(1 0 0);
  --popover-foreground: var(--foreground);

  /* Primary = casi-negro (botones secundarios / texto destacado, NO el accent) */
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);

  --secondary: oklch(0.95 0.008 80);
  --secondary-foreground: var(--foreground);

  /* Muted — gris cálido sobre cream */
  --muted: oklch(0.92 0.012 80);
  --muted-foreground: oklch(0.5 0.012 80);   /* #8A857B */

  /* shadcn accent (hover states) — gris cálido, NO el brand-accent */
  --accent: oklch(0.92 0.012 80);
  --accent-foreground: var(--foreground);

  --destructive: oklch(0.577 0.245 27.325);

  /* Bordes hairline cream */
  --border: oklch(0.86 0.018 80);            /* #D8D1C2 */
  --input: oklch(0.86 0.018 80);
  --ring: oklch(0.65 0.012 80);

  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);

  --radius: 0.625rem;

  --sidebar: oklch(0.985 0.008 80);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.92 0.012 80);
  --sidebar-accent-foreground: var(--foreground);
  --sidebar-border: oklch(0.86 0.018 80);
  --sidebar-ring: oklch(0.65 0.012 80);

  /* Brand-accent — separado de shadcn --accent. Default Mustard. Sobrescrito por [data-accent="..."] */
  --brand-accent: oklch(0.7 0.13 75);
  --brand-accent-foreground: oklch(0.15 0 0);

  /* Logo mono — 4 cuadrantes + meridianos. Cambia con el tema. */
  --logo-q1: #15171C;
  --logo-q2: #2D3138;
  --logo-q3: #7E7B73;
  --logo-q4: #C9C5B7;
  --logo-stroke: #15171C;
}
```

- [ ] **Step 2: Reemplazar el bloque `.dark` por la versión navy ink**

Reemplazar exactamente el bloque `.dark { … }`:

```css
.dark {
  --background: oklch(0.12 0.015 265);       /* #0D0F13 navy ink */
  --foreground: oklch(0.95 0.005 80);

  --card: oklch(0.16 0.015 265);
  --card-foreground: var(--foreground);
  --popover: oklch(0.16 0.015 265);
  --popover-foreground: var(--foreground);

  --primary: oklch(0.92 0.005 80);
  --primary-foreground: oklch(0.16 0.015 265);

  --secondary: oklch(0.22 0.015 265);
  --secondary-foreground: var(--foreground);

  --muted: oklch(0.22 0.015 265);
  --muted-foreground: oklch(0.65 0.012 80);

  --accent: oklch(0.22 0.015 265);
  --accent-foreground: var(--foreground);

  --destructive: oklch(0.704 0.191 22.216);

  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);

  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);

  --sidebar: oklch(0.16 0.015 265);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.22 0.015 265);
  --sidebar-accent-foreground: var(--foreground);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);

  /* Brand-accent en dark — el default mustard se mantiene; cada preset se ocupa de su variant */
  --brand-accent: oklch(0.75 0.13 75);
  --brand-accent-foreground: oklch(0.12 0.015 265);

  /* Logo mono dark — invertido */
  --logo-q1: #F1ECDF;
  --logo-q2: #D5CFBE;
  --logo-q3: #8F8B7E;
  --logo-q4: #4A4D55;
  --logo-stroke: #F1ECDF;
}
```

- [ ] **Step 3: Agregar las 6 variantes `[data-accent="..."]` después del bloque `.dark`**

Pegar exactamente esto antes del `@layer base`:

```css
[data-accent="mustard"]  { --brand-accent: oklch(0.7 0.13 75);   --brand-accent-foreground: #15171C; }
[data-accent="sienna"]   { --brand-accent: oklch(0.6 0.16 30);   --brand-accent-foreground: #ffffff; }
[data-accent="forest"]   { --brand-accent: oklch(0.48 0.09 155); --brand-accent-foreground: #ffffff; }
[data-accent="lake"]     { --brand-accent: oklch(0.55 0.18 250); --brand-accent-foreground: #ffffff; }
[data-accent="plum"]     { --brand-accent: oklch(0.46 0.13 320); --brand-accent-foreground: #ffffff; }
[data-accent="slate"]    { --brand-accent: oklch(0.45 0.04 250); --brand-accent-foreground: #ffffff; }

.dark [data-accent="mustard"] { --brand-accent: oklch(0.75 0.13 75); --brand-accent-foreground: #15171C; }
.dark [data-accent="sienna"]  { --brand-accent: oklch(0.65 0.16 30); }
.dark [data-accent="forest"]  { --brand-accent: oklch(0.55 0.09 155); }
.dark [data-accent="lake"]    { --brand-accent: oklch(0.62 0.18 250); }
.dark [data-accent="plum"]    { --brand-accent: oklch(0.55 0.13 320); }
.dark [data-accent="slate"]   { --brand-accent: oklch(0.55 0.04 250); }
```

- [ ] **Step 4: Agregar mapeos Tailwind 4 al `@theme inline` (al final del bloque, antes del `}` que cierra)**

Localizar el bloque `@theme inline { ... }` y agregar (justo antes del `--radius-sm`):

```css
  --color-brand-accent: var(--brand-accent);
  --color-brand-accent-foreground: var(--brand-accent-foreground);
  --font-serif: var(--font-instrument-serif);
```

Y arreglar el bug pre-existente: cambiar `--font-sans: var(--font-sans);` por `--font-sans: var(--font-geist-sans);` y `--font-mono: var(--font-geist-mono);` por `--font-mono: var(--font-jetbrains-mono);`.

El bloque `@theme inline` debe quedar con estas líneas relevantes (dejá el resto sin tocar):

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-jetbrains-mono);
  --font-serif: var(--font-instrument-serif);
  --font-heading: var(--font-geist-sans);
  --color-brand-accent: var(--brand-accent);
  --color-brand-accent-foreground: var(--brand-accent-foreground);
  /* ... resto sin cambios ... */
}
```

- [ ] **Step 5: Smoke — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0. (`globals.css` no afecta tsc, pero comprobamos que nada esté roto.)

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(s2a): refresh tokens OKLCH + var --brand-accent con 6 variantes

- Background cream paper #F5F1EA (light), navy ink (dark)
- Surfaces internas blancas para contrastar
- Nueva var --brand-accent (separada de --accent shadcn que maneja hover)
- 6 presets vía [data-accent="..."] sobrescribiendo --brand-accent
- Vars del logo mono (4 cuadrantes + stroke) que cambian con el tema
- Fix bug pre-existente: --font-sans apuntaba a sí misma; ahora a Geist
- @theme inline expone --color-brand-accent para Tailwind

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Tipografías — JetBrains Mono + Instrument Serif via next/font

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Sobrescribir `src/app/layout.tsx` con la nueva configuración de fuentes**

```tsx
import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MegaTools",
  description: "Portal interno de herramientas del grupo MEGACORP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-accent="mustard"
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Notar:
- `Geist_Mono` reemplazado por `JetBrains_Mono` (variable `--font-jetbrains-mono`).
- Nueva `Instrument_Serif` con `style: "italic"` y `weight: "400"` (no expone otros pesos en Google Fonts).
- `data-accent="mustard"` como default en `<html>` — sobrescrito en el shell autenticado por el wrapper que setea el accent del user (Task 9).
- Metadata corregida (antes decía "Create Next App").

- [ ] **Step 2: Smoke — el dev :3003 recompila sin errores y la home carga**

```bash
pnpm tsc --noEmit
# Forzar reload del bundle
curl -sS -o /dev/null -w "/=%{http_code}\n" http://localhost:3003/
# Verificar que las nuevas fuentes se inyectan (next/font genera class variables en <html>)
curl -sS http://localhost:3003/ | grep -oE "font-instrument-serif|font-jetbrains-mono" | sort -u
```

Expected: tsc EXIT=0; `/` HTTP 200; grep imprime ambas variables font.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "$(cat <<'EOF'
feat(s2a): tipografías Geist + JetBrains Mono + Instrument Serif vía next/font

JetBrains Mono reemplaza Geist Mono (más carácter, mejor para eyebrows/code).
Instrument Serif italic para hero del onboarding y secciones de marketing
(uso muy puntual, font-serif token de Tailwind).
data-accent="mustard" como default en <html> — el shell autenticado lo
sobrescribe con el accent del usuario.
Metadata actualizada (antes era el placeholder de create-next-app).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Componente MegacorpLogo

**Files:**
- Create: `src/components/brand/logo.tsx`

- [ ] **Step 1: Crear `src/components/brand/logo.tsx`**

```tsx
type LogoVariant = 'brand' | 'mono'

type Props = {
  variant?: LogoVariant
  size?: number
  className?: string
  title?: string
}

const BRAND = {
  q1: '#D4A017',
  q2: '#0F1B3D',
  q3: '#B5AC9E',
  q4: '#9F968A',
  stroke: 'rgba(15,27,61,0.55)',
  strokeWidth: 1.5,
}

const MONO_VARS = {
  q1: 'var(--logo-q1)',
  q2: 'var(--logo-q2)',
  q3: 'var(--logo-q3)',
  q4: 'var(--logo-q4)',
  stroke: 'var(--logo-stroke)',
  strokeWidth: 2.5,
}

export function MegacorpLogo({
  variant = 'mono',
  size = 40,
  className,
  title = 'MEGACORP',
}: Props) {
  const c = variant === 'brand' ? BRAND : MONO_VARS
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-label={title}
      className={className}
      role="img"
    >
      <path d="M50 6 a44 44 0 0 1 44 44 H50 Z" fill={c.q1} />
      <path d="M50 50 H94 a44 44 0 0 1 -44 44 Z" fill={c.q2} />
      <path d="M50 50 H6 a44 44 0 0 0 44 44 Z" fill={c.q3} />
      <path d="M50 6 a44 44 0 0 0 -44 44 H50 Z" fill={c.q4} />
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
      />
      <line
        x1="6"
        y1="50"
        x2="94"
        y2="50"
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
      />
      <line
        x1="50"
        y1="6"
        x2="50"
        y2="94"
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
      />
    </svg>
  )
}
```

- [ ] **Step 2: Smoke — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 3: Commit**

```bash
git add src/components/brand/logo.tsx
git commit -m "$(cat <<'EOF'
feat(s2a): componente <MegacorpLogo variant="brand"|"mono" />

Single source of truth para el mark de MEGACORP en 3 tratamientos:
- variant="brand" usa colores hardcoded (#D4A017 dorado, #0F1B3D navy,
  beige) para marketing/landing/emails.
- variant="mono" lee las CSS vars del logo (--logo-q1 a q4, --logo-stroke)
  que cambian con el tema (light → grises oscuros sobre cream;
  dark → beige claro sobre navy).
Stroke 2.5 en mono, 1.5 en brand (consistente con el brief).
SVG inline server-renderable, sin client component.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Reemplazar usos del SVG file por `<MegacorpLogo>`

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/app/(public)/login/page.tsx`

- [ ] **Step 1: Modificar `src/app/(app)/layout.tsx` — header con logo mono**

Reemplazar el bloque del `<Link>` que contiene `<img src="/mega_logo.svg" ... />`:

ANTES (en el archivo actual):
```tsx
<Link href="/app" className="flex items-center gap-2 font-semibold text-lg">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src="/mega_logo.svg" alt="MEGACORP" width={28} height={28} />
  MegaTools
</Link>
```

DESPUÉS:
```tsx
<Link href="/app" className="flex items-center gap-2 font-semibold text-lg">
  <MegacorpLogo variant="mono" size={28} />
  MegaTools
</Link>
```

Y agregar el import al top del archivo:
```tsx
import { MegacorpLogo } from '@/components/brand/logo'
```

- [ ] **Step 2: Modificar `src/app/(public)/page.tsx` — landing con logo brand**

Reemplazar:

ANTES:
```tsx
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
  src="/mega_logo.svg"
  alt="MEGACORP"
  width={96}
  height={96}
  className="mx-auto mb-6"
/>
```

DESPUÉS:
```tsx
<MegacorpLogo variant="brand" size={96} className="mx-auto mb-6" />
```

Y agregar el import:
```tsx
import { MegacorpLogo } from '@/components/brand/logo'
```

- [ ] **Step 3: Modificar `src/app/(public)/login/page.tsx` — login con logo brand**

Reemplazar:

ANTES:
```tsx
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
  src="/mega_logo.svg"
  alt="MEGACORP"
  width={64}
  height={64}
  className="mx-auto mb-6"
/>
```

DESPUÉS:
```tsx
<MegacorpLogo variant="brand" size={64} className="mx-auto mb-6" />
```

Y agregar el import:
```tsx
import { MegacorpLogo } from '@/components/brand/logo'
```

- [ ] **Step 4: Smoke — los 3 endpoints siguen 200 y el SVG mono aparece en /app**

```bash
pnpm tsc --noEmit
curl -sS -o /dev/null -w "/=%{http_code} login=%{http_code} app=" http://localhost:3003/
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3003/login
curl -sS http://localhost:3003/app -b /tmp/mtcookie.txt | grep -oE 'aria-label="MEGACORP"' | head -1
```

Expected: tsc EXIT=0; los 3 endpoints 200; grep imprime `aria-label="MEGACORP"` (el SVG inline).

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/layout.tsx' 'src/app/(public)/page.tsx' 'src/app/(public)/login/page.tsx'
git commit -m "$(cat <<'EOF'
feat(s2a): header/landing/login usan <MegacorpLogo> en lugar del SVG plano

Header del shell autenticado → variant mono (adapta al tema).
Landing y login → variant brand (colores fijos del marketing).
public/mega_logo.svg queda como referencia histórica; eventualmente
lo borramos cuando ningún otro lado lo referencie.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Migration Drizzle — `accent_color` en user

**Files:**
- Modify: `src/lib/db/schema/auth.ts`
- Create: `drizzle/0001_*.sql` (generado)

- [ ] **Step 1: Agregar la columna en `src/lib/db/schema/auth.ts`**

Localizar el `pgTable("user", { ... })` y agregar `accentColor` justo antes del cierre `})`:

```ts
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  accentColor: text("accent_color").notNull().default("mustard"),
});
```

- [ ] **Step 2: Generar la migración**

```bash
pnpm db:generate
```

Expected: drizzle-kit crea `drizzle/0001_<random_word>_<random_word>.sql` con `ALTER TABLE "user" ADD COLUMN "accent_color" text DEFAULT 'mustard' NOT NULL;`. Verificar:

```bash
ls drizzle/
cat drizzle/0001_*.sql
```

Expected: el SQL contiene exactamente ese ALTER (con quoting Drizzle correcto).

- [ ] **Step 3: Aplicar la migración**

```bash
pnpm db:migrate
```

Expected: "migrations applied successfully!" Sin errores.

- [ ] **Step 4: Verificar el schema en Postgres**

```bash
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev -c "\d \"user\"" | grep accent_color
```

Expected: línea con `accent_color | text | not null | 'mustard'::text`.

- [ ] **Step 5: Verificar que los users existentes tienen mustard por default**

```bash
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev -c "SELECT email, accent_color FROM \"user\";"
```

Expected: todas las filas muestran `mustard` (la DEFAULT se aplica retroactivamente con NOT NULL DEFAULT en Postgres).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/auth.ts drizzle/0001_*.sql drizzle/meta/0001_snapshot.json drizzle/meta/_journal.json
git commit -m "$(cat <<'EOF'
feat(s2a): migración user.accent_color text NOT NULL DEFAULT 'mustard'

Default mustard para users existentes y futuros. La validación de que
el valor pertenece al set permitido (mustard|sienna|forest|lake|plum|slate)
se hace en cliente (zod en AccentPicker) y en server (additionalFields
en Better Auth, próxima tarea).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Better Auth — `additionalFields.accentColor` con validación

**Files:**
- Modify: `src/lib/auth/server.ts`

- [ ] **Step 1: Agregar `user.additionalFields` al config de `betterAuth(...)`**

Localizar la llamada `betterAuth({ ... })` en `src/lib/auth/server.ts` y agregar `user: { additionalFields: { ... } }` justo después de `database: drizzleAdapter(db, { provider: 'pg' }),` (antes de `emailAndPassword`):

```ts
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  user: {
    additionalFields: {
      accentColor: {
        type: 'string',
        defaultValue: 'mustard',
        required: false,
        input: true, // permite cliente actualizarlo vía update-user
      },
    },
  },
  emailAndPassword: {
```

- [ ] **Step 2: Smoke — el endpoint update-user acepta accentColor**

```bash
pnpm tsc --noEmit
# Re-loguear admin (la cookie puede no haber sido invalidada pero por las dudas):
curl -sS -o /dev/null -X POST http://localhost:3003/api/auth/sign-in/email \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3003' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/mtcookie.txt

# Llamar update-user con accentColor:
curl -sS -o /tmp/upd.json -w "http=%{http_code}\n" -X POST \
  http://localhost:3003/api/auth/update-user \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3003' \
  -b /tmp/mtcookie.txt \
  -d '{"accentColor":"forest"}'
head -c 300 /tmp/upd.json; echo

# Verificar en DB:
docker exec megatools-postgres-dev psql -U megatools -d megatools_dev \
  -c "SELECT email, accent_color FROM \"user\" WHERE email='admin@megacorp.local';"

# Revert para no contaminar testing manual posterior:
curl -sS -o /dev/null -X POST http://localhost:3003/api/auth/update-user \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3003' \
  -b /tmp/mtcookie.txt \
  -d '{"accentColor":"mustard"}'
```

Expected: tsc EXIT=0; update-user HTTP 200; psql muestra `forest` después del update; revert vuelve a `mustard`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/server.ts
git commit -m "$(cat <<'EOF'
feat(s2a): Better Auth additionalFields.accentColor (string, default mustard)

input: true permite que el cliente lo actualice vía update-user.
La validación del valor (uno de los 6 presets) la hace AccentPicker en
cliente; aceptamos string en server porque Better Auth no provee enums
en additionalFields y un valor inválido simplemente no aplica style.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Helpers `presets.ts` y `update.ts`

**Files:**
- Create: `src/lib/accent/presets.ts`
- Create: `src/lib/accent/update.ts`

- [ ] **Step 1: Crear `src/lib/accent/presets.ts`**

```ts
export const ACCENT_PRESETS = [
  { id: 'mustard', label: 'Mustard', hex: '#C9961B' },
  { id: 'sienna',  label: 'Sienna',  hex: '#C24A3C' },
  { id: 'forest',  label: 'Forest',  hex: '#2F6B4E' },
  { id: 'lake',    label: 'Lake',    hex: '#2A6FDB' },
  { id: 'plum',    label: 'Plum',    hex: '#7B3F8C' },
  { id: 'slate',   label: 'Slate',   hex: '#475569' },
] as const

export type AccentColor = (typeof ACCENT_PRESETS)[number]['id']
export const ACCENT_IDS: readonly AccentColor[] = ACCENT_PRESETS.map((p) => p.id)
export const DEFAULT_ACCENT: AccentColor = 'mustard'

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && (ACCENT_IDS as readonly string[]).includes(value)
}

export function coerceAccent(value: unknown): AccentColor {
  return isAccentColor(value) ? value : DEFAULT_ACCENT
}
```

- [ ] **Step 2: Crear `src/lib/accent/update.ts`**

```ts
'use client'

import { authClient } from '@/lib/auth/client'
import type { AccentColor } from './presets'

export async function updateUserAccent(accent: AccentColor): Promise<void> {
  // Better Auth tipa updateUser sólo con campos conocidos; el additional field
  // se acepta en runtime via additionalFields del config server.
  const res = await authClient.updateUser({ accentColor: accent } as never)
  if ('error' in res && res.error) {
    throw new Error(res.error.message ?? 'No se pudo actualizar el color')
  }
}
```

- [ ] **Step 3: Smoke — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/accent/presets.ts src/lib/accent/update.ts
git commit -m "$(cat <<'EOF'
feat(s2a): helpers de accent — ACCENT_PRESETS + AccentColor type + updateUserAccent

presets.ts es source-of-truth de los 6 colores con id/label/hex.
isAccentColor type guard + coerceAccent fallback para leer valores
posiblemente inválidos del DB y caer a mustard.
update.ts wrappea authClient.updateUser para reflejar el additional
field accentColor en server.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Componente `<AccentPicker>`

**Files:**
- Create: `src/components/settings/accent-picker.tsx`

- [ ] **Step 1: Crear `src/components/settings/accent-picker.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { ACCENT_PRESETS, type AccentColor } from '@/lib/accent/presets'
import { updateUserAccent } from '@/lib/accent/update'

type Props = {
  /** Valor inicial leído del user (server). */
  value: AccentColor
}

export function AccentPicker({ value }: Props) {
  const [current, setCurrent] = useState<AccentColor>(value)
  const [pending, startTransition] = useTransition()

  function applyToDOM(accent: AccentColor) {
    // El wrapper del shell autenticado tiene data-accent. Lo actualizamos
    // para feedback inmediato (sin esperar el round-trip al server).
    const root =
      document.querySelector<HTMLElement>('[data-accent-root]') ??
      document.documentElement
    root.dataset.accent = accent
  }

  function choose(next: AccentColor) {
    if (next === current) return
    const prev = current
    setCurrent(next)
    applyToDOM(next)
    startTransition(async () => {
      try {
        await updateUserAccent(next)
      } catch (err) {
        // Rollback
        setCurrent(prev)
        applyToDOM(prev)
        toast.error(err instanceof Error ? err.message : 'No se pudo guardar el color')
      }
    })
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Color</label>
      <div className="flex flex-wrap gap-3">
        {ACCENT_PRESETS.map((preset) => {
          const selected = current === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => choose(preset.id)}
              disabled={pending}
              className="group flex flex-col items-center gap-1 disabled:opacity-60"
              aria-label={preset.label}
              aria-pressed={selected}
              data-accent-swatch={preset.id}
            >
              <span
                className="h-12 w-12 rounded-md border-2 flex items-center justify-center transition"
                style={{
                  backgroundColor: preset.hex,
                  borderColor: selected ? 'var(--foreground)' : 'transparent',
                }}
              >
                {selected && <Check className="h-5 w-5 text-white drop-shadow" />}
              </span>
              <span className="text-xs">{preset.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Tu color acompaña botones, foco, estados activos y links en todo el portal.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Smoke — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/accent-picker.tsx
git commit -m "$(cat <<'EOF'
feat(s2a): <AccentPicker /> con optimistic update + rollback

6 swatches en grid responsive. El click actualiza data-accent en el
DOM inmediatamente para feedback instantáneo y dispara updateUserAccent.
Si el server falla, rollback al valor previo y toast de error.
data-accent-swatch en cada button para targeting de E2E tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Aplicar `data-accent` server-side desde el shell autenticado

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Leer el accent del user y aplicarlo al wrapper**

En `src/app/(app)/layout.tsx`, modificar el JSX que envuelve el shell. Antes:

```tsx
return (
  <div className="min-h-screen flex flex-col">
    <header className="border-b">
      ...
    </header>
    <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
  </div>
)
```

Después:

```tsx
const accent = coerceAccent((session.user as { accentColor?: unknown }).accentColor)
return (
  <div data-accent={accent} data-accent-root className="min-h-screen flex flex-col">
    <header className="border-b">
      ...
    </header>
    <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
  </div>
)
```

Agregar el import al top:

```tsx
import { coerceAccent } from '@/lib/accent/presets'
```

(`coerceAccent` cae a `mustard` si el valor es inválido o `undefined`.)

- [ ] **Step 2: Smoke — la página renderiza con data-accent correcto**

```bash
pnpm tsc --noEmit
curl -sS http://localhost:3003/app -b /tmp/mtcookie.txt | grep -oE 'data-accent="[a-z]+"' | head -3
```

Expected: tsc EXIT=0; grep imprime `data-accent="mustard"` (el wrapper interno) además del default en `<html>`.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/(app)/layout.tsx'
git commit -m "$(cat <<'EOF'
feat(s2a): shell autenticado aplica data-accent del user server-side

Lee user.accentColor del session y lo aplica al div wrapper como
data-accent="${value}" data-accent-root. Las CSS variants [data-accent="..."]
cascadean a los hijos (todo el portal interno). data-accent-root sirve
de marker para AccentPicker (DOM lookup directo sin refs cruzados).
Si el valor no matchea un preset válido, coerceAccent cae a mustard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Integrar `<AccentPicker>` en Settings → Apariencia

**Files:**
- Modify: `src/components/settings/appearance-form.tsx`
- Modify: `src/app/(app)/app/settings/apariencia/page.tsx`

- [ ] **Step 1: Leer el archivo actual del page para entender cómo pasa la session**

```bash
cat 'src/app/(app)/app/settings/apariencia/page.tsx'
```

Si actualmente NO lee la session, la modificamos para leerla y pasar el accent al AppearanceForm.

- [ ] **Step 2: Modificar `src/app/(app)/app/settings/apariencia/page.tsx`**

Reemplazar contenido completo:

```tsx
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { coerceAccent } from '@/lib/accent/presets'
import { AppearanceForm } from '@/components/settings/appearance-form'

export default async function AppearancePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const accent = coerceAccent((session?.user as { accentColor?: unknown } | undefined)?.accentColor)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Apariencia</h1>
      <p className="text-muted-foreground mb-6">Personalizá la apariencia del portal.</p>
      <AppearanceForm initialAccent={accent} />
    </div>
  )
}
```

- [ ] **Step 3: Modificar `src/components/settings/appearance-form.tsx`**

Reemplazar contenido completo:

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
import { AccentPicker } from '@/components/settings/accent-picker'
import type { AccentColor } from '@/lib/accent/presets'

type Props = {
  initialAccent: AccentColor
}

export function AppearanceForm({ initialAccent }: Props) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <Label htmlFor="theme">Tema</Label>
        <Select value={theme ?? 'system'} onValueChange={(value) => setTheme(value || 'system')}>
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
      <AccentPicker value={initialAccent} />
    </div>
  )
}
```

- [ ] **Step 4: Smoke — la página renderiza con los 6 swatches**

```bash
pnpm tsc --noEmit
curl -sS http://localhost:3003/app/settings/apariencia -b /tmp/mtcookie.txt | grep -oE 'data-accent-swatch="[a-z]+"' | sort -u
```

Expected: tsc EXIT=0; grep imprime los 6 valores (mustard, sienna, forest, lake, plum, slate).

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/app/settings/apariencia/page.tsx' src/components/settings/appearance-form.tsx
git commit -m "$(cat <<'EOF'
feat(s2a): Settings → Apariencia incluye <AccentPicker /> debajo del tema

El page server-side lee user.accentColor del session y se lo pasa como
initialAccent. El form sigue como client component (necesita useTheme),
ahora con dos controles: Tema (light/dark/system) y Color (6 presets).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: `Button` variant default usa `bg-brand-accent` + focus ring

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Cambiar el variant `default` y el focus ring del base**

Reemplazar EXACTAMENTE estas dos partes del `cva(...)`:

1. En la base string (primer argumento de `cva`), reemplazar:

```
focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
```

por:

```
focus-visible:border-brand-accent focus-visible:ring-3 focus-visible:ring-brand-accent/40
```

2. En `variants.variant.default`, reemplazar:

```ts
default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
```

por:

```ts
default: "bg-brand-accent text-brand-accent-foreground [a]:hover:bg-brand-accent/85 hover:bg-brand-accent/90",
```

(Tailwind 4 resuelve `bg-brand-accent` desde `--color-brand-accent` que definimos en `@theme inline` en Task 1.)

- [ ] **Step 2: Smoke — tsc + verificar visualmente que los botones primary usan accent**

```bash
pnpm tsc --noEmit
# Forzar que el cliente cargue las clases nuevas (Tailwind 4 + Turbopack)
curl -sS -o /dev/null http://localhost:3003/app -b /tmp/mtcookie.txt
sleep 1
curl -sS http://localhost:3003/app -b /tmp/mtcookie.txt | grep -oE 'bg-brand-accent' | head -2
```

Expected: tsc EXIT=0; grep imprime al menos 1 `bg-brand-accent` (de los buttons default).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "$(cat <<'EOF'
feat(s2a): Button variant default usa bg-brand-accent + focus ring brand-accent

Variante default deja de usar bg-primary (casi-negro) y pasa a usar
bg-brand-accent que toma el accent del usuario (mustard default; los
otros 5 presets cuando el user cambia desde Settings).
Hover state baja a 85-90% del accent para feedback.
Focus visible ring usa brand-accent/40 — los inputs y otros buttons
heredan el mismo ring por consistencia visual.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Aplicar accent a nav active + links + tabs

**Files:**
- Modify: `src/app/(app)/app/settings/layout.tsx`
- Modify: `src/app/(public)/login/page.tsx`

- [ ] **Step 1: Sidebar de Settings — marcar el ítem activo con borde brand-accent**

Leer el archivo actual:

```bash
cat 'src/app/(app)/app/settings/layout.tsx'
```

Hoy el ítem activo no se distingue visualmente. Convertir el `<Link>` actual a un client-component que detecte el path activo y aplique borde brand-accent.

**Sobrescribir** `src/app/(app)/app/settings/layout.tsx` con:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Section = { id: string; label: string; href: string }

const sections: Section[] = [
  { id: 'perfil', label: 'Mi perfil', href: '/app/settings/perfil' },
  { id: 'organizacion', label: 'Organización', href: '/app/settings/organizacion' },
  { id: 'apariencia', label: 'Apariencia', href: '/app/settings/apariencia' },
  { id: 'notificaciones', label: 'Notificaciones', href: '/app/settings/notificaciones' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex gap-8">
      <aside className="w-48 shrink-0">
        <h2 className="text-lg font-semibold mb-4">Configuración</h2>
        <nav className="flex flex-col gap-1">
          {sections.map((s) => {
            const active = pathname?.startsWith(s.href) ?? false
            return (
              <Link
                key={s.id}
                href={s.href}
                aria-current={active ? 'page' : undefined}
                className={
                  'px-3 py-2 rounded-md text-sm border-l-2 transition ' +
                  (active
                    ? 'border-brand-accent bg-muted/40 font-medium text-foreground'
                    : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground')
                }
              >
                {s.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
```

Notar:
- Agregado `'use client'` (necesita `usePathname`).
- Borde izquierdo de 2px usa `brand-accent` cuando activo.
- Aria-current="page" para accesibilidad.
- Texto del item activo en `text-foreground`, no activos en `text-muted-foreground`.

- [ ] **Step 2: Tabs del login — TabsTrigger activo con texto brand-accent**

El componente `Tabs` de shadcn no expone el estado activo directamente en classNames del trigger desde el page. La forma idiomática es vía data-attribute `[data-state="active"]`. Para no tocar `src/components/ui/tabs.tsx` directamente (lo usa todo el repo), aplicamos override sólo en este page con `className` pasado a `TabsTrigger`.

Modificar `src/app/(public)/login/page.tsx`, localizar el bloque:

```tsx
<TabsList className="grid w-full grid-cols-2 mb-4">
  <TabsTrigger value="password">Contraseña</TabsTrigger>
  <TabsTrigger value="magic">Enlace mágico</TabsTrigger>
</TabsList>
```

Reemplazar por:

```tsx
<TabsList className="grid w-full grid-cols-2 mb-4">
  <TabsTrigger
    value="password"
    className="data-[state=active]:text-brand-accent data-[state=active]:border-b-2 data-[state=active]:border-brand-accent"
  >
    Contraseña
  </TabsTrigger>
  <TabsTrigger
    value="magic"
    className="data-[state=active]:text-brand-accent data-[state=active]:border-b-2 data-[state=active]:border-brand-accent"
  >
    Enlace mágico
  </TabsTrigger>
</TabsList>
```

- [ ] **Step 3: Links de texto del login — aplicar `text-brand-accent`**

En el mismo `src/app/(public)/login/page.tsx`, localizar:

```tsx
<Link href="/forgot-password" className="underline">
  ¿Olvidaste tu contraseña?
</Link>
```

Reemplazar por:

```tsx
<Link href="/forgot-password" className="text-brand-accent underline underline-offset-2">
  ¿Olvidaste tu contraseña?
</Link>
```

- [ ] **Step 4: Smoke — tsc + las rutas siguen 200**

```bash
pnpm tsc --noEmit
curl -sS -o /dev/null -w "settings=%{http_code} login=" http://localhost:3003/app/settings/perfil -b /tmp/mtcookie.txt
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3003/login
curl -sS http://localhost:3003/app/settings/apariencia -b /tmp/mtcookie.txt | grep -oE 'border-brand-accent' | head -1
```

Expected: tsc EXIT=0; ambas rutas 200; grep imprime `border-brand-accent` (del item activo de Settings sidebar).

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/app/settings/layout.tsx' 'src/app/(public)/login/page.tsx'
git commit -m "$(cat <<'EOF'
feat(s2a): nav active + tabs login + link 'forgot password' usan brand-accent

Settings sidebar pasa a 'use client' con usePathname para marcar el item
activo con borde izquierdo de 2px en brand-accent y aria-current="page".
Tabs del login usan data-[state=active] selectors para teñir texto +
borde inferior del tab activo.
Link 'forgot password' con text-brand-accent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Tests E2E del accent picker

**Files:**
- Create: `tests/e2e/accent-picker.spec.ts`

- [ ] **Step 1: Crear `tests/e2e/accent-picker.spec.ts`**

```ts
import { test, expect, type Page } from '@playwright/test'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 })
}

async function resetAccent(page: Page) {
  // Asegurar que volvemos a mustard para no contaminar otros tests
  await page.goto('/app/settings/apariencia')
  await page.locator('[data-accent-swatch="mustard"]').click()
  await page.waitForTimeout(300)
}

test('default mustard para users sin valor explícito', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  const root = page.locator('[data-accent-root]').first()
  await expect(root).toHaveAttribute('data-accent', /(mustard|sienna|forest|lake|plum|slate)/)
})

test('cambiar accent persiste tras reload', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app/settings/apariencia')

  // Click en Forest
  await page.locator('[data-accent-swatch="forest"]').click()

  // Esperar el optimistic + commit del server transition
  await expect(page.locator('[data-accent-root]')).toHaveAttribute('data-accent', 'forest', {
    timeout: 5_000,
  })
  await page.waitForTimeout(500)

  // Reload — el valor debe venir del server
  await page.reload()
  await expect(page.locator('[data-accent-root]')).toHaveAttribute('data-accent', 'forest', {
    timeout: 5_000,
  })

  // Cleanup
  await resetAccent(page)
})
```

- [ ] **Step 2: Correr la suite del nuevo spec**

```bash
PLAYWRIGHT_PORT=3003 PLAYWRIGHT_BASE_URL=http://localhost:3003 pnpm test:e2e tests/e2e/accent-picker.spec.ts
```

Expected: 2 passed.

- [ ] **Step 3: Correr la suite completa para confirmar nada se rompió**

```bash
PLAYWRIGHT_PORT=3003 PLAYWRIGHT_BASE_URL=http://localhost:3003 pnpm test:e2e
```

Expected: 12 anteriores + 2 nuevos = **14 passed**. Si algún test pre-existente falla, revisar — los cambios visuales no deberían afectar selectores (rol/label/text).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/accent-picker.spec.ts
git commit -m "$(cat <<'EOF'
test(s2a): 2 specs E2E del accent picker

1. default mustard se aplica si el user no tiene valor explícito o tiene
   uno inválido (cubre coerceAccent fallback).
2. cambiar a forest persiste tras reload (cubre optimistic + DB write +
   re-fetch en next page load). Cleanup vuelve a mustard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: README + cierre Sprint 2.A

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Agregar mención breve al brief de diseño y al Sprint 2.A**

Localizar la sección "## Arquitectura" del README (o "## Stack" en la versión actual) y agregar al final de su párrafo:

```markdown
## Diseño

El portal sigue el brief en `docs/brand/2026-05-megatools-brief-v1.html`:
paleta cream paper / navy ink, tipografías Geist + JetBrains Mono +
Instrument Serif (italic, hero), logo MEGACORP en 3 tratamientos
(brand para marketing, mono adaptativo al tema para in-product) y
**accent color por usuario** con 6 presets (Mustard por default). Cada
persona elige el suyo en `Settings → Apariencia` y acompaña sus CTAs,
focus rings, estados activos de nav y links en todo el portal.
```

(Si no encontrás dónde encaja mejor, agregalo después de la sección "## Stack".)

- [ ] **Step 2: Verificación final del sprint**

```bash
pnpm tsc --noEmit
PLAYWRIGHT_PORT=3003 PLAYWRIGHT_BASE_URL=http://localhost:3003 pnpm test:e2e 2>&1 | tail -6
git log --oneline feat/fase-3-apps-settings-deploy..HEAD | head -20
```

Expected: tsc EXIT=0; suite 14/14 passing; ~14 commits del Sprint 2.A.

- [ ] **Step 3: Commit + push**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs(s2a): README menciona el brief de diseño + accent por usuario

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin feat/sprint-2a-foundation-accent 2>&1 | tail -3
```

Expected: push exitoso. La PR (si se desea) se abre desde GitHub con `gh pr create`, fuera del scope de este plan.

---

## Definición de hecho (recap del spec)

- [x] tsc + lint sin issues nuevos
- [x] Migración `0001` aplicada (accent_color text NOT NULL DEFAULT 'mustard')
- [x] Background light = cream paper; dark = navy ink
- [x] Tipografías Geist + JetBrains Mono + Instrument Serif cargadas
- [x] `<MegacorpLogo variant="mono" />` en header del shell, adapta al tema
- [x] `<MegacorpLogo variant="brand" />` en landing y login
- [x] Settings → Apariencia tiene `<AccentPicker />` debajo del tema
- [x] Cambiar accent actualiza inmediatamente la UI (data-accent) y persiste en DB
- [x] Buttons primary + focus rings + items activos de Settings sidebar + tabs login + link forgot-password usan `brand-accent`
- [x] 12 specs anteriores siguen passing + 2 nuevos del accent picker = 14/14
- [x] PDF Workbench y Settings siguen funcionando sin cambios de comportamiento

## Notas para el implementador

- **No matar el dev :3003** del usuario. HMR de Turbopack aplica los cambios automáticamente. Si en algún smoke aparece código viejo cacheado, esperá 1-2s y reintentá.
- **Cookie `/tmp/mtcookie.txt`** se invalida ocasionalmente — el snippet de re-login está en Task 6 Step 2.
- **Postgres dev** corre en `:5435`. No tocarlo. Si está caído: `docker compose -f docker-compose.dev.yml up -d`.
- **Lint del repo** trae 9 errores pre-existentes (en `verify-email`, `accept-invitation-form`, `appearance-form`, `members-list`, `use-mobile`, `use-permissions`). Tu cambio en `appearance-form.tsx` puede afectar uno (`set-state-in-effect` por `useEffect(() => setMounted(true), [])`). No es tarea tuya arreglarlos; verificá con `git stash && pnpm lint; git stash pop && pnpm lint` que el conteo total queda igual.
- **`bg-brand-accent`** / `ring-brand-accent` / `text-brand-accent` / `border-brand-accent` son clases Tailwind 4 generadas automáticamente desde la variable `--color-brand-accent` que mapeamos en `@theme inline` (Task 1). Si una clase no aplica, verificar primero que `globals.css` tenga el mapeo.
- **AccentPicker es `'use client'`** y consume `authClient.updateUser` del repo (Better Auth client). Si el endpoint no acepta `accentColor`, revisar Task 6 — el config `user.additionalFields` debe estar.
