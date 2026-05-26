'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MegacorpLogo } from '@/components/brand/logo'
import { useIsMounted } from '@/hooks/use-is-mounted'
import { TOUR_STEPS } from './tour-steps'

type Props = {
  mode: 'onboarding' | 'help'
  onClose: () => void
  onSkip: () => void
}

export function TourModal({ mode, onClose, onSkip }: Props) {
  const [i, setI] = useState(0)
  const mounted = useIsMounted()
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

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/60">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-card border shadow-xl overflow-hidden my-auto">
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
                <button
                  type="button"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Cerrar"
                >
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
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Saltar tutorial
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={back}
                  disabled={isFirst}
                  className="gap-1.5"
                >
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
    </div>,
    document.body,
  )
}
