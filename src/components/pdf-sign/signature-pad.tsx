'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trimSignaturePng } from '@/lib/pdf-sign/stamp'
import { toast } from 'sonner'

type Props = {
  /** Recibe el dataURL PNG (recortado) de la firma y su aspect ratio (w/h). */
  onSignature: (sig: { dataUrl: string; aspect: number }) => void
}

const PAD_WIDTH = 600
const PAD_HEIGHT = 220

export function SignaturePad({ onSignature }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [])

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = pointFromEvent(e)
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !last.current) return
    const p = pointFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    if (!hasInk) setHasInk(true)
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = false
    last.current = null
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  function clearPad() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  async function useDrawn() {
    const canvas = canvasRef.current
    if (!canvas) return
    const trimmed = await trimSignaturePng(canvas.toDataURL('image/png'))
    if (!trimmed) {
      toast.warning('Dibujá tu firma antes de continuar.')
      return
    }
    onSignature(trimmed)
  }

  async function onUploadFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.warning('Subí una imagen PNG (idealmente con fondo transparente).')
      return
    }
    const dataUrl = await fileToDataUrl(file)
    const trimmed = await trimSignaturePng(dataUrl)
    if (!trimmed) {
      toast.warning('La imagen parece estar vacía o totalmente transparente.')
      return
    }
    onSignature(trimmed)
  }

  return (
    <Tabs defaultValue="draw" className="w-full">
      <TabsList>
        <TabsTrigger value="draw">Dibujar</TabsTrigger>
        <TabsTrigger value="upload">Subir PNG</TabsTrigger>
      </TabsList>

      <TabsContent value="draw" className="space-y-3">
        <div className="rounded-lg border bg-white">
          <canvas
            ref={canvasRef}
            width={PAD_WIDTH}
            height={PAD_HEIGHT}
            className="w-full touch-none rounded-lg"
            style={{ aspectRatio: `${PAD_WIDTH} / ${PAD_HEIGHT}` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={useDrawn} disabled={!hasInk} className="gap-2">
            Usar firma
          </Button>
          <Button variant="outline" onClick={clearPad} disabled={!hasInk} className="gap-2">
            <Eraser className="h-4 w-4" />
            Limpiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Dibujá con el mouse o el dedo. El fondo transparente se conserva al estampar.
        </p>
      </TabsContent>

      <TabsContent value="upload" className="space-y-3">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground hover:bg-muted/50">
          <Upload className="h-8 w-8" />
          <span className="font-medium text-foreground">Seleccioná una imagen PNG</span>
          <span>Preferí un PNG con fondo transparente para mejor resultado.</span>
          <input
            type="file"
            accept="image/png,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              void onUploadFile(file)
            }}
          />
        </label>
      </TabsContent>
    </Tabs>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}
