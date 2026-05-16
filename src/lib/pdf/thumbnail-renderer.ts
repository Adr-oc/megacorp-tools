import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

// El legacy build no necesita worker explícito.
// Lo desactivamos para evitar fetchear el worker de un CDN.
pdfjs.GlobalWorkerOptions.workerSrc = ''

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
    const loadingTask = pdfjs.getDocument({ data: req.bytes })
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
