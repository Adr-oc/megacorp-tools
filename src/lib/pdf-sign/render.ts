'use client'

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { RenderedPage } from './types'

// pdfjs-dist v5 requiere worker. Mismo patrón que src/lib/pdf/thumbnail-renderer.ts:
// `new Worker(new URL(...))` es lo que Turbopack/Webpack 5 detectan estáticamente.
// Este módulo es 'use client' y sólo se importa desde componentes de cliente.
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerPort) {
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url),
    { type: 'module' },
  )
}

const MAX_WIDTH = 900

export type PdfMeta = {
  pageCount: number
}

/** Lee la cantidad de páginas del PDF. `bytes` se clona (pdfjs transfiere el buffer). */
export async function readPdfMeta(bytes: Uint8Array): Promise<PdfMeta> {
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
  const doc = await loadingTask.promise
  try {
    return { pageCount: doc.numPages }
  } finally {
    await doc.destroy()
  }
}

/**
 * Renderiza una página a dataURL (PNG) para usarla como preview de colocación.
 * La rotación intrínseca del PDF ya queda aplicada por el viewport de pdfjs,
 * así que el resultado está en orientación visual.
 */
export async function renderPage(
  bytes: Uint8Array,
  pageIndex: number,
): Promise<RenderedPage> {
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
  const doc = await loadingTask.promise
  try {
    const page = await doc.getPage(pageIndex + 1)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(MAX_WIDTH / base.width, 2)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo crear el contexto de canvas')
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    return {
      pageIndex,
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    }
  } finally {
    await doc.destroy()
  }
}
