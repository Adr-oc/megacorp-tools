# MegaTools — Fase 2: Auth UI + Onboarding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la capa visual y los flujos de autenticación end-to-end: una persona invitada recibe email, acepta invitación, define contraseña, verifica email, hace login (email+password o magic link), y aterriza en un shell autenticado. También: forgot/reset password.

**Architecture:** UI con shadcn/ui (CLI v4) sobre Tailwind 4. Theme provider con next-themes. Layouts separados para rutas públicas (`(public)`) y autenticadas (`(app)`). Gating de rutas autenticadas en `proxy.ts` (Next.js 16). Email transaccional con Resend reemplazando los `console.log` stub de Fase 1.

**Tech Stack añadido:** shadcn/ui (CLI v4), next-themes, lucide-react (íconos), sonner (toasts), react-hook-form + @hookform/resolvers/zod, resend.

**Definición de hecho de la fase:**
- Visitar `/` muestra landing minimalista con CTA "Iniciar sesión"
- Visitar `/login` muestra formulario; sign-in con superadmin redirige a `/app`
- `pnpm dev` + invitar usuario por API o via UI futura genera email REAL enviado via Resend
- Aceptar invitación → set password → verify email → login funciona
- `/app` muestra shell autenticado con placeholder ("Apps próximamente")
- `proxy.ts` redirige correctamente: `/app/*` sin sesión → `/login`, `/login` con sesión → `/app`
- Modo claro/oscuro con toggle
- Tests Playwright del golden path (invitar → aceptar → login → ver app)

---

## Estructura de archivos creados/modificados en esta fase

```
megacorp-tools/
├── proxy.ts                                    Auth gating (NUEVO en Fase 2)
├── components.json                             Config de shadcn/ui (NUEVO)
├── src/
│   ├── app/
│   │   ├── layout.tsx                          MODIFICAR: theme provider + sonner
│   │   ├── page.tsx                            MODIFICAR: landing real (era placeholder)
│   │   ├── (public)/
│   │   │   ├── layout.tsx                      NUEVO: header simple
│   │   │   ├── login/page.tsx                  NUEVO
│   │   │   ├── forgot-password/page.tsx        NUEVO
│   │   │   ├── reset-password/page.tsx         NUEVO
│   │   │   ├── accept-invitation/page.tsx      NUEVO
│   │   │   └── verify-email/page.tsx           NUEVO
│   │   └── (app)/
│   │       ├── layout.tsx                      NUEVO: shell autenticado
│   │       └── page.tsx                        NUEVO: home placeholder
│   ├── components/
│   │   ├── ui/                                 NUEVO: shadcn/ui copiados
│   │   ├── theme-provider.tsx                  NUEVO
│   │   ├── theme-toggle.tsx                    NUEVO
│   │   └── auth/
│   │       ├── login-form.tsx                  NUEVO
│   │       ├── magic-link-form.tsx             NUEVO
│   │       ├── forgot-password-form.tsx        NUEVO
│   │       ├── reset-password-form.tsx         NUEVO
│   │       └── accept-invitation-form.tsx      NUEVO
│   └── lib/
│       ├── auth/
│       │   └── server.ts                       MODIFICAR: integrar Resend
│       ├── email/
│       │   ├── client.ts                       NUEVO: Resend client
│       │   └── templates/                      NUEVO
│       │       ├── verification.tsx            NUEVO
│       │       ├── invitation.tsx              NUEVO
│       │       └── password-reset.tsx          NUEVO
│       └── env.ts                              MODIFICAR: hacer RESEND_API_KEY required
└── tests/
    └── e2e/
        ├── playwright.config.ts                NUEVO
        └── invitation-flow.spec.ts             NUEVO
```

---

## Task 1: Inicializar shadcn/ui CLI v4

**Files:**
- Create: `components.json`
- Create: `src/components/ui/*` (button, input, label, card, form, sonner, etc.)

- [ ] **Step 1: Inicializar shadcn**

```bash
pnpm dlx shadcn@latest init -y
```

Si el comando pregunta opciones, usar defaults:
- Style: `default`
- Base color: `slate`
- CSS variables: yes

Expected: crea `components.json` en raíz + actualiza `src/app/globals.css` con variables de tema.

