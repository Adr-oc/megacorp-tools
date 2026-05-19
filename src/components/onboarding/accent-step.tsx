'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccentPicker } from '@/components/settings/accent-picker'
import { ACCENT_PRESETS, type AccentColor, isAccentColor } from '@/lib/accent/presets'
import { AccentPreview } from './accent-preview'

type Props = {
  initialAccent: AccentColor
  onBack: () => void
  onContinue: () => void
  onSkip: () => void
}

export function AccentStep({ initialAccent, onBack, onContinue, onSkip }: Props) {
  const [currentAccent, setCurrentAccent] = useState<AccentColor>(initialAccent)

  // Observamos el data-accent del root (que el AccentPicker actualiza) para reflejarlo
  // en el label "Seleccionado: X · #...".
  useEffect(() => {
    const root =
      document.querySelector<HTMLElement>('[data-accent-root]') ?? document.documentElement
    const observer = new MutationObserver(() => {
      const v = root.dataset.accent
      if (v && isAccentColor(v)) setCurrentAccent(v)
    })
    observer.observe(root, { attributes: true, attributeFilter: ['data-accent'] })
    return () => observer.disconnect()
  }, [])

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
