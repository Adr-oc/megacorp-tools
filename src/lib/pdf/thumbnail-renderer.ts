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

export type ThumbnailRequest = {
  pageId: string
  bytes: Uint8Array
  sourceIndex: number // 0-based en el PDF original
  rotation: 0 | 90 | 180 | 270
  maxWidth?: number // default 280px
}

export type ThumbnailResult = {
  pageId: string
  dataUrl: string
}

const MAX_CONCURRENT = 4
const queue: Array<() => Promise<void>> = []
let running = 0

function drain() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!
    running++
    job().finally(() => {
      running--
      drain()
    })
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        resolve(await fn())
      } catch (e) {
        reject(e)
      }
    })
    drain()
  })
}

export async function renderThumbnail(req: ThumbnailRequest): Promise<ThumbnailResult> {
  return enqueue(async () => {
    // Clonamos los bytes: pdfjs.getDocument transfiere el ArrayBuffer al worker,
    // lo cual deja el Uint8Array original vacío y rompe usos posteriores
    // (ej. pdf-lib en exportPages tomando state.pdfs[id].bytes).
    const loadingTask = pdfjs.getDocument({ data: req.bytes.slice() })
    const doc = await loadingTask.promise
    try {
      const page = await doc.getPage(req.sourceIndex + 1)
      const baseViewport = page.getViewport({ scale: 1 })
      const maxWidth = req.maxWidth ?? 280
      const scale = maxWidth / baseViewport.width
      const viewport = page.getViewport({ scale, rotation: req.rotation })

      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo crear contexto 2D')

      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      return { pageId: req.pageId, dataUrl }
    } finally {
      doc.destroy()
    }
  })
}