- [ ] **Step 2: Instalar componentes base de UI**

```bash
pnpm dlx shadcn@latest add -y button input label card form dropdown-menu avatar dialog tabs separator skeleton sonner alert
```

Expected: crea archivos en `src/components/ui/`. Genera dependencias necesarias (radix, etc.).

- [ ] **Step 3: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

Expected: sin errores. Si fallara por `next-themes` faltando (sonner lo pide), instalarlo en Task 2.

- [ ] **Step 4: Commit**

```bash
git add components.json src/components/ui src/app/globals.css package.json pnpm-lock.yaml
git commit -m "feat(fase-2): inicializar shadcn/ui con componentes base"
```

---

## Task 2: Theme provider con next-themes

**Files:**
- Create: `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Instalar next-themes**

```bash
pnpm add next-themes
```

- [ ] **Step 2: Crear `src/components/theme-provider.tsx`**

```tsx
'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

- [ ] **Step 3: Crear `src/components/theme-toggle.tsx`**

```tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>Claro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Oscuro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>Sistema</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 4: Modificar `src/app/layout.tsx`**

Reemplazar el body con:

```tsx
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

// ... (mantener metadata y fonts existentes)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

(Adaptá imports y className a lo que ya hay en `layout.tsx`. No removas fonts ni metadata pre-existente.)

- [ ] **Step 5: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components src/app/layout.tsx package.json pnpm-lock.yaml
git commit -m "feat(fase-2): theme provider con next-themes y toggle"
```

---

## Task 3: Landing pública minimalista

**Files:**
- Create: `src/app/(public)/layout.tsx`
- Modify: `src/app/page.tsx` (mover contenido a `src/app/(public)/page.tsx`)

- [ ] **Step 1: Crear `src/app/(public)/layout.tsx`**

```tsx
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            MegaTools
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Mover `src/app/page.tsx` a `src/app/(public)/page.tsx`**

```bash
mkdir -p src/app/\(public\)
git mv src/app/page.tsx src/app/\(public\)/page.tsx
```

- [ ] **Step 3: Reemplazar contenido con landing real**

Sobreescribir `src/app/(public)/page.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <section className="container mx-auto px-4 py-24 max-w-2xl text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-4">MegaTools</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Portal de herramientas internas del grupo MEGACORP.
      </p>
      <Button asChild size="lg">
        <Link href="/login">Iniciar sesión</Link>
      </Button>
    </section>
  )
}
```

- [ ] **Step 4: Smoke test — Next.js arranca y landing se ve**

```bash
pnpm dev &
sleep 8
curl -s http://localhost:3000/ | grep -o "MegaTools" | head -1
```

Expected: `MegaTools` (la palabra aparece en HTML).

Detener `pnpm dev`.

- [ ] **Step 5: Commit**

```bash
git add src/app
git commit -m "feat(fase-2): landing pública minimalista en (public) route group"
```

---

