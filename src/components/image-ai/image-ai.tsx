'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { CheckCircle2, Clipboard, FileText, ImageIcon, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { addRecent } from '@/lib/recents/client'
import { analyzeDocument } from '@/lib/image-ai/actions'
import type { AnalyzeDocumentResult, ExtractionType } from '@/lib/image-ai/schema'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type SelectedFile = {
  id: string
  file: File
  kind: 'image' | 'pdf'
  previewUrl?: string
  extractedText?: string
  note?: string
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

export function ImageAi() {
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [manualText, setManualText] = useState('')
  const [extractionType, setExtractionType] = useState<ExtractionType>('factura')
  const [result, setResult] = useState<AnalyzeDocumentResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<SelectedFile[]>([])

  useEffect(() => {
    addRecent('image-ai')
  }, [])

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    return () => {
      for (const item of filesRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
    }
  }, [])

  const combinedPdfText = useMemo(
    () => files.map((item) => item.extractedText).filter(Boolean).join('\n\n'),
    [files],
  )

  const addFiles = useCallback(async (incoming: File[]) => {
    const accepted = incoming.filter(
      (file) => file.type.startsWith('image/') || file.type === 'application/pdf',
    )
    if (accepted.length !== incoming.length) toast.warning('Solo se aceptan imágenes y PDF.')

    const next: SelectedFile[] = []
    for (const file of accepted.slice(0, 3)) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} supera el límite MVP de 8 MB.`)
        continue
      }

      if (file.type === 'application/pdf') {
        const item: SelectedFile = { id: makeId(), file, kind: 'pdf', note: 'Extrayendo texto local…' }
        try {
          const { extractPdfText } = await import('@/lib/image-ai/pdf-text')
          const text = await extractPdfText(file)
          item.extractedText = text
          item.note = text
            ? 'Texto del PDF extraído localmente; no se persiste el archivo.'
            : 'No se detectó texto seleccionable. En este MVP los PDF escaneados no se envían como imagen.'
        } catch {
          item.note = 'No se pudo extraer texto del PDF en el navegador. Pegá texto manualmente para analizar.'
        }
        next.push(item)
      } else {
        next.push({ id: makeId(), file, kind: 'image', previewUrl: URL.createObjectURL(file) })
      }
    }

    if (next.length > 0) setFiles((prev) => [...prev, ...next].slice(0, 3))
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    setFiles((prev) => {
      for (const item of prev) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return []
    })
    setManualText('')
    setResult(null)
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      void addFiles(Array.from(event.dataTransfer.files))
    },
    [addFiles],
  )

  const runAnalysis = useCallback(() => {
    startTransition(async () => {
      try {
        const imageFiles = files.filter((item) => item.kind === 'image')
        const payloadFiles = await Promise.all(
          imageFiles.map(async (item) => ({
            name: item.file.name,
            mimeType: item.file.type,
            dataUrl: await fileToDataUrl(item.file),
          })),
        )
        const response = await analyzeDocument({
          extractionType,
          manualText: [combinedPdfText, manualText].filter(Boolean).join('\n\n').slice(0, 20_000),
          files: payloadFiles,
        })
        setResult(response)
        if (response.ok) toast.success('Análisis completado')
        else toast.error(response.error ?? 'No se pudo analizar')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al analizar'
        setResult({ ok: false, configured: false, mode: 'error', summary: 'Error al analizar.', jsonText: '{}', error: message })
        toast.error(message)
      }
    })
  }, [combinedPdfText, extractionType, files, manualText])

  const copyJson = useCallback(async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.jsonText)
    toast.success('JSON copiado')
  }, [result])

  const hasContent = files.length > 0 || manualText.trim().length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Extractor IA de documentos</h1>
          <p className="text-sm text-muted-foreground">
            Subí una imagen o PDF, extraé datos clave y obtené un JSON copiable. Los archivos no se guardan.
          </p>
        </div>
        <Badge variant="secondary">NVIDIA NIM listo por servidor</Badge>
      </div>

      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Privacidad del MVP</AlertTitle>
        <AlertDescription>
          Las imágenes se envían a NVIDIA solo cuando <code>NVIDIA_API_KEY</code> existe en el servidor. Los PDF se leen localmente para texto seleccionable; PDF escaneados requieren pegar texto o usar imagen.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documento</CardTitle>
              <CardDescription>Máximo 3 archivos, 8 MB cada uno. Imágenes: JPG/PNG/WebP. PDF: texto local.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  'rounded-xl border border-dashed p-8 text-center transition-colors',
                  'hover:border-primary/70 hover:bg-muted/40',
                )}
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDrop}
              >
                <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Arrastrá imágenes o PDF aquí</p>
                <p className="mt-1 text-sm text-muted-foreground">o seleccioná archivos desde tu equipo</p>
                <Button className="mt-4" variant="outline" onClick={() => inputRef.current?.click()}>
                  Elegir archivos
                </Button>
                <input
                  ref={inputRef}
                  className="hidden"
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(event) => {
                    void addFiles(Array.from(event.target.files ?? []))
                    event.currentTarget.value = ''
                  }}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                      {item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.previewUrl} alt="Preview" className="h-14 w-14 rounded object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded bg-muted">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">{item.kind === 'image' ? 'Imagen' : 'PDF'} · {formatBytes(item.file.size)}</p>
                        {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(item.id)} aria-label="Quitar archivo">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Texto manual o extraído</CardTitle>
              <CardDescription>Opcional para imágenes; recomendado si el PDF no tiene texto seleccionable.</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                placeholder="Pegá aquí texto de la factura, recibo o documento…"
                className="min-h-36 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              {combinedPdfText && <p className="mt-2 text-xs text-muted-foreground">Se agregará automáticamente el texto extraído de PDF ({combinedPdfText.length} caracteres).</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extracción</CardTitle>
              <CardDescription>Elegí el tipo para ajustar el prompt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="extraction-type">Tipo</Label>
                <select
                  id="extraction-type"
                  value={extractionType}
                  onChange={(event) => setExtractionType(event.target.value as ExtractionType)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="factura">Factura</option>
                  <option value="recibo">Recibo</option>
                  <option value="documento-general">Documento general</option>
                </select>
              </div>
              <Button className="w-full gap-2" disabled={!hasContent || isPending} onClick={runAnalysis}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                Analizar documento
              </Button>
              {(files.length > 0 || manualText) && (
                <Button variant="outline" className="w-full" onClick={clearAll} disabled={isPending}>
                  Limpiar
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
              <CardDescription>Resumen legible y JSON para copiar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!result ? (
                <p className="text-sm text-muted-foreground">El resultado aparecerá aquí después del análisis.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={result.configured ? 'default' : 'secondary'}>
                      {result.configured ? 'NVIDIA configurado' : 'Modo demo/configuración'}
                    </Badge>
                    <Button variant="outline" size="sm" className="gap-2" onClick={copyJson}>
                      <Clipboard className="h-4 w-4" /> Copiar
                    </Button>
                  </div>
                  <p className="text-sm">{result.summary}</p>
                  {result.error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{result.error}</p>}
                  <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                    {result.jsonText}
                  </pre>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
