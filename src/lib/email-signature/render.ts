import {
  SIGNATURE_FIELDS,
  type SignatureField,
  type SignatureTemplate,
} from './schema'

// Escapa valores del usuario para evitar inyección de HTML en la firma.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Escapa un atributo (para src de imágenes). Solo permitimos data URLs.
function safeImageSrc(dataUrl: string): string {
  if (!dataUrl.startsWith('data:image/')) return ''
  return dataUrl.replace(/"/g, '&quot;')
}

export type RenderInput = {
  template: SignatureTemplate
  // valores que el usuario completó
  userValues: Partial<Record<SignatureField, string>>
}

/**
 * Renderiza la firma final sustituyendo:
 *  - {{campo}}     -> valor del usuario (si editable) o valor fijo del admin. Escapado.
 *  - {{logo}}      -> primera imagen como <td><img></td>
 *  - {{img:<id>}}  -> <img> de la imagen con ese id
 * Los valores del usuario SIEMPRE se escapan; el HTML de la plantilla lo controla el admin.
 */
export function renderSignature({ template, userValues }: RenderInput): string {
  let html = template.html

  // Sustituir imágenes por id: {{img:abc}}
  html = html.replace(/\{\{\s*img:([^}\s]+)\s*\}\}/g, (_m, id: string) => {
    const img = template.images.find((i) => i.id === id)
    if (!img) return ''
    const src = safeImageSrc(img.dataUrl)
    if (!src) return ''
    return `<img src="${src}" alt="${escapeHtml(img.name)}" style="display:inline-block;max-width:160px;height:auto;" />`
  })

  // {{logo}} -> primera imagen dentro de un <td>
  html = html.replace(/\{\{\s*logo\s*\}\}/g, () => {
    const img = template.images[0]
    if (!img) return ''
    const src = safeImageSrc(img.dataUrl)
    if (!src) return ''
    return `<td style="padding-right:12px;vertical-align:top;"><img src="${src}" alt="${escapeHtml(
      img.name
    )}" style="display:inline-block;max-width:120px;height:auto;" /></td>`
  })

  // Campos variables
  for (const field of SIGNATURE_FIELDS) {
    const editable = template.editableFields.includes(field)
    const fixed = template.fixedValues[field] ?? ''
    const raw = editable ? userValues[field] ?? fixed : fixed
    const escaped = escapeHtml(raw ?? '')
    const re = new RegExp(`\\{\\{\\s*${field}\\s*\\}\\}`, 'g')
    html = html.replace(re, escaped)
  }

  return html
}

// Versión solo texto (text/plain) para el portapapeles.
export function renderSignatureText({ template, userValues }: RenderInput): string {
  const html = renderSignature({ template, userValues })
  return html
    .replace(/<\/(td|tr|div|p|table|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{2,}/g, '\n')
    .trim()
}