## Task 4: Shell autenticado (`(app)` layout)

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`

- [ ] **Step 1: Crear `src/app/(app)/layout.tsx`**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/auth/user-menu'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/login')
  }

  if (!session.user.emailVerified) {
    redirect('/verify-email-pending')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/app" className="font-semibold text-lg">
            MegaTools
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu user={session.user} />
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/components/auth/user-menu.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth/client'

export function UserMenu({ user }: { user: { email: string; name?: string | null } }) {
  const router = useRouter()
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase()

  async function handleLogout() {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-sm font-medium">{user.name ?? 'Usuario'}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 3: Crear `src/app/(app)/page.tsx`**

```tsx
export default function AppHomePage() {
  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Bienvenido a MegaTools</h1>
      <p className="text-muted-foreground">
        Las herramientas estarán disponibles próximamente. Por ahora, podés gestionar tu sesión desde el menú superior derecho.
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\) src/components/auth
git commit -m "feat(fase-2): shell autenticado con header y user menu"
```

---

## Task 5: Middleware de gating (`proxy.ts` para Next.js 16)

**Files:**
- Create: `proxy.ts` (en raíz, NO en src/)

- [ ] **Step 1: Crear `proxy.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation',
  '/verify-email',
  '/verify-email-pending',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = getSessionCookie(request)

  // Rutas API de Better Auth: sin gating, Better Auth maneja todo
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Rutas estáticas y de Next.js: sin gating
  if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
    return NextResponse.next()
  }

  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )

  // Sin sesión + ruta privada → /login
  if (!sessionCookie && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Con sesión + ruta pública de auth (login, accept-invitation, etc.) → /app
  // Excepción: /verify-email y /verify-email-pending son válidos con sesión
  const authPaths = ['/login', '/forgot-password', '/reset-password', '/accept-invitation']
  if (
    sessionCookie &&
    authPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (handled per-path in proxy itself)
     * - _next/static, _next/image
     * - favicon.ico, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}
```

- [ ] **Step 2: Smoke test — middleware se carga**

```bash
pnpm dev &
sleep 8
curl -sI http://localhost:3000/app 2>&1 | head -3
```

Expected: HTTP 307 (redirect) a `/login?redirect=/app`. Confirma que `proxy.ts` está activo.

Detener `pnpm dev`.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat(fase-2): proxy.ts para gating de rutas autenticadas"
```

---

## Task 6: Página de login (email+password + magic link)

**Files:**
- Create: `src/app/(public)/login/page.tsx`, `src/components/auth/login-form.tsx`, `src/components/auth/magic-link-form.tsx`

- [ ] **Step 1: Instalar react-hook-form**

```bash
pnpm add react-hook-form @hookform/resolvers
```

- [ ] **Step 2: Crear `src/components/auth/login-form.tsx`**

```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { authClient } from '@/lib/auth/client'

const schema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    })
    setIsLoading(false)

    if (error) {
      toast.error(error.message ?? 'No se pudo iniciar sesión')
      return
    }

    const redirectTo = searchParams.get('redirect') ?? '/app'
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tu@empresa.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Step 3: Crear `src/components/auth/magic-link-form.tsx`**

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
import { authClient } from '@/lib/auth/client'

const schema = z.object({
  email: z.email('Email inválido'),
})

type FormValues = z.infer<typeof schema>

export function MagicLinkForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const { error } = await authClient.signIn.magicLink({ email: values.email })
    setIsLoading(false)

    if (error) {
      toast.error(error.message ?? 'No se pudo enviar el enlace')
      return
    }

    setSent(true)
    toast.success('Revisá tu email')
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Te enviamos un enlace a tu email. Clickealo para ingresar.
      </p>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tu@empresa.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Enviando…' : 'Enviarme un enlace mágico'}
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Step 4: Crear `src/app/(public)/login/page.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoginForm } from '@/components/auth/login-form'
import { MagicLinkForm } from '@/components/auth/magic-link-form'

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="password">Contraseña</TabsTrigger>
              <TabsTrigger value="magic">Enlace mágico</TabsTrigger>
            </TabsList>
            <TabsContent value="password">
              <LoginForm />
              <p className="text-sm text-muted-foreground mt-4 text-center">
                <Link href="/forgot-password" className="underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </p>
            </TabsContent>
            <TabsContent value="magic">
              <MagicLinkForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Activar plugin magicLink en Better Auth**

Editar `src/lib/auth/server.ts`. Agregar el plugin `magicLink` dentro del array `plugins`:

```ts
import { magicLink, organization } from 'better-auth/plugins'

// dentro de betterAuth({ ... plugins: [
//   ...,
//   magicLink({
//     sendMagicLink: async ({ email, url }) => {
//       console.log(`[magic-link] to=${email} url=${url}`)
//     },
//   }),
// ] })
```

(El `sendMagicLink` se reemplaza por Resend en Task 11.)

Editar `src/lib/auth/client.ts`. Agregar plugin `magicLinkClient`:

```ts
import { magicLinkClient, organizationClient } from 'better-auth/client/plugins'

// plugins: [organizationClient(), magicLinkClient()],
```

- [ ] **Step 6: Smoke test — login funciona**

```bash
pnpm dev &
sleep 8
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/cookies.txt -s | head -c 200
```

Expected: JSON con `token` y `user`. Sin error.

Detener `pnpm dev` y `rm /tmp/cookies.txt`.

- [ ] **Step 7: Commit**

