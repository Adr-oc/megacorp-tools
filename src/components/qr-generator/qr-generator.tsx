'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, QrCode as QrCodeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addRecent } from '@/lib/recents/client'
import {
  buildPayload,
  hasContent,
  type QrFormState,
} from '@/lib/qr-generator/payload'
import {
  downloadFile,
  drawToCanvas,
  generatePngDataUrl,
  generateSvgString,
} from '@/lib/qr-generator/generate'
import {
  DEFAULT_STYLE,
  type QrContentType,
  type QrStyleOptions,
} from '@/lib/qr-generator/types'
import { ContentForms } from './content-forms'
import { StyleControls } from './style-controls'

const CONTENT_TABS: { value: QrContentType; label: string }[] = [
  { value: 'url', label: 'URL' },
  { value: 'text', label: 'Texto' },
  { value: 'vcard', label: 'vCard' },
  { value: 'wifi', label: 'WiFi' },
]

const INITIAL_FORM: QrFormState = {
  url: { url: '' },
  text: { text: '' },
  vcard: { nombre: '', empresa: '', telefono: '', email: '' },
  wifi: { ssid: '', password: '', cifrado: 'WPA', oculta: false },
}

export function QrGenerator() {
  const [type, setType] = useState<QrContentType>('url')
  const [form, setForm] = useState<QrFormState>(INITIAL_FORM)
  const [style, setStyle] = useState<QrStyleOptions>(DEFAULT_STYLE)
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    addRecent('qr-generator')
  }, [])

  const listo = hasContent(type, form)
  const payload = listo ? buildPayload(type, form) : ''

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!payload) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    let cancelled = false
    void drawToCanvas(canvas, payload, style).catch(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [payload, style])

  async function onDownloadPng() {
    if (!payload) return
    setBusy(true)
    try {
      const dataUrl = await generatePngDataUrl(payload, style)
      downloadFile(dataUrl, `qr-${type}.png`)
    } finally {
      setBusy(false)
    }
  }

  async function onDownloadSvg() {
    if (!payload) return
    setBusy(true)
    try {
      const svg = await generateSvgString(payload, style)
      downloadFile(svg, `qr-${type}.svg`, 'image/svg+xml')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Generador de QR</h1>
        <p className="text-sm text-muted-foreground">
          Todo se procesa en tu navegador. Nada se sube.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contenido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={type}
                onValueChange={(v) => setType(v as QrContentType)}
              >
                <TabsList className="w-full">
                  {CONTENT_TABS.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <ContentForms type={type} state={form} setState={setForm} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estilo</CardTitle>
            </CardHeader>
            <CardContent>
              <StyleControls style={style} setStyle={setStyle} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vista previa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex aspect-square w-full items-center justify-center rounded-lg border bg-muted/30 p-4">
                {listo ? (
                  <canvas
                    ref={canvasRef}
                    className="h-auto max-h-full w-auto max-w-full"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                    <QrCodeIcon className="size-10 opacity-40" />
                    <span>Completá el contenido para ver el QR.</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="default"
                  disabled={!listo || busy}
                  onClick={onDownloadPng}
                >
                  <Download />
                  PNG
                </Button>
                <Button
                  variant="outline"
                  disabled={!listo || busy}
                  onClick={onDownloadSvg}
                >
                  <Download />
                  SVG
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
