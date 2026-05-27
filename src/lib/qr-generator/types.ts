export type QrContentType = 'url' | 'text' | 'vcard' | 'wifi'

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export type WifiEncryption = 'WPA' | 'WEP' | 'nopass'

export interface UrlContent {
  url: string
}

export interface TextContent {
  text: string
}

export interface VCardContent {
  nombre: string
  empresa: string
  telefono: string
  email: string
}

export interface WifiContent {
  ssid: string
  password: string
  cifrado: WifiEncryption
  oculta: boolean
}

export interface QrStyleOptions {
  /** Tamaño en píxeles del lado del QR (para PNG). */
  tamano: number
  /** Color de los módulos (primer plano). Formato hex #rrggbb. */
  colorPrimerPlano: string
  /** Color de fondo. Formato hex #rrggbb o #rrggbbaa. */
  colorFondo: string
  /** Nivel de corrección de error. */
  correccion: QrErrorCorrectionLevel
  /** Margen (quiet zone) en módulos. */
  margen: number
}

export const ERROR_CORRECTION_LABELS: Record<QrErrorCorrectionLevel, string> = {
  L: 'Baja (L · ~7%)',
  M: 'Media (M · ~15%)',
  Q: 'Cuartil (Q · ~25%)',
  H: 'Alta (H · ~30%)',
}

export const WIFI_ENCRYPTION_LABELS: Record<WifiEncryption, string> = {
  WPA: 'WPA/WPA2',
  WEP: 'WEP',
  nopass: 'Sin contraseña',
}

export const DEFAULT_STYLE: QrStyleOptions = {
  tamano: 320,
  colorPrimerPlano: '#000000',
  colorFondo: '#ffffff',
  correccion: 'M',
  margen: 2,
}