```bash
git add src/app src/components/auth src/lib/auth package.json pnpm-lock.yaml
git commit -m "feat(fase-2): página de login con email+password y magic link"
```

---

## Task 7: Páginas de forgot/reset password

**Files:**
- Create: `src/app/(public)/forgot-password/page.tsx`, `src/components/auth/forgot-password-form.tsx`, `src/app/(public)/reset-password/page.tsx`, `src/components/auth/reset-password-form.tsx`

- [ ] **Step 1: Crear `src/components/auth/forgot-password-form.tsx`**

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
import { authClient } from '@/lib/auth/client'

const schema = z.object({
  email: z.email('Email inválido'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const { error } = await authClient.forgetPassword({
      email: values.email,
      redirectTo: '/reset-password',
    })
    setIsLoading(false)

    if (error) {
      toast.error(error.message ?? 'No se pudo enviar el enlace')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Si existe una cuenta con ese email, te enviamos instrucciones para recuperar la contraseña.
      </p>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tu@empresa.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Enviando…' : 'Enviar enlace de recuperación'}
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Step 2: Crear `src/app/(public)/forgot-password/page.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Recuperar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Crear `src/components/auth/reset-password-form.tsx`**

```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { authClient } from '@/lib/auth/client'

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  })

type FormValues = z.infer<typeof schema>

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  if (!token) {
    return (
      <p className="text-sm text-destructive">
        Token inválido o ausente. Pedí un nuevo enlace de recuperación.
      </p>
    )
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token: token!,
    })
    setIsLoading(false)

    if (error) {
      toast.error(error.message ?? 'No se pudo restablecer la contraseña')
      return
    }

    toast.success('Contraseña actualizada. Iniciá sesión.')
    router.push('/login')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nueva contraseña</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar contraseña</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Actualizando…' : 'Establecer contraseña'}
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Step 4: Crear `src/app/(public)/reset-password/page.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Establecer nueva contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(public\)/forgot-password src/app/\(public\)/reset-password src/components/auth
git commit -m "feat(fase-2): páginas de forgot-password y reset-password"
```

---

## Task 8: Página de verify-email + verify-email-pending

**Files:**
- Create: `src/app/(public)/verify-email/page.tsx`, `src/app/(public)/verify-email-pending/page.tsx`

- [ ] **Step 1: Crear `src/app/(public)/verify-email/page.tsx`**

Better Auth provee un endpoint `/api/auth/verify-email?token=...` que se llama automáticamente. Esta página es la landing cuando el verify falla (token expirado, etc.).

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/client'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    authClient
      .verifyEmail({ query: { token } })
      .then((result) => {
        setStatus(result.error ? 'error' : 'success')
      })
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'pending' && 'Verificando email…'}
            {status === 'success' && 'Email verificado'}
            {status === 'error' && 'No pudimos verificar tu email'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'success' && (
            <Button asChild className="w-full">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          )}
          {status === 'error' && (
            <p className="text-sm text-muted-foreground">
              El enlace puede haber expirado. Iniciá sesión y pediremos un reenvío.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/app/(public)/verify-email-pending/page.tsx`**

Esta página se muestra cuando el usuario logueado aún no verificó email (redirección desde el layout autenticado).

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth/client'

export default function VerifyEmailPendingPage() {
  const [isLoading, setIsLoading] = useState(false)

  async function resend() {
    setIsLoading(true)
    const { error } = await authClient.sendVerificationEmail({
      email: '', // Better Auth lo toma de la sesión actual; ajustar si pide email explícito
      callbackURL: '/verify-email',
    })
    setIsLoading(false)
    if (error) {
      toast.error(error.message ?? 'No se pudo reenviar')
    } else {
      toast.success('Email reenviado')
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Verificá tu email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace al email con el que te registraste. Cliqueá el enlace para activar tu cuenta.
          </p>
          <Button onClick={resend} disabled={isLoading} className="w-full" variant="outline">
            {isLoading ? 'Reenviando…' : 'Reenviar email'}
          </Button>
        </CardContent>
      </Card>
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
git add src/app/\(public\)/verify-email src/app/\(public\)/verify-email-pending
git commit -m "feat(fase-2): páginas de verificación de email"
```

---

## Task 9: Página de accept-invitation

**Files:**
- Create: `src/app/(public)/accept-invitation/page.tsx`, `src/components/auth/accept-invitation-form.tsx`

- [ ] **Step 1: Crear `src/components/auth/accept-invitation-form.tsx`**

```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
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
import { authClient } from '@/lib/auth/client'

const schema = z
  .object({
    name: z.string().min(1, 'Requerido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  })

type FormValues = z.infer<typeof schema>

type InvitationInfo = {
  email: string
  organizationName: string
} | null

export function AcceptInvitationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [info, setInfo] = useState<InvitationInfo>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', password: '', confirm: '' },
  })

  useEffect(() => {
    if (!token) {
      setLoadingInfo(false)
      return
    }
    authClient.organization
      .getInvitation({ query: { id: token } })
      .then((result) => {
        if (result.data) {
          setInfo({
            email: result.data.email,
            organizationName: result.data.organizationName,
          })
        }
      })
      .finally(() => setLoadingInfo(false))
  }, [token])

  if (loadingInfo) {
    return <p className="text-sm text-muted-foreground">Cargando invitación…</p>
  }

  if (!token || !info) {
    return (
      <p className="text-sm text-destructive">
        Invitación inválida o expirada. Pedile a tu admin que te invite de nuevo.
      </p>
    )
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    // 1. Sign-up con email (Better Auth lo asociará a la invitación si los emails coinciden)
    const signUpResult = await authClient.signUp.email({
      email: info!.email,
      password: values.password,
      name: values.name,
    })

    if (signUpResult.error) {
      setIsLoading(false)
      toast.error(signUpResult.error.message ?? 'No se pudo crear la cuenta')
      return
    }

    // 2. Aceptar la invitación
    const acceptResult = await authClient.organization.acceptInvitation({
      invitationId: token!,
    })

    setIsLoading(false)

    if (acceptResult.error) {
      toast.error(acceptResult.error.message ?? 'No se pudo aceptar la invitación')
      return
    }

    toast.success('Revisá tu email para verificar la cuenta')
    router.push('/verify-email-pending')
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Te invitaron a unirte a <strong>{info.organizationName}</strong> con el email{' '}
        <strong>{info.email}</strong>.
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tu nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creando cuenta…' : 'Aceptar invitación'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/app/(public)/accept-invitation/page.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AcceptInvitationForm } from '@/components/auth/accept-invitation-form'

export default function AcceptInvitationPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Aceptar invitación</CardTitle>
        </CardHeader>
        <CardContent>
          <AcceptInvitationForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

Si TypeScript se queja del shape exacto de `authClient.organization.getInvitation` o `acceptInvitation`, ajustá según la doc oficial de Better Auth organization plugin. Las firmas pueden variar por versión.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/accept-invitation src/components/auth
git commit -m "feat(fase-2): página de accept-invitation con sign-up"
```

---

## Task 10: Validar `RESEND_API_KEY` y crear cliente

**Files:**
- Modify: `src/lib/env.ts`
- Create: `src/lib/email/client.ts`

- [ ] **Step 1: Instalar Resend**

```bash
pnpm add resend
```

- [ ] **Step 2: Modificar `src/lib/env.ts`** para hacer Resend required

```ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET debe tener al menos 32 caracteres'),
  BETTER_AUTH_URL: z.url(),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY es requerida en Fase 2+'),
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

- [ ] **Step 3: Crear `src/lib/email/client.ts`**

```ts
import { Resend } from 'resend'
import { env } from '@/lib/env'

export const resend = new Resend(env.RESEND_API_KEY)

export type SendArgs = {
  to: string
  subject: string
  react: React.ReactElement
}

export async function sendEmail({ to, subject, react }: SendArgs): Promise<void> {
  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    react,
  })
  if (result.error) {
    console.error('[email] error enviando:', result.error)
    throw new Error(`Falló envío de email: ${result.error.message}`)
  }
}
```

- [ ] **Step 4: Conseguir API key de Resend**

Para dev: crear cuenta en https://resend.com, crear API key, agregar al `.env`:

```
RESEND_API_KEY=re_...
EMAIL_FROM=onboarding@resend.dev
```

(`onboarding@resend.dev` es el dominio de pruebas que Resend permite usar sin verificar dominio propio. Para prod: configurar dominio propio.)

- [ ] **Step 5: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/lib/email package.json pnpm-lock.yaml
git commit -m "feat(fase-2): cliente Resend y env validation de claves de email"
```

