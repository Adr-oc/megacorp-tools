import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

// pdfjs-dist v5 requiere worker. `new Worker(new URL(...))` es el patrón que
// Turbopack/Webpack 5 detectan estáticamente para empaquetar el worker.
// Se crea una sola vez al cargar el módulo (lazy en cliente, porque este
// módulo solo se importa desde componentes 'use client').
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerPort) {
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url),
    { type: 'module' },
  )
}

export type PageRenderInfo = {
  pageId: string
  sourceIndex: number // 0-based en el PDF original
  rotation: 0 | 90 | 180 | 270
}

export type ThumbnailResult = {
  pageId: string
  dataUrl: string
}

const MAX_WIDTH = 400

// Cola de jobs por PDF (no por página) — saturar el worker con N getDocument()
// paralelos lo deja colgado a partir de ~4. Cargamos el doc UNA vez por PDF
// y serializamos sus páginas internamente.
const MAX_PDFS_IN_FLIGHT = 2
const queue: Array<() => Promise<void>> = []
let running = 0

function drain() {
  while (running < MAX_PDFS_IN_FLIGHT && queue.length > 0) {
    const job = queue.shift()!
    running++
    job().finally(() => {
      running--
      drain()
    })
  }
}

function enqueue(fn: () => Promise<void>): void {
  queue.push(fn)
  drain()
}

/**
 * Renderiza thumbnails de todas las páginas de un PDF y emite cada resultado
 * vía `onResult` apenas está listo. Carga el PDFDocument UNA vez por PDF.
 *
 * `bytes` se clona internamente porque pdfjs transfiere el ArrayBuffer al worker.
 */
export function renderPdfThumbnails(
  bytes: Uint8Array,
  pages: PageRenderInfo[],
  onResult: (r: ThumbnailResult) => void,
): void {
  if (pages.length === 0) return
  enqueue(async () => {
    let doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']> | null = null
    try {
      const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
      doc = await loadingTask.promise
      for (const p of pages) {
        try {
          const page = await doc.getPage(p.sourceIndex + 1)
          const baseViewport = page.getViewport({ scale: 1 })
          const scale = MAX_WIDTH / baseViewport.width
          const viewport = page.getViewport({ scale, rotation: p.rotation })
          const canvas = document.createElement('canvas')
          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
          onResult({ pageId: p.pageId, dataUrl: canvas.toDataURL('image/jpeg', 0.7) })
        } catch {
          // tile mostrará placeholder; seguimos con la siguiente página
        }
      }
    } catch {
      // PDF no se pudo abrir en pdfjs (encriptado, corrupto, etc.) — placeholders
    } finally {
      if (doc) await doc.destroy()
    }
  })
}
