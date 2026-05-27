import Link from 'next/link'
import {
  ArrowRight,
  CircuitBoard,
  FileSignature,
  LockKeyhole,
  Sparkles,
  Wrench,
} from 'lucide-react'

import { MegacorpLogo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'

const trustItems = ['Privado', 'Multi-org', 'Preproducción']

const features = [
  {
    icon: FileSignature,
    title: 'Firmas listas',
    description: 'Plantillas corporativas con datos guardados para cada organización.',
  },
  {
    icon: Wrench,
    title: 'PDF e imágenes',
    description: 'Utilidades internas para preparar archivos sin cambiar de portal.',
  },
  {
    icon: LockKeyhole,
    title: 'Acceso por invitación',
    description: 'Entrada controlada para equipos, roles y empresas del grupo.',
  },
]

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-[#02030a] text-white">
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_50%_18%,rgba(142,92,255,0.32),transparent_30%),radial-gradient(circle_at_50%_0%,rgba(215,187,255,0.16),transparent_28%),radial-gradient(circle_at_14%_76%,rgba(35,196,219,0.12),transparent_26%),linear-gradient(180deg,#090817_0%,#050610_46%,#02030a_100%)]" />
      <div className="absolute inset-0 -z-20 opacity-60 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.22)_1px,transparent_0)] bg-[size:38px_38px] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_72%)]" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.055)_48%,transparent_49%),linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:840px_840px,96px_96px,96px_96px] opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_0%,transparent_70%)]" />
      <div className="absolute left-1/2 top-20 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-violet-300/15 shadow-[0_0_140px_rgba(139,92,246,0.24),inset_0_0_90px_rgba(139,92,246,0.08)]" />
      <div className="absolute left-1/2 top-28 -z-10 h-[23rem] w-[46rem] -translate-x-1/2 rounded-[100%] border-t border-violet-200/25 opacity-80" />
      <div className="absolute left-1/2 top-8 -z-10 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="MegaTools">
          <MegacorpLogo variant="brand" size={36} />
          <span className="text-sm font-semibold text-white">MegaTools</span>
        </Link>

        <nav className="flex items-center gap-3 text-xs text-white/52">
          <span className="hidden items-center gap-2 sm:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
            Preproducción
          </span>
          <Link href="/login" className="transition hover:text-white">
            Entrar
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex min-h-[calc(100svh-5.25rem)] w-full max-w-6xl flex-col items-center px-6 pb-24 pt-10 text-center lg:px-8 lg:pb-32">
        <div className="relative mb-12 h-28 w-full max-w-md">
          <div className="absolute left-1/2 top-0 h-28 w-72 -translate-x-1/2 rounded-[100%] border-t border-violet-200/35" />
          <div className="absolute left-1/2 top-8 flex size-12 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-violet-100 shadow-[0_0_52px_rgba(167,139,250,0.42)] backdrop-blur">
            <Sparkles className="size-5" />
          </div>
        </div>

        <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-medium text-violet-100/75 backdrop-blur">
          <CircuitBoard className="size-3.5 text-violet-200" />
          Portal privado de herramientas internas
        </p>

        <h1 className="max-w-5xl text-balance text-[clamp(3.7rem,8vw,8.5rem)] font-semibold leading-none text-white">
          Herramientas internas. Menos ruido.
        </h1>

        <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-white/64 sm:text-xl">
          MegaTools reúne firmas, PDFs, imágenes y utilidades pequeñas en un solo espacio
          privado para MEGACORP.
        </p>

        <div className="mt-11 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/login">
            <Button
              size="lg"
              className="h-12 rounded-lg bg-violet-200 px-6 text-sm font-semibold text-[#140b2f] shadow-[0_0_38px_rgba(196,181,253,0.28)] hover:bg-violet-100"
            >
              Iniciar sesión
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/accept-invitation">
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-lg border-white/12 bg-white/[0.035] px-6 text-sm font-semibold text-white hover:bg-white/[0.08] hover:text-white"
            >
              Aceptar invitación
            </Button>
          </Link>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase text-white/38">
          {trustItems.map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span className="size-1 rounded-full bg-violet-200/70" />
              {item}
            </span>
          ))}
        </div>

        <div className="mt-28 grid w-full gap-4 text-left md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg border border-white/10 bg-white/[0.035] p-7 backdrop-blur transition hover:border-violet-200/30 hover:bg-white/[0.055]"
            >
              <div className="mb-10 flex size-11 items-center justify-center rounded-lg bg-violet-200/10 text-violet-100">
                <feature.icon className="size-5" />
              </div>
              <h2 className="text-base font-semibold text-white">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/56">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
