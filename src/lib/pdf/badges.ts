import type { Badge } from './types'

// Paleta de 8 colores accesibles (contraste >4.5 sobre fondo blanco)
const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
] as const

function labelFromName(name: string): string {
  // "Contrato Aduana 2026.pdf" → "CON"
  const base = name.replace(/\.pdf$/i, '').trim()
  const letters = base.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return letters.slice(0, 3) || 'PDF'
}

export function buildBadge(name: string, loadedCount: number): Badge {
  // Rota la paleta según cuántos PDFs ya hay cargados
  const color = PALETTE[loadedCount % PALETTE.length]!
  return { label: labelFromName(name), color }
}