---

## Task 11: Plantillas de email + reemplazar console.log en auth/server.ts

**Files:**
- Create: `src/lib/email/templates/{verification,invitation,password-reset,magic-link}.tsx`
- Modify: `src/lib/auth/server.ts`

- [ ] **Step 1: Instalar `@react-email/components`** (para plantillas)

```bash
pnpm add @react-email/components
```

- [ ] **Step 2: Crear `src/lib/email/templates/verification.tsx`**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

export function VerificationEmail({ url }: { url: string }) {
  return (
    <Html>
      <Head />
      <Preview>Verificá tu email para entrar a MegaTools</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 480, margin: '40px auto' }}>
          <Heading>Verificá tu email</Heading>
          <Text>Cliqueá el botón para activar tu cuenta en MegaTools.</Text>
          <Button
            href={url}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            Verificar email
          </Button>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 24 }}>
            Si no fuiste vos, ignorá este email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 3: Crear `src/lib/email/templates/invitation.tsx`**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

export function InvitationEmail({
  url,
  organizationName,
}: {
  url: string
  organizationName: string
}) {
  return (
    <Html>
      <Head />
      <Preview>Te invitaron a {organizationName} en MegaTools</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 480, margin: '40px auto' }}>
          <Heading>Te invitaron a {organizationName}</Heading>
          <Text>Aceptá la invitación para empezar a usar MegaTools.</Text>
          <Button
            href={url}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            Aceptar invitación
          </Button>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 24 }}>
            Esta invitación expira en 7 días.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 4: Crear `src/lib/email/templates/password-reset.tsx`**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

