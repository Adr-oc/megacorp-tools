// Lógica pura de conversión de imágenes con Canvas API.
// 100% client-side: nada se sube al servidor.

export type OutputFormat = 'png' | 'jpeg' | 'webp'

export const FORMAT_LABELS: Record<OutputFormat, string> = {
  png: 'PNG',
  jpeg: 'JPG',
  webp: 'WebP',
}

export const FORMAT_MIME: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const FORMAT_EXT: Record<OutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

/** Formatos que soportan compresión por calidad. */
export function supportsQuality(format: OutputFormat): boolean {
  return format === 'jpeg' || format === 'webp'
}

export type ResizeOptions = {
  /** Ancho objetivo en px. null = automático. */
  width: number | null
  /** Alto objetivo en px. null = automático. */
  height: number | null
  /** Mantener proporción del original. */
  keepAspect: boolean
}

export type ConvertOptions = {
  format: OutputFormat
  /** Calidad 0..1 (sólo JPG/WebP). */
  quality: number
  resize: ResizeOptions
}

export type SourceImage = {
  bitmap: ImageBitmap
  width: number
  height: number
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/avif']

export function isAcceptedImage(file: File): boolean {
  if (file.type) return ACCEPTED_TYPES.includes(file.type) || file.type.startsWith('image/')
  return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)
}

/** Decodifica un File a ImageBitmap, exponiendo dimensiones originales. */
export async function loadSourceImage(file: File): Promise<SourceImage> {
  const bitmap = await createImageBitmap(file)
  return { bitmap, width: bitmap.width, height: bitmap.height }
}

/**
 * Calcula las dimensiones finales dadas las opciones de resize.
 * - keepAspect respeta la proporción original aun si se dan ambos ejes.
 * - Si no se especifica ningún eje, se conservan las dimensiones originales.
 */
export function computeDimensions(
  srcWidth: number,
  srcHeight: number,
  resize: ResizeOptions,
): { width: number; height: number } {
  const { width: w, height: h, keepAspect } = resize
  const ratio = srcWidth / srcHeight

  if (w == null && h == null) {
    return { width: srcWidth, height: srcHeight }
  }

  if (keepAspect) {
    if (w != null && h != null) {
      // Encajar dentro de la caja (w x h) manteniendo proporción.
      const scale = Math.min(w / srcWidth, h / srcHeight)
      return {
        width: Math.max(1, Math.round(srcWidth * scale)),
        height: Math.max(1, Math.round(srcHeight * scale)),
      }
    }
    if (w != null) {
      return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(w / ratio)) }
    }
    // h != null
    return { width: Math.max(1, Math.round((h as number) * ratio)), height: Math.max(1, Math.round(h as number)) }
  }

  // Sin mantener proporción: usar valores dados, completar el faltante con el original.
  return {
    width: Math.max(1, Math.round(w ?? srcWidth)),
    height: Math.max(1, Math.round(h ?? srcHeight)),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('No se pudo generar la imagen.'))
      },
      mime,
      quality,
    )
  })
}

/** Convierte una imagen de origen a un Blob según las opciones dadas. */
export async function convertImage(src: SourceImage, options: ConvertOptions): Promise<Blob> {
  const { width, height } = computeDimensions(src.width, src.height, options.resize)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D no disponible en este navegador.')

  // PNG soporta transparencia; JPG no. Para JPG rellenamos fondo blanco.
  if (options.format === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src.bitmap, 0, 0, width, height)

  const mime = FORMAT_MIME[options.format]
  const quality = supportsQuality(options.format) ? options.quality : undefined
  return canvasToBlob(canvas, mime, quality)
}

/** Cambia la extensión de un nombre de archivo por la del formato destino. */
export function rename(originalName: string, format: OutputFormat): string {
  const base = originalName.replace(/\.[^.]+$/, '')
  return `${base || 'imagen'}.${FORMAT_EXT[format]}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
