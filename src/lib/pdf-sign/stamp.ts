import { PDFDocument, degrees } from 'pdf-lib'
import type { SignaturePlacement } from './types'

/**
 * Estampa una imagen PNG de firma sobre una página del PDF y devuelve los
 * bytes del PDF resultante.
 *
 * `placement` viene en coordenadas NORMALIZADAS (0..1) sobre la vista VISUAL
 * de la página (origen arriba-izquierda, Y hacia abajo), tal como la ve el
 * usuario en la preview (ya considerando la rotación intrínseca del PDF).
 *
 * pdf-lib trabaja en espacio de usuario sin rotar (origen abajo-izquierda),
 * por eso transformamos según `page.getRotation()`.
 */
export async function stampSignature(
  pdfBytes: Uint8Array,
  signaturePngBytes: Uint8Array,
  placement: SignaturePlacement,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes)
  const pages = doc.getPages()
  const page = pages[placement.pageIndex]
  if (!page) throw new Error(`Página fuera de rango: ${placement.pageIndex}`)

  const png = await doc.embedPng(signaturePngBytes)

  // Dimensiones de la mediabox SIN rotar (espacio de usuario).
  const mediaW = page.getWidth()
  const mediaH = page.getHeight()
  const rotation = (((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270

  // Dimensiones VISUALES (ya rotadas), sobre las que se definió el placement.
  const visW = rotation === 90 || rotation === 270 ? mediaH : mediaW
  const visH = rotation === 90 || rotation === 270 ? mediaW : mediaH

  // Rectángulo de la firma en espacio visual (puntos), Y hacia abajo.
  const lx = placement.x * visW
  const ty = placement.y * visH
  const sw = placement.width * visW
  const sh = placement.height * visH

  // Esquina inferior-izquierda del rect en espacio visual, Y hacia arriba.
  const vx = lx
  const vy = visH - ty - sh

  // Mapeo del ancla (imagen local 0,0) al espacio de usuario según rotación.
  let x: number
  let y: number
  switch (rotation) {
    case 90:
      x = visH - vy
      y = vx
      break
    case 180:
      x = mediaW - vx
      y = mediaH - vy
      break
    case 270:
      x = vy
      y = visW - vx
      break
    default:
      x = vx
      y = vy
  }

  page.drawImage(png, {
    x,
    y,
    width: sw,
    height: sh,
    rotate: degrees(rotation),
  })

  return doc.save()
}

export function buildSignedFilename(originalName: string): string {
  const base = originalName.replace(/\.pdf$/i, '')
  return `${base || 'documento'}-firmado.pdf`
}

export function downloadBytes(bytes: Uint8Array, filename: string): void {
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

/** Recorta el PNG de la firma a su bounding box no transparente y devuelve PNG + aspect ratio. */
export async function trimSignaturePng(
  dataUrl: string,
): Promise<{ dataUrl: string; aspect: number } | null> {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const alpha = data[(py * width + px) * 4 + 3] ?? 0
      if (alpha > 8) {
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py
      }
    }
  }
  if (maxX < minX || maxY < minY) return null // todo transparente

  const pad = 4
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const w = maxX - minX + 1
  const h = maxY - minY + 1

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')
  if (!octx) return null
  octx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h)
  return { dataUrl: out.toDataURL('image/png'), aspect: w / h }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen de firma'))
    img.src = src
  })
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? ''
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
