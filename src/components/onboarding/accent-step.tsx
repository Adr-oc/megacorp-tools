'use client'

import type { AccentColor } from '@/lib/accent/presets'

type Props = {
  initialAccent: AccentColor
  onBack: () => void
  onContinue: () => void
  onSkip: () => void
}

export function AccentStep({ initialAccent, onBack, onContinue, onSkip }: Props) {
  return (
    <div className="p-12">
      <div>Accent stub — initial {initialAccent}</div>
      <button onClick={onBack}>atrás</button>
      <button onClick={onContinue}>continuar</button>
      <button onClick={onSkip}>saltar</button>
    </div>
  )
}
