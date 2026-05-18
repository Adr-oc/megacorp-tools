# MegaTools — Sprint 2.A · Foundation visual + Accent por usuario

> Brainstormeado y aprobado el 2026-05-16. Source: `docs/brand/2026-05-megatools-brief-v1.html`.
> Próximo paso: writing-plans.

## Objetivo

Refresh visual completo del portal sin cambiar layouts ni funcionalidad:

1. **Paletas + tipografías nuevas** alineadas al brief (cream paper en light, navy en dark, Geist + JetBrains Mono + Instrument Serif para hero).
2. **Sistema de logo de 3 variantes** (brand a color para marketing; mono light y mono dark adaptativos al theme) como componente React con SVG inline.
3. **Accent color por usuario** con 6 presets, persistido en DB, aplicado en CSS via data-attribute. Cubre botones primarios, focus rings, estados activos de navegación y links.
4. **AccentPicker** disponible en Settings → Apariencia (en Sprint 2.B se monta también en el paso 2 del onboarding).

Los layouts existentes (header simple, home grid, settings sub-sidebar, PDF Workbench) **no cambian**. Eso es Sprint 2.C.

## Decisiones cerradas en brainstorming

| Decisión | Valor |
|---|---|
| Background light mode | **Cream paper en todo el portal** (#F5F1EA). Surfaces internas (cards, dialogs, inputs) siguen blancas para contrastar. |
| Background dark mode | Navy / ink (#0D0F13 base, #15171C surfaces). Refresh sobre el actual. |
| Scope de aplicación del accent en este sprint | **Botones primarios + focus rings + estados activos de navegación + links de texto** (las 4 opciones). |
| Tipografías | Geist (sans, ya instalado) + JetBrains Mono (mono, nuevo) + Instrument Serif (italic, hero). Todas vía `next/font` para auto-self-hosting. |
| Logo system | Componente React `<MegacorpLogo />` con prop `variant: 'brand' \| 'mono'`. La variante `mono` lee CSS variables del tema (4 cuadrantes + stroke) — un solo SSR-friendly source de verdad. |
| Persistencia del accent | Columna `accent_color` en `user` (Better Auth), default `'mustard'`. |
| Endpoint update | Better Auth `update-user` con additional fields (ya soportado en v1.6). |
| 6 presets | Mustard `#C9961B` (default) · Sienna `#C24A3C` · Forest `#2F6B4E` · Lake `#2A6FDB` · Plum `#7B3F8C` · Slate `#475569` |
| AccentPicker | Componente standalone reusable. Vive en Settings → Apariencia; preparado para reuso en onboarding (2.B). |
| Aplicación del accent al SSR | `<html data-accent="${user.accentColor}">` para evitar flash. La CSS define los colores por preset. |

## Arquitectura técnica

**CSS tokens** (refresh completo de `src/app/globals.css`):

```css
:root {
  /* Light theme — cream paper */
  --background: oklch(0.96 0.012 80);     /* #F5F1EA cream */
  --foreground: oklch(0.15 0.012 270);    /* #15171C ink */
  --card: oklch(1 0 0);                    /* white surfaces */
  --card-foreground: var(--foreground);
  --muted: oklch(0.88 0.012 80);
  --muted-foreground: oklch(0.5 0.012 80); /* #8A857B */
  --border: oklch(0.86 0.018 80);          /* #D8D1C2 hairline */
  /* ...resto de tokens... */

  /* Accent — sobrescrito por [data-accent="..."] */
  --accent: oklch(0.7 0.13 75);            /* Mustard default */
  --accent-foreground: oklch(0.15 0 0);    /* ink sobre mustard */

  /* Logo mono — 4 cuadrantes + stroke */
  --logo-q1: #15171C;
  --logo-q2: #2D3138;
  --logo-q3: #7E7B73;
  --logo-q4: #C9C5B7;
  --logo-stroke: #15171C;
}

.dark {
  --background: oklch(0.12 0.015 265);     /* #0D0F13 navy ink */
  --foreground: oklch(0.95 0.005 80);
  --card: oklch(0.16 0.015 265);
  /* ...resto... */

  --logo-q1: #F1ECDF;
  --logo-q2: #D5CFBE;
  --logo-q3: #8F8B7E;
  --logo-q4: #4A4D55;
  --logo-stroke: #F1ECDF;
}

[data-accent="mustard"]  { --accent: oklch(0.7 0.13 75);    --accent-foreground: #15171C; }
[data-accent="sienna"]   { --accent: oklch(0.6 0.16 30);    --accent-foreground: #ffffff; }
[data-accent="forest"]   { --accent: oklch(0.48 0.09 155);  --accent-foreground: #ffffff; }
[data-accent="lake"]     { --accent: oklch(0.55 0.18 250);  --accent-foreground: #ffffff; }
[data-accent="plum"]     { --accent: oklch(0.46 0.13 320);  --accent-foreground: #ffffff; }
[data-accent="slate"]    { --accent: oklch(0.45 0.04 250);  --accent-foreground: #ffffff; }
```

**Tipografías** (`src/app/layout.tsx`):

```ts
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', style: 'italic', variable: '--font-serif' })
```

Geist Mono actual se reemplaza por JetBrains Mono. Instrument Serif italic es la del hero ("Hola, *Pedro*." y "Elegí tu *accent*.").

**Aplicación del accent server-side** (`src/app/(app)/layout.tsx`):

```tsx
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  // ...
  const accent = (session.user as { accentColor?: string }).accentColor ?? 'mustard'
  return (
    // El <html data-accent="..."> se setea desde un wrapper en este layout via cliente,
    // O bien lo bajamos al root layout server con la session ya leída.
    <div data-accent={accent} className="min-h-screen flex flex-col">
      {/* resto */}
    </div>
  )
}
```

**Decisión:** ponemos `data-accent` en un div wrapper del shell autenticado (no en `<html>` que es server-side rendered desde `src/app/layout.tsx` sin acceso a session). Eso evita el flash sin tener que hacer una server action en root. Las CSS variables `[data-accent="..."]` aplican en cascada a sus hijos.

## Estructura de archivos

```
NUEVOS:
src/components/brand/
├── logo.tsx                    # <MegacorpLogo variant="brand"|"mono" size={n} />
└── logo.module.css             # opcional, fallback estilos

src/components/settings/
└── accent-picker.tsx           # 6 swatches + selección actual + endpoint update

src/lib/accent/
├── presets.ts                  # ACCENT_PRESETS + tipo AccentColor
└── update.ts                   # client helper: PATCH a Better Auth update-user

drizzle/
└── 0001_accent_color.sql       # ALTER user ADD accent_color text DEFAULT 'mustard'

tests/e2e/
└── accent-picker.spec.ts       # cambiar accent persiste tras reload

MODIFICADOS:
src/app/globals.css             # tokens OKLCH refresh + variantes accent + logo
src/app/layout.tsx              # next/font con JetBrains Mono + Instrument Serif
src/app/(app)/layout.tsx        # wrap con data-accent del user, swap logo del header
src/app/(public)/layout.tsx     # serif disponible para hero del landing/login
src/app/(public)/login/page.tsx # logo refresh (variant brand)
src/app/(public)/page.tsx       # logo refresh (variant brand)
src/components/theme-toggle.tsx # sin cambios funcionales, solo verificar contraste
src/lib/db/schema/auth.ts       # accent_color column en user
src/lib/auth/server.ts          # registrar accent_color en additionalFields del user model
src/components/settings/appearance-form.tsx  # incluir <AccentPicker /> debajo del Theme select
README.md                       # nota breve del brief
```

## Detalle: componente Logo

```tsx
// src/components/brand/logo.tsx
'use client'  // NO necesario; es server-renderable

type LogoVariant = 'brand' | 'mono'

const BRAND_COLORS = {
  q1: '#D4A017',
  q2: '#0F1B3D',
  q3: '#B5AC9E',
  q4: '#9F968A',
  stroke: 'rgba(15,27,61,0.55)',
  strokeWidth: 1.5,
}

type Props = { variant?: LogoVariant; size?: number; className?: string; title?: string }

export function MegacorpLogo({ variant = 'mono', size = 40, className, title = 'MEGACORP' }: Props) {
  const c = variant === 'brand'
    ? BRAND_COLORS
    : { q1: 'var(--logo-q1)', q2: 'var(--logo-q2)', q3: 'var(--logo-q3)', q4: 'var(--logo-q4)', stroke: 'var(--logo-stroke)', strokeWidth: 2.5 }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={title} className={className}>
      {/* Cuadrantes */}
      <path d="M50 6 a44 44 0 0 1 44 44 H50 Z" fill={c.q1} />
      <path d="M50 50 H94 a44 44 0 0 1 -44 44 Z" fill={c.q2} />
      <path d="M50 50 H6 a44 44 0 0 0 44 44 Z" fill={c.q3} />
      <path d="M50 6 a44 44 0 0 0 -44 44 H50 Z" fill={c.q4} />
      {/* Meridianos */}
      <circle cx="50" cy="50" r="44" fill="none" stroke={c.stroke} strokeWidth={c.strokeWidth} />
      <line x1="6" y1="50" x2="94" y2="50" stroke={c.stroke} strokeWidth={c.strokeWidth} />
      <line x1="50" y1="6" x2="50" y2="94" stroke={c.stroke} strokeWidth={c.strokeWidth} />
    </svg>
  )
}
```

**Reemplazo en el portal:**

- `(app)/layout.tsx` header → `<MegacorpLogo variant="mono" size={28} />`
- `(public)/page.tsx` landing → `<MegacorpLogo variant="brand" size={96} />`
- `(public)/login/page.tsx` → `<MegacorpLogo variant="brand" size={64} />`
- Sin cambios al `public/mega_logo.svg` actual — el archivo queda como referencia histórica, los nuevos usos van por el componente. Eventualmente lo borramos.

## Detalle: AccentPicker

```tsx
// src/components/settings/accent-picker.tsx
'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { ACCENT_PRESETS, type AccentColor } from '@/lib/accent/presets'

export function AccentPicker({ value, onChange }: { value: AccentColor; onChange: (v: AccentColor) => void | Promise<void> }) {
  const [optimistic, setOptimistic] = useState<AccentColor>(value)
  const [pending, startTransition] = useTransition()

  function choose(next: AccentColor) {
    setOptimistic(next)
    // Aplicar al DOM inmediatamente para feedback visual
    const root = document.querySelector('[data-accent]') ?? document.documentElement
    if (root instanceof HTMLElement) root.dataset.accent = next
    startTransition(async () => {
      try {
        await onChange(next)
      } catch {
        setOptimistic(value)
        if (root instanceof HTMLElement) root.dataset.accent = value
        toast.error('No se pudo guardar el color')
      }
    })
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Color</label>
      <div className="flex flex-wrap gap-3">
        {ACCENT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => choose(preset.id)}
            disabled={pending}
            className="group flex flex-col items-center gap-1"
            aria-label={preset.label}
          >
            <span
              className="h-12 w-12 rounded-md border-2 flex items-center justify-center transition"
              style={{
                backgroundColor: preset.hex,
                borderColor: optimistic === preset.id ? 'var(--foreground)' : 'transparent',
              }}
            >
              {optimistic === preset.id && <Check className="h-5 w-5 text-white drop-shadow" />}
            </span>
            <span className="text-xs">{preset.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Tu color acompaña botones, foco, estados activos y links en todo el portal.
      </p>
    </div>
  )
}
```

```ts
// src/lib/accent/presets.ts
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
```

```ts
// src/lib/accent/update.ts
'use client'

import { authClient } from '@/lib/auth/client'
import type { AccentColor } from './presets'

export async function updateUserAccent(accent: AccentColor): Promise<void> {
  const res = await authClient.updateUser({ accentColor: accent } as never)
  if (res.error) throw new Error(res.error.message ?? 'No se pudo actualizar el color')
}
```

(El cast `as never` es porque Better Auth tipa updateUser sólo con campos conocidos; el additional field se acepta en runtime.)

## Detalle: migración Drizzle

```ts
// src/lib/db/schema/auth.ts — agregar a la tabla user
accentColor: text('accent_color').notNull().default('mustard'),
```

Migración generada: `pnpm db:generate` → produce `drizzle/0001_*.sql` con el ALTER. Después `pnpm db:migrate`.

**Better Auth registro:**

```ts
// src/lib/auth/server.ts — agregar al config
user: {
  additionalFields: {
    accentColor: {
      type: 'string',
      defaultValue: 'mustard',
      required: false,
      input: true,  // permite cliente actualizarlo via update-user
    },
  },
},
```

## Aplicación del accent en componentes

Tailwind 4 con tokens: el `theme.css` o equivalente expone `bg-accent`, `text-accent`, `ring-accent`, `border-accent` mapeados a `var(--accent)`.

**Targets concretos a actualizar:**

| Componente | Cambio |
|---|---|
| `Button` (shadcn) variant `default` | `bg-primary` → `bg-accent`, `text-primary-foreground` → `text-accent-foreground` |
| `Input` focus ring | `focus-visible:ring-ring` → `focus-visible:ring-accent` |
| `Button` ring (focus) | idem |
| Tab activa de `Tabs` | borde inferior usa accent |
| Item activo en sidebar Settings | borde izquierdo + texto usan accent |
| Link de `<a>` en prose / FormDescription | `text-accent underline-offset-2` |

**No actualizamos en este sprint:** badges del PDF Workbench (son por PDF, identifican origen — distinto eje), iconos genéricos, indicadores de estado (success/error/warning siguen con verde/rojo/amber semánticos).

## Tipografías — uso

| Variable CSS | Token Tailwind | Uso |
|---|---|---|
| `--font-sans` (Geist) | `font-sans` (default) | Todo el body, UI, labels |
| `--font-mono` (JetBrains Mono) | `font-mono` | Eyebrows (`TU CUENTA`, `BIENVENIDA A BORDO`), código, tabular |
| `--font-serif` (Instrument Serif italic) | `font-serif` | Solo hero del onboarding y secciones de marketing — uso muy puntual |

## Tests E2E

`tests/e2e/accent-picker.spec.ts`:

1. **Cambiar accent persiste tras reload**: admin login → Settings → Apariencia → click "Forest" → ver swatch con check → reload → verificar que sigue siendo Forest (el `data-accent` attribute) y que la DB tiene `accent_color = 'forest'`.

2. **Default mustard para usuarios sin valor**: crear un user vía bootstrap (sin pasar accent), login, ir a `/app`, verificar `data-accent="mustard"` y que el bg de un botón primario tiene la cor de Mustard (vía `getComputedStyle`).

Sin tests adicionales — el resto se valida vía smoke manual + suite existente que sigue pasando.

## Routing & permisos

Sin cambios. `accent_color` es del user, no del org. Accesible para todos los roles.

## Fuera de scope (explícito)

- **Sidebar contextual nuevo** → Sprint 2.C
- **Topbar con ⌘K + help button + breadcrumbs** → Sprint 2.C
- **Onboarding flow** (3 pasos) → Sprint 2.B (consume el AccentPicker construido acá)
- **Landing pública nueva** (más allá de cambiar el logo a brand variant) → Sprint 2.D
- **Refactor del PDF Workbench, Settings layout, etc.** al nuevo shell → Sprint 2.C
- **Badges de PDF de color "respeta accent"** — los badges del workbench identifican PDFs, son ortogonales al accent

## Definición de hecho

- [x] `pnpm tsc --noEmit` y `pnpm lint` pasan en cero issues nuevos
- [x] Migración `0001_accent_color.sql` aplicada limpiamente en local
- [x] Background del portal en light mode es cream paper #F5F1EA
- [x] Background en dark mode es navy ink
- [x] Tipos Geist + JetBrains Mono + Instrument Serif cargados vía `next/font`
- [x] `<MegacorpLogo variant="mono" />` aparece en header del shell autenticado adaptándose al tema
- [x] `<MegacorpLogo variant="brand" />` reemplaza el SVG actual en landing y login
- [x] Settings → Apariencia tiene `<AccentPicker />` debajo del Theme select
- [x] Cambiar el accent actualiza inmediatamente la UI (optimistic) y persiste en DB
- [x] Botones primarios, focus rings, items activos de nav y links de texto usan `var(--accent)`
- [x] 12 specs E2E previos siguen pasando + 2 nuevos del AccentPicker
- [x] PDF Workbench y Settings siguen funcionando sin cambios funcionales
