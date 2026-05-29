import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerPort) {
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url),
    { type: 'module' },
  )
}

export async function extractPdfText(file: File, maxPages = 8): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
  const doc = await loadingTask.promise
  const chunks: string[] = []

  try {
    const pages = Math.min(doc.numPages, maxPages)
    for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ')
      if (pageText.trim()) chunks.push(`Página ${pageNumber}: ${pageText}`)
    }
    if (doc.numPages > maxPages) {
      chunks.push(`Nota: el MVP leyó las primeras ${maxPages} de ${doc.numPages} páginas.`)
    }
  } finally {
    await doc.destroy()
  }

  return chunks.join('\n\n').slice(0, 20_000)
}
