'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ERROR_CORRECTION_LABELS,
  type QrErrorCorrectionLevel,
  type QrStyleOptions,
} from '@/lib/qr-generator/types'

interface StyleControlsProps {
  style: QrStyleOptions
  setStyle: Dispatch<SetStateAction<QrStyleOptions>>
}

export function StyleControls({ style, setStyle }: StyleControlsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="qr-tamano">Tamaño</Label>
          <span className="text-sm text-muted-foreground">{style.tamano}px</span>
        </div>
        <input
          id="qr-tamano"
          type="range"
          min={128}
          max={1024}
          step={32}
          value={style.tamano}
          onChange={(e) =>
            setStyle((s) => ({ ...s, tamano: Number(e.target.value) }))
          }
          className="w-full accent-brand-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="qr-fg">Color del código</Label>
          <div className="flex items-center gap-2">
            <input
              id="qr-fg"
              type="color"
              value={style.colorPrimerPlano}
              onChange={(e) =>
                setStyle((s) => ({ ...s, colorPrimerPlano: e.target.value }))
              }
              className="h-8 w-10 shrink-0 cursor-pointer rounded border border-input bg-transparent"
            />
            <Input
              value={style.colorPrimerPlano}
              onChange={(e) =>
                setStyle((s) => ({ ...s, colorPrimerPlano: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="qr-bg">Color de fondo</Label>
          <div className="flex items-center gap-2">
            <input
              id="qr-bg"
              type="color"
              value={style.colorFondo}
              onChange={(e) =>
                setStyle((s) => ({ ...s, colorFondo: e.target.value }))
              }
              className="h-8 w-10 shrink-0 cursor-pointer rounded border border-input bg-transparent"
            />
            <Input
              value={style.colorFondo}
              onChange={(e) =>
                setStyle((s) => ({ ...s, colorFondo: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qr-correccion">Nivel de corrección de error</Label>
        <Select
          value={style.correccion}
          onValueChange={(v) =>
            setStyle((s) => ({
              ...s,
              correccion: (v ?? 'M') as QrErrorCorrectionLevel,
            }))
          }
        >
          <SelectTrigger id="qr-correccion" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ERROR_CORRECTION_LABELS) as QrErrorCorrectionLevel[]).map((k) => (
              <SelectItem key={k} value={k}>
                {ERROR_CORRECTION_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="qr-margen">Margen (quiet zone)</Label>
          <span className="text-sm text-muted-foreground">{style.margen}</span>
        </div>
        <input
          id="qr-margen"
          type="range"
          min={0}
          max={8}
          step={1}
          value={style.margen}
          onChange={(e) =>
            setStyle((s) => ({ ...s, margen: Number(e.target.value) }))
          }
          className="w-full accent-brand-accent"
        />
      </div>
    </div>
  )
}
