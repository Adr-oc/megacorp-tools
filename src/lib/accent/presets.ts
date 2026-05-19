export const ACCENT_PRESETS = [
  { id: 'mustard', label: 'Mustard', hex: '#C9961B' },
  { id: 'sienna',  label: 'Sienna',  hex: '#C24A3C' },
  { id: 'forest',  label: 'Forest',  hex: '#2F6B4E' },
  { id: 'lake',    label: 'Lake',    hex: '#2A6FDB' },
  { id: 'plum',    label: 'Plum',    hex: '#7B3F8C' },
  { id: 'slate',   label: 'Slate',   hex: '#475569' },
] as const

export type AccentColor = (typeof ACCENT_PRESETS)[number]['id']
export const ACCENT_IDS: readonly AccentColor[] = ACCENT_PRESETS.map((p) => p.id)
export const DEFAULT_ACCENT: AccentColor = 'mustard'

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && (ACCENT_IDS as readonly string[]).includes(value)
}

export function coerceAccent(value: unknown): AccentColor {
  return isAccentColor(value) ? value : DEFAULT_ACCENT
}
