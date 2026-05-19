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
      <header className="container mx-auto px-6 py-6 flex items-center justify-between w-full">
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
