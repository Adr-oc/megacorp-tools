import { PDFDocument, degrees } from 'pdf-lib'
import type { PageId, WorkspaceState } from './types'

export async function exportPages(
  state: WorkspaceState,
  pageIds: PageId[],
): Promise<Uint8Array> {
  if (pageIds.length === 0) throw new Error('Sin páginas para exportar')

  const out = await PDFDocument.create()
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
