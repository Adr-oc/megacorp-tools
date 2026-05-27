import type {
  QrContentType,
  TextContent,
  UrlContent,
  VCardContent,
  WifiContent,
} from './types'

/** Escapa caracteres especiales para el formato WiFi (\, ;, ,, ", :). */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,":])/g, '\\$1')
}

/** Escapa saltos de línea y caracteres reservados para vCard 3.0. */
function escapeVcard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function buildUrlPayload(content: UrlContent): string {
  return content.url.trim()
}

export function buildTextPayload(content: TextContent): string {
  return content.text
}

export function buildVCardPayload(content: VCardContent): string {
  const nombre = content.nombre.trim()
  const empresa = content.empresa.trim()
  const telefono = content.telefono.trim()
  const email = content.email.trim()

  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0']
  if (nombre) {
    lines.push(`N:${escapeVcard(nombre)}`)
    lines.push(`FN:${escapeVcard(nombre)}`)
  }
  if (empresa) lines.push(`ORG:${escapeVcard(empresa)}`)
  if (telefono) lines.push(`TEL;TYPE=CELL:${escapeVcard(telefono)}`)
  if (email) lines.push(`EMAIL:${escapeVcard(email)}`)
  lines.push('END:VCARD')
  return lines.join('\n')
}

export function buildWifiPayload(content: WifiContent): string {
  const ssid = escapeWifi(content.ssid.trim())
  if (content.cifrado === 'nopass') {
    return `WIFI:T:nopass;S:${ssid};${content.oculta ? 'H:true;' : ''};`
  }
  const password = escapeWifi(content.password)
  return `WIFI:T:${content.cifrado};S:${ssid};P:${password};${content.oculta ? 'H:true;' : ''};`
}

export interface QrFormState {
  url: UrlContent
  text: TextContent
  vcard: VCardContent
  wifi: WifiContent
}

/** Arma el payload de texto según el tipo de contenido seleccionado. */
export function buildPayload(type: QrContentType, state: QrFormState): string {
  switch (type) {
    case 'url':
      return buildUrlPayload(state.url)
    case 'text':
      return buildTextPayload(state.text)
    case 'vcard':
      return buildVCardPayload(state.vcard)
    case 'wifi':
      return buildWifiPayload(state.wifi)
    default:
      return ''
  }
}

/** Indica si hay contenido suficiente para generar un QR. */
export function hasContent(type: QrContentType, state: QrFormState): boolean {
  switch (type) {
    case 'url':
      return state.url.url.trim().length > 0
    case 'text':
      return state.text.text.trim().length > 0
    case 'vcard':
      return (
        state.vcard.nombre.trim().length > 0 ||
        state.vcard.empresa.trim().length > 0 ||
        state.vcard.telefono.trim().length > 0 ||
        state.vcard.email.trim().length > 0
      )
    case 'wifi':
      return state.wifi.ssid.trim().length > 0
    default:
      return false
  }
}
