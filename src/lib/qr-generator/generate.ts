import QRCode from 'qrcode'
import type { QrStyleOptions } from './types'

function rendererOptions(style: QrStyleOptions): QRCode.QRCodeRenderersOptions {
  return {
    errorCorrectionLevel: style.correccion,
    margin: style.margen,
    color: {
      dark: style.colorPrimerPlano,
      light: style.colorFondo,
    },
  }
}

/** Genera un Data URL PNG del QR para el payload dado. */
export async function generatePngDataUrl(
  payload: string,
  style: QrStyleOptions,
): Promise<string> {
  return QRCode.toDataURL(payload, {
    ...rendererOptions(style),
    type: 'image/png',
    width: style.tamano,
  })
}

/** Genera el contenido SVG (string) del QR para el payload dado. */
export async function generateSvgString(
  payload: string,
  style: QrStyleOptions,
): Promise<string> {
  return QRCode.toString(payload, {
    ...rendererOptions(style),
    type: 'svg',
    width: style.tamano,
  })
}

/** Dibuja el QR en un canvas existente (para preview en vivo). */
export async function drawToCanvas(
  canvas: HTMLCanvasElement,
  payload: string,
  style: QrStyleOptions,
): Promise<void> {
  await QRCode.toCanvas(canvas, payload, {
    ...rendererOptions(style),
    width: style.tamano,
  })
}

/** Dispara la descarga de un Data URL / string como archivo. */
export function downloadFile(content: string, filename: string, mime?: string): void {
  let href = content
  if (mime && !content.startsWith('data:')) {
    const blob = new Blob([content], { type: mime })
    href = URL.createObjectURL(blob)
  }
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  if (href.startsWith('blob:')) {
    URL.revokeObjectURL(href)
  }
}
