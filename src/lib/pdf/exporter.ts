import { PDFDocument, degrees } from 'pdf-lib'
import type { ExportQuality, PageId, WorkspaceState } from './types'

export type { ExportQuality } from './types'

type RasterPreset = { dpi: number; jpegQuality: number }

const RASTER_PRESETS: Record<Exclude<ExportQuality, 'high'>, RasterPreset> = {
  medium: { dpi: 150, jpegQuality: 0.8 },
  low: { dpi: 96, jpegQuality: 0.55 },
}

export async function exportPages(
  state: WorkspaceState,
  pageIds: PageId[],
  quality: ExportQuality = 'high',
): Promise<Uint8Array> {
  if (pageIds.length === 0) throw new Error('Sin páginas para exportar')

  const out = await PDFDocument.create()

  if (quality === 'high') {
    return exportHigh(state, pageIds, out)
  }
  return exportRasterized(state, pageIds, out, RASTER_PRESETS[quality])
}

async function exportHigh(
  state: WorkspaceState,
  pageIds: PageId[],
  out: PDFDocument,
): Promise<Uint8Array> {
  const docCache = new Map<string, PDFDocument>()
  for (const id of pageIds) {
    const page = state.pages.find((p) => p.id === id)
    if (!page) continue
    if (page.kind === 'blank') {
      out.addPage([page.width, page.height])
      continue
    }
    let srcDoc = docCache.get(page.sourceId)
    if (!srcDoc) {
      const pdf = state.pdfs[page.sourceId]
      if (!pdf) throw new Error(`PDF de origen no encontrado: ${page.sourceId}`)
      srcDoc = await PDFDocument.load(pdf.bytes)
      docCache.set(page.sourceId, srcDoc)
    }
    const [copied] = await out.copyPages(srcDoc, [page.sourceIndex])
    if (!copied) continue
    if (page.rotation !== 0) copied.setRotation(degrees(page.rotation))
    out.addPage(copied)
  }
  return out.save()
}

async function exportRasterized(
  state: WorkspaceState,
  pageIds: PageId[],
  out: PDFDocument,
  preset: RasterPreset,
): Promise<Uint8Array> {
  // Import dinámico de pdfjs — sólo cuando se necesita raster.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

  type PdfjsDoc = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>
  const docCache = new Map<string, PdfjsDoc>()

  try {
    for (const id of pageIds) {
      const page = state.pages.find((p) => p.id === id)
      if (!page) continue
      if (page.kind === 'blank') {
        out.addPage([page.width, page.height])
        continue
      }
      const sourcePdf = state.pdfs[page.sourceId]
      if (!sourcePdf) throw new Error(`PDF de origen no encontrado: ${page.sourceId}`)

      let pdfjsDoc = docCache.get(page.sourceId)
      if (!pdfjsDoc) {
        const loadingTask = pdfjs.getDocument({ data: sourcePdf.bytes.slice() })
        pdfjsDoc = await loadingTask.promise
        docCache.set(page.sourceId, pdfjsDoc)
      }

      const sourcePage = await pdfjsDoc.getPage(page.sourceIndex + 1)
      const ptsViewport = sourcePage.getViewport({ scale: 1, rotation: page.rotation })
      const renderViewport = sourcePage.getViewport({ scale: preset.dpi / 72, rotation: page.rotation })

      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(renderViewport.width)
      canvas.height = Math.ceil(renderViewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      await sourcePage.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', preset.jpegQuality),
      )
      if (!blob) continue
      const jpegBytes = new Uint8Array(await blob.arrayBuffer())
      const jpegImage = await out.embedJpg(jpegBytes)
      const newPage = out.addPage([ptsViewport.width, ptsViewport.height])
      newPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: ptsViewport.width,
        height: ptsViewport.height,
      })
    }
  } finally {
    for (const doc of docCache.values()) await doc.destroy()
  }
  return out.save()
}

export function buildFilename(
  state: WorkspaceState,
  pageIds: PageId[],
  mode: 'all' | 'selection' | 'single',
): string {
  const today = new Date().toISOString().slice(0, 10)

  if (mode === 'single' && pageIds.length === 1) {
    const firstId = pageIds[0]
    const page = firstId ? state.pages.find((p) => p.id === firstId) : undefined
    if (page && page.kind === 'source') {
      const pdf = state.pdfs[page.sourceId]
      const base = pdf?.name.replace(/\.pdf$/i, '') ?? 'pagina'
      return `${base}-pagina-${page.sourceIndex + 1}.pdf`
    }
    return `pagina-${today}.pdf`
  }

  if (mode === 'selection') return `seleccion-${today}.pdf`

  // mode === 'all'
  const sourceIds = new Set<string>()
  for (const p of state.pages) {
    if (p.kind === 'source') sourceIds.add(p.sourceId)
  }
  if (sourceIds.size === 1) {
    const [onlyId] = sourceIds
    if (onlyId) {
      const base = state.pdfs[onlyId]?.name.replace(/\.pdf$/i, '')
      if (base) return `${base}-editado.pdf`
    }
  }
  return `documento-${today}.pdf`
}

export function downloadBytes(bytes: Uint8Array, filename: string): void {
  // Cast to satisfy the BlobPart type which expects ArrayBuffer in some TS lib versions
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function findOrphanPdfIds(state: WorkspaceState): string[] {
  const referenced = new Set<string>()
  for (const p of state.pages) {
    if (p.kind === 'source') referenced.add(p.sourceId)
  }
  return Object.keys(state.pdfs).filter((id) => !referenced.has(id))
}
