import Link from 'next/link'
import {
  ArrowRight,
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
    description: 'Plantillas por empresa, datos guardados y copia lista para correo.',
  },
  {
    icon: Wrench,
    title: 'PDF Workbench',
    description: 'Unir, dividir y preparar documentos internos sin salir del portal.',
  },
  {
    icon: Image,
    title: 'Imágenes',
    description: 'Conversiones rápidas para trabajo operativo del día a día.',
  },
  {
    icon: QrCode,
    title: 'QR y utilidades',
    description: 'Pequeñas herramientas centralizadas con permisos por organización.',
  },
]

const stats = [
  { label: 'Acceso', value: 'por invitación' },
  { label: 'Empresas', value: 'multi-org' },
  { label: 'Ambiente', value: 'preproducción' },
]

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-[#050608] text-white">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_16%,rgba(216,169,58,0.22),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(80,92,130,0.18),transparent_26%),linear-gradient(180deg,#080a0f_0%,#050608_52%,#030405_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_72%)]" />
      <div className="absolute left-1/2 top-0 -z-10 h-[34rem] w-[70rem] -translate-x-1/2 rounded-full bg-brand-accent/10 blur-3xl" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="MegaTools">
          <MegacorpLogo variant="brand" size={38} />
          <div>
            <p className="text-sm font-semibold leading-none text-white">MegaTools</p>
            <p className="mt-1 text-xs text-white/45">MEGACORP internal suite</p>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55 backdrop-blur sm:inline-flex">
            Preproducción
          </span>
          <Link href="/login">
            <Button
              variant="outline"
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07] hover:text-white"
            >
              Entrar
            </Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100svh-5.75rem)] w-full max-w-7xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-24 lg:pt-4">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-white/65 shadow-2xl shadow-black/20 backdrop-blur">
            <ShieldCheck className="size-3.5 text-brand-accent" />
            Portal privado · herramientas operativas · sin ruido
          </div>

          <h1 className="max-w-4xl text-balance text-[clamp(3.25rem,7vw,7.7rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-white">
            La caja de herramientas interna de MEGACORP.
          </h1>

          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-white/58 sm:text-xl">
            Firmas, PDFs, imágenes, QR y automatizaciones pequeñas en un portal privado,
            ordenado por empresa y listo para trabajo real.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login">
              <Button size="lg" className="h-11 rounded-xl px-5 text-sm font-semibold shadow-2xl shadow-brand-accent/20">
                Iniciar sesión
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/accept-invitation">
              <Button
                variant="outline"
                size="lg"
                className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white hover:bg-white/[0.07] hover:text-white"
              >
                Abrir invitación
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-xl">
            {stats.map((item) => (
              <div key={item.label} className="border-r border-white/10 p-4 last:border-r-0">
                <p className="text-xs text-white/42">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-white/90">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[39rem] lg:mx-0 lg:justify-self-end">
          <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-brand-accent/10 blur-3xl" />
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#080a0f]/80 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.025] p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-white">Panel operativo</p>
                  <p className="mt-1 text-sm text-white/45">Herramientas según organización y rol.</p>
                </div>
                <span className="rounded-full bg-brand-accent px-3 py-1.5 text-xs font-semibold text-brand-accent-foreground">
                  listo
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {tools.map((tool) => (
                  <div
                    key={tool.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-brand-accent/35 hover:bg-white/[0.045]"
                  >
                    <div className="mb-7 flex size-10 items-center justify-center rounded-xl bg-brand-accent/12 text-brand-accent">
                      <tool.icon className="size-5" />
                    </div>
                    <p className="text-sm font-semibold text-white">{tool.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/48">{tool.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <LockKeyhole className="mb-4 size-4 text-brand-accent" />
                  <p className="text-sm font-semibold text-white">Acceso controlado</p>
                  <p className="mt-2 text-sm leading-6 text-white/48">
                    Cada usuario entra por invitación y define su propia contraseña.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <Building2 className="mb-4 size-4 text-brand-accent" />
                  <p className="text-sm font-semibold text-white">Multi-organización</p>
                  <p className="mt-2 text-sm leading-6 text-white/48">
                    Pensado para MEGACORP y afiliadas. Menos caos, más sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto -mt-5 w-[88%] rounded-2xl border border-white/10 bg-[#090b10]/95 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-sm">
              <Sparkles className="size-4 shrink-0 text-brand-accent" />
              <span className="font-semibold text-white">Siguiente:</span>
              <span className="text-white/50">más herramientas internas, menos trabajo manual repetido.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
