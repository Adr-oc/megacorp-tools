'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { ACCENT_PRESETS, type AccentColor } from '@/lib/accent/presets'
import { updateUserAccent } from '@/lib/accent/update'

type Props = {
  /** Valor inicial leído del user (server). */
  value: AccentColor
}

export function AccentPicker({ value }: Props) {
  const [current, setCurrent] = useState<AccentColor>(value)
  const [pending, startTransition] = useTransition()

  function applyToDOM(accent: AccentColor) {
    // El wrapper del shell autenticado tiene data-accent. Lo actualizamos
    // para feedback inmediato (sin esperar el round-trip al server).
    const root =
      document.querySelector<HTMLElement>('[data-accent-root]') ??
      document.documentElement
    root.dataset.accent = accent
  }

  function choose(next: AccentColor) {
    if (next === current) return
    const prev = current
    setCurrent(next)
    applyToDOM(next)
    startTransition(async () => {
      try {
        await updateUserAccent(next)
      } catch (err) {
        setCurrent(prev)
        applyToDOM(prev)
        toast.error(err instanceof Error ? err.message : 'No se pudo guardar el color')
      }
    })
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Color</label>
      <div className="flex flex-wrap gap-3">
        {ACCENT_PRESETS.map((preset) => {
          const selected = current === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => choose(preset.id)}
              disabled={pending}
              className="group flex flex-col items-center gap-1 disabled:opacity-60"
              aria-label={preset.label}
              aria-pressed={selected}
              data-accent-swatch={preset.id}
            >
              <span
                className="h-12 w-12 rounded-md border-2 flex items-center justify-center transition"
                style={{
                  backgroundColor: preset.hex,
                  borderColor: selected ? 'var(--foreground)' : 'transparent',
                }}
              >
                {selected && <Check className="h-5 w-5 text-white drop-shadow" />}
              </span>
              <span className="text-xs">{preset.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Tu color acompaña botones, foco, estados activos y links en todo el portal.
      </p>
    </div>
  )
}