export function PasswordResetEmail({ url }: { url: string }) {
  return (
    <Html>
      <Head />
      <Preview>Restablecé tu contraseña en MegaTools</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 480, margin: '40px auto' }}>
          <Heading>Restablecé tu contraseña</Heading>
          <Text>Cliqueá para crear una nueva contraseña.</Text>
          <Button
            href={url}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            Restablecer contraseña
          </Button>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 24 }}>
            Si no fuiste vos, ignorá este email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 5: Crear `src/lib/email/templates/magic-link.tsx`**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

export function MagicLinkEmail({ url }: { url: string }) {
  return (
    <Html>
      <Head />
      <Preview>Tu enlace mágico para MegaTools</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 480, margin: '40px auto' }}>
          <Heading>Iniciá sesión</Heading>
          <Text>Cliqueá para entrar a MegaTools.</Text>
          <Button
            href={url}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            Iniciar sesión
          </Button>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 24 }}>
            El enlace expira en 1 hora.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 6: Modificar `src/lib/auth/server.ts`** para usar Resend

Reemplazar los `console.log` por llamadas a `sendEmail`:

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, organization } from 'better-auth/plugins'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/client'
import { env } from '@/lib/env'
import { InvitationEmail } from '@/lib/email/templates/invitation'
import { MagicLinkEmail } from '@/lib/email/templates/magic-link'
import { PasswordResetEmail } from '@/lib/email/templates/password-reset'
import { VerificationEmail } from '@/lib/email/templates/verification'

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
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Restablecé tu contraseña — MegaTools',
        react: PasswordResetEmail({ url }),
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verificá tu email — MegaTools',
        react: VerificationEmail({ url }),
      })
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: false,
      organizationLimit: 1,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      sendInvitationEmail: async ({ email, invitation, organization }) => {
        const url = `${env.BETTER_AUTH_URL}/accept-invitation?token=${invitation.id}`
        await sendEmail({
          to: email,
          subject: `Invitación a ${organization.name} — MegaTools`,
          react: InvitationEmail({ url, organizationName: organization.name }),
        })
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: 'Tu enlace para entrar — MegaTools',
          react: MagicLinkEmail({ url }),
        })
      },
    }),
  ],
  trustedOrigins: [env.BETTER_AUTH_URL],
})

