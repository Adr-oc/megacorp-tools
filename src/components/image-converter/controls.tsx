'use client'

import { Button } from '@/components/ui/button'
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
  FORMAT_LABELS,
  supportsQuality,
  type ConvertOptions,
  type OutputFormat,
} from '@/lib/image-converter/convert'
import { Download, Loader2 } from 'lucide-react'

type Props = {
  options: ConvertOptions
  onChange: (next: ConvertOptions) => void
  onConvertAll: () => void
  converting: boolean
  count: number
}

const FORMATS: OutputFormat[] = ['png', 'jpeg', 'webp']

function parseDim(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

export function Controls({ options, onChange, onConvertAll, converting, count }: Props) {
  const { format, quality, resize } = options
  const showQuality = supportsQuality(format)

  return (
    <div className="rounded-lg border p-4 space-y-5">
      {/* Formato destino */}
      <div className="space-y-2">
        <Label htmlFor="format">Formato de salida</Label>
        <Select
          value={format}
          onValueChange={(value) => onChange({ ...options, format: (value || 'png') as OutputFormat })}
        >
          <SelectTrigger id="format" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {FORMAT_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calidad / compresión */}
      {showQuality && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="quality">Calidad</Label>
            <span className="text-sm tabular-nums text-muted-foreground">
              {Math.round(quality * 100)}%
            </span>
          </div>
          <input
            id="quality"
            type="range"
            min={10}
            max={100}
            step={1}
            value={Math.round(quality * 100)}
            onChange={(e) => onChange({ ...options, quality: Number(e.target.value) / 100 })}
            className="w-full accent-[var(--brand-accent)]"
          />
          <p className="text-xs text-muted-foreground">
            Menor calidad = archivo más liviano. Aplica a JPG y WebP.
          </p>
        </div>
      )}

      {/* Redimensionar */}
      <div className="space-y-2">
        <Label>Redimensionar (px)</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="width" className="text-xs font-normal text-muted-foreground">
              Ancho
            </Label>
            <Input
              id="width"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="auto"
              value={resize.width ?? ''}
              onChange={(e) =>
                onChange({ ...options, resize: { ...resize, width: parseDim(e.target.value) } })
              }
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="height" className="text-xs font-normal text-muted-foreground">
              Alto
            </Label>
            <Input
              id="height"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="auto"
              value={resize.height ?? ''}
              onChange={(e) =>
                onChange({ ...options, resize: { ...resize, height: parseDim(e.target.value) } })
              }
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={resize.keepAspect}
            onChange={(e) =>
              onChange({ ...options, resize: { ...resize, keepAspect: e.target.checked } })
            }
            className="size-4 accent-[var(--brand-accent)]"
          />
          Mantener proporción
        </label>
        <p className="text-xs text-muted-foreground">
          Dejá los campos vacíos para conservar el tamaño original.
        </p>
      </div>

      <Button className="w-full gap-2" disabled={converting || count === 0} onClick={onConvertAll}>
        {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Convertir y descargar {count > 0 ? `(${count})` : ''}
      </Button>
    </div>
  )
}
