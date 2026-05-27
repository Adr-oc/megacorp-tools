'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText, Loader2, RotateCcw, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addRecent } from '@/lib/recents/client'
import { readPdfMeta, renderPage } from '@/lib/pdf-sign/render'
import type { PdfMeta } from '@/lib/pdf-sign/render'
import {
  buildSignedFilename,
  dataUrlToBytes,
  downloadBytes,
  stampSignature,
} from '@/lib/pdf-sign/stamp'
import type { RenderedPage, SignaturePlacement } from '@/lib/pdf-sign/types'
import { SignaturePad } from './signature-pad'
import { PlacementPreview, deriveHeight } from './placement-preview'
import type { Placement2D } from './placement-preview'
import { toast } from 'sonner'

type Signature = { dataUrl: string; aspect: number }

const DEFAULT_WIDTH = 0.25 // fracción del ancho de la página

export function PdfSign() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [meta, setMeta] = useState<PdfMeta | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [renderedPage, setRenderedPage] = useState<RenderedPage | null>(null)
  const [signature, setSignature] = useState<Signature | null>(null)
  const [placement, setPlacement] = useState<Placement2D>({
    x: 0.5 - DEFAULT_WIDTH / 2,
    y: 0.7,
    width: DEFAULT_WIDTH,
  })
  const [working, setWorking] = useState(false)

  useEffect(() => {
    addRecent('pdf-sign')
  }, [])

  // Renderiza la página seleccionada cada vez que cambia el PDF o el índice.
  // El estado "renderizando" se DERIVA (renderedPage desincronizado del índice)
  // para no llamar a setState de forma síncrona dentro del effect.
  useEffect(() => {
    if (!pdfBytes || !meta) return
    let cancelled = false
    renderPage(pdfBytes, pageIndex)
      .then((rp) => {
        if (!cancelled) setRenderedPage(rp)
      })
      .catch(() => {
        if (!cancelled) toast.error('No se pudo renderizar esta página.')
      })
    return () => {
      cancelled = true
    }
  }, [pdfBytes, meta, pageIndex])

  // "Renderizando" = la página renderizada aún no corresponde al índice actual.
  const renderingPage = !renderedPage || renderedPage.pageIndex !== pageIndex

  function onSignature(sig: Signature) {
    setSignature(sig)
    setPlacement((prev) => ({ ...prev, x: 0.5 - prev.width / 2 }))
  }

  async function loadFile(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.warning('Seleccioná un archivo .pdf')
      return
    }
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const m = await readPdfMeta(buf)
      setPdfBytes(buf)
      setMeta(m)
      setFileName(file.name)
      setPageIndex(0)
      setRenderedPage(null)
    } catch {
      toast.error('No se pudo leer el PDF. Puede estar dañado o protegido.')
    }
  }

  function reset() {
    setFileName(null)
    setPdfBytes(null)
    setMeta(null)
    setPageIndex(0)
    setRenderedPage(null)
    setSignature(null)
    setPlacement({ x: 0.5 - DEFAULT_WIDTH / 2, y: 0.7, width: DEFAULT_WIDTH })
  }

  async function download() {
    if (!pdfBytes || !signature || !renderedPage || !fileName) return
    setWorking(true)
    try {
      const pngBytes = dataUrlToBytes(signature.dataUrl)
      const full: SignaturePlacement = {
        pageIndex,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: deriveHeight(placement.width, renderedPage, signature.aspect),
      }
      const signed = await stampSignature(pdfBytes, pngBytes, full)
      downloadBytes(signed, buildSignedFilename(fileName))
      toast.success('PDF firmado descargado.')
    } catch {
      toast.error('No se pudo estampar la firma.')
    } finally {
      setWorking(false)
    }
  }

  const pageOptions = useMemo(
    () => Array.from({ length: meta?.pageCount ?? 0 }, (_, i) => i),
    [meta],
  )

  if (!pdfBytes || !meta) {
    return (
      <div className="space-y-4">
        <Header />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            void loadFile(f)
          }}
        />
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="rounded-full bg-muted p-6">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h2 className="mb-1 text-xl font-semibold">Cargá el PDF a firmar</h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Todo el procesamiento ocurre en tu navegador — nada se sube al servidor.
            </p>
          </div>
          <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Elegir PDF
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Header>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Otro PDF
          </Button>
          <Button
            size="sm"
            onClick={download}
            disabled={!signature || working}
            className="gap-2"
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar firmado
          </Button>
        </div>
      </Header>

      <div className="text-sm text-muted-foreground">
        {fileName} · {meta.pageCount} página{meta.pageCount === 1 ? '' : 's'}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">Vista de colocación</CardTitle>
              <CardDescription>
                {signature ? 'Arrastrá la firma y usá la esquina para redimensionar.' : 'Creá una firma para colocarla.'}
              </CardDescription>
            </div>
            {meta.pageCount > 1 && (
              <Select
                value={String(pageIndex)}
                onValueChange={(v) => setPageIndex(Number(v))}
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageOptions.map((i) => (
                    <SelectItem key={i} value={String(i)}>
                      Página {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            {renderingPage || !renderedPage ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed py-24 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Renderizando página…
              </div>
            ) : signature ? (
              <PlacementPreview
                page={renderedPage}
                signatureDataUrl={signature.dataUrl}
                signatureAspect={signature.aspect}
                placement={placement}
                onChange={setPlacement}
              />
            ) : (
              <div
                className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border bg-white"
                style={{ aspectRatio: `${renderedPage.width} / ${renderedPage.height}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={renderedPage.dataUrl} alt={`Página ${pageIndex + 1}`} className="h-full w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Tu firma</CardTitle>
            <CardDescription>Dibujala o subí un PNG.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignaturePad onSignature={onSignature} />
            {signature && (
              <Alert>
                <AlertTitle>Firma lista</AlertTitle>
                <AlertDescription>
                  Acomodala en la página y luego descargá el PDF firmado.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">Firma de PDF</h1>
      {children}
    </div>
  )
}