export type Auth = typeof auth
```

- [ ] **Step 7: Smoke test — compila**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 8: Smoke test — invitar a un email genera envío real**

(Requiere `RESEND_API_KEY` real en `.env`.)

```bash
pnpm dev &
sleep 8

# Sign-in como admin
curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' \
  -c /tmp/cookies.txt

# Crear invitación (probar con un email real tuyo para verificar)
curl -X POST http://localhost:3000/api/auth/organization/invite-member \
  -H 'Content-Type: application/json' \
  -b /tmp/cookies.txt \
  -d '{"email":"TU_EMAIL@dominio.com","role":"member"}'
```

Expected: HTTP 200. Tu inbox debería recibir un email "Invitación a MEGACORP — MegaTools" en 1-2 minutos.

Detener `pnpm dev` y limpiar cookies.

- [ ] **Step 9: Commit**

```bash
git add src/lib/email src/lib/auth/server.ts package.json pnpm-lock.yaml
git commit -m "feat(fase-2): plantillas de email y envío real via Resend"
```

---

## Task 12: Tests E2E con Playwright

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/golden-path.spec.ts`

- [ ] **Step 1: Instalar Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Crear `playwright.config.ts`** en raíz

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
```

- [ ] **Step 3: Crear `tests/e2e/golden-path.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

// Test golden path: login con superadmin pre-creado → ver /app
test('superadmin puede iniciar sesión y ver el shell autenticado', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'MegaTools' })).toBeVisible()

  await page.getByRole('link', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.getByLabel('Contraseña').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Bienvenido a MegaTools' })).toBeVisible()
})

test('rutas autenticadas redirigen a /login sin sesión', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login/)
})

test('toggle de tema cambia clase del html', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  await expect(html).not.toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Cambiar tema' }).click()
  await page.getByRole('menuitem', { name: 'Oscuro' }).click()
  await expect(html).toHaveClass(/dark/)
})
```

- [ ] **Step 4: Agregar script de test a `package.json`**

```json
"test:e2e": "playwright test"
```

- [ ] **Step 5: Correr tests**

Asegurate que Postgres está corriendo (`docker compose -f docker-compose.dev.yml ps`).

```bash
pnpm test:e2e
```

Expected: 3 tests pasando.

Si fallan: ver `test-results/` y `playwright-report/`.

- [ ] **Step 6: Agregar `test-results/` y `playwright-report/` a `.gitignore`**

```
# playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

- [ ] **Step 7: Commit**

```bash
git add tests playwright.config.ts package.json pnpm-lock.yaml .gitignore
git commit -m "feat(fase-2): tests E2E del golden path con Playwright"
```

---

## Cierre de Fase 2

Al terminar todas las tareas:

- Landing pública en `/` con CTA de login
- Login con email+password y magic link (Tabs)
- Forgot/reset password funcional
- Verify email funcional (con Resend enviando emails reales)
- Accept invitation funcional
- Shell autenticado en `/app` con header, user menu, theme toggle
- `proxy.ts` redirige correctamente
- Tests E2E del golden path pasan

**Siguiente:** Fase 3 — Registry de apps + Home grid + Settings (perfil, organización, apariencia, notificaciones) + E2E adicional + Docker para producción.

## Notas de ejecución

- **Resend en dev:** se puede usar `onboarding@resend.dev` como `EMAIL_FROM` para pruebas. Para producción se requiere verificar un dominio propio.
- **Better Auth client API:** los nombres de métodos como `authClient.signIn.email`, `authClient.organization.getInvitation`, etc. pueden cambiar entre versiones. Si la firma exacta del plan no funciona, consultar https://better-auth.com/docs y ajustar — la lógica del flujo no cambia, solo las firmas.
- **proxy.ts vs middleware.ts:** Next.js 16 usa `proxy.ts` con la función exportada llamada `proxy` (no `middleware`). Si Better Auth o algún tutorial muestra `middleware.ts`, traducir.
- **Email verification UX:** después de aceptar invitación, el flujo ideal es: sign-up (crea user) → accept invitation (asocia a org) → verificación de email enviada → user va a `/verify-email-pending`. Aceptar el email lleva a `/verify-email` que llama al endpoint → login disponible.
