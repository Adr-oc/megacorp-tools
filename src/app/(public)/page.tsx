import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileSignature,
  Image,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'

import { MegacorpLogo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'

const tools = [
  {
    icon: FileSignature,
    title: 'Firmas corporativas',
    description: 'Plantillas por organización, datos guardados y copia lista para correo.',
  },
  {
    icon: Wrench,
    title: 'PDF Workbench',
    description: 'Utilidades para juntar, dividir y preparar documentos internos.',
  },
  {
    icon: Image,
    title: 'Imágenes',
    description: 'Conversiones rápidas sin depender de servicios externos al flujo.',
  },
  {
    icon: QrCode,
    title: 'QR y utilidades',
    description: 'Pequeñas herramientas operativas, centralizadas y con permisos.',
  },
]

const stats = [
  ['Acceso', 'por invitación'],
  ['Organización', 'multi-empresa'],
  ['Estado', 'preproducción'],
]

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,color-mix(in_oklab,var(--brand-accent)_28%,transparent),transparent_28%),radial-gradient(circle_at_82%_18%,color-mix(in_oklab,var(--foreground)_12%,transparent),transparent_30%),linear-gradient(135deg,transparent_0%,color-mix(in_oklab,var(--brand-accent)_8%,transparent)_45%,transparent_72%)]" />

        <header className="flex items-center justify-between rounded-2xl border bg-card/75 px-4 py-3 shadow-sm backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3" aria-label="MegaTools">
            <MegacorpLogo variant="brand" size={40} />
            <div>
              <p className="text-sm font-semibold leading-none">MegaTools</p>
              <p className="text-xs text-muted-foreground">MEGACORP internal suite</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border bg-muted/60 px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
              Preproducción
            </span>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Entrar
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/75 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <ShieldCheck className="size-3.5 text-brand-accent" />
              Portal privado · herramientas operativas · sin ruido
            </div>

            <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              La caja de herramientas interna de MEGACORP.
            </h1>

            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              Un punto único para resolver tareas de oficina: firmas, PDFs, imágenes, QR y
              utilidades pequeñas que no deberían vivir desperdigadas en veinte pestañas.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" className="px-4">
                  Iniciar sesión
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/accept-invitation">
                <Button variant="outline" size="lg" className="px-4">
                  Abrir invitación
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-3 overflow-hidden rounded-2xl border bg-card/70 shadow-sm backdrop-blur">
              {stats.map(([label, value]) => (
                <div key={label} className="border-r p-4 last:border-r-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand-accent/10 blur-2xl" />
            <div className="rounded-[1.75rem] border bg-card/85 p-3 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
              <div className="rounded-[1.25rem] border bg-background/70 p-4">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Panel operativo</p>
                    <p className="text-xs text-muted-foreground">Herramientas según organización y rol.</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-accent px-2.5 py-1 text-xs font-medium text-brand-accent-foreground">
                    <BadgeCheck className="size-3" /> listo
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {tools.map((tool) => (
                    <div
                      key={tool.title}
                      className="group rounded-xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-accent/40 hover:shadow-md"
                    >
                      <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-brand-accent/12 text-brand-accent">
                        <tool.icon className="size-5" />
                      </div>
                      <p className="text-sm font-semibold">{tool.title}</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{tool.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <LockKeyhole className="mb-3 size-4 text-brand-accent" />
                    <p className="text-sm font-medium">Acceso controlado</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Cada usuario entra por invitación y define su propia contraseña.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <Building2 className="mb-3 size-4 text-brand-accent" />
                    <p className="text-sm font-medium">Multi-organización</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Pensado para MEGACORP y empresas afiliadas. Orden, al fin.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 left-6 right-6 hidden rounded-2xl border bg-card/90 p-3 shadow-lg backdrop-blur md:block">
              <div className="flex items-center gap-3 text-sm">
                <Sparkles className="size-4 text-brand-accent" />
                <span className="font-medium">Siguiente:</span>
                <span className="text-muted-foreground">más herramientas internas, menos trabajo manual repetido.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
