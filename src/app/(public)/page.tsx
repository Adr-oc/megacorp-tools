import Link from 'next/link'
import { ArrowRight, FileSignature, Image, QrCode, ShieldCheck, Wrench } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MegacorpLogo } from '@/components/brand/logo'

const tools = [
  { icon: FileSignature, label: 'Firmas y PDFs' },
  { icon: Image, label: 'Imágenes' },
  { icon: QrCode, label: 'Códigos QR' },
  { icon: Wrench, label: 'Utilidades internas' },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklab,var(--brand-accent)_24%,transparent),transparent_30%),radial-gradient(circle_at_80%_20%,color-mix(in_oklab,var(--foreground)_10%,transparent),transparent_28%)]" />

        <header className="flex items-center justify-between rounded-2xl border bg-card/70 px-4 py-3 shadow-sm backdrop-blur">
          <Link href="/" className="flex items-center gap-3" aria-label="MegaTools">
            <MegacorpLogo variant="brand" size={36} />
            <div>
              <p className="text-sm font-semibold leading-none">MegaTools</p>
              <p className="text-xs text-muted-foreground">MEGACORP</p>
            </div>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Entrar
            </Button>
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <ShieldCheck className="size-3.5 text-brand-accent" />
              Portal interno · acceso por invitación
            </div>
            <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Herramientas de oficina, sin circo.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
              MegaTools concentra utilidades operativas de MEGACORP: PDFs, firmas,
              imágenes, QR y pequeñas automatizaciones para resolver trabajo real sin
              abrir quince pestañas.
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
                  Tengo una invitación
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand-accent/10 blur-2xl" />
            <div className="rounded-[1.75rem] border bg-card/85 p-3 shadow-2xl shadow-foreground/10 backdrop-blur">
              <div className="rounded-[1.25rem] border bg-background/60 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Panel de herramientas</p>
                    <p className="text-xs text-muted-foreground">Rápido, privado, organizado.</p>
                  </div>
                  <span className="rounded-full bg-brand-accent px-2.5 py-1 text-xs font-medium text-brand-accent-foreground">
                    activo
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {tools.map((tool) => (
                    <div key={tool.label} className="rounded-xl border bg-card p-4 shadow-sm">
                      <tool.icon className="mb-5 size-5 text-brand-accent" />
                      <p className="text-sm font-medium">{tool.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Disponible según tu organización y rol.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
