// Lógica pura de conversión de unidades físicas (sin red).
// Para longitud, peso y volumen usamos un factor a una unidad base.
// Temperatura se maneja aparte por ser una conversión afín (no lineal pura).

export type CategoryId = 'length' | 'weight' | 'volume' | 'temperature' | 'currency'

export type UnitDef = {
  id: string
  label: string
  // Factor para convertir DESDE esta unidad HACIA la unidad base de la categoría.
  // valorBase = valor * toBase
  toBase: number
}

export type Category = {
  id: CategoryId
  label: string
  units: UnitDef[]
}

// Unidad base longitud: metro
const length: Category = {
  id: 'length',
  label: 'Longitud',
  units: [
    { id: 'km', label: 'Kilómetro (km)', toBase: 1000 },
    { id: 'm', label: 'Metro (m)', toBase: 1 },
    { id: 'cm', label: 'Centímetro (cm)', toBase: 0.01 },
    { id: 'mm', label: 'Milímetro (mm)', toBase: 0.001 },
    { id: 'mile', label: 'Milla', toBase: 1609.344 },
    { id: 'yard', label: 'Yarda', toBase: 0.9144 },
    { id: 'foot', label: 'Pie', toBase: 0.3048 },
    { id: 'inch', label: 'Pulgada', toBase: 0.0254 },
  ],
}

// Unidad base peso: gramo
const weight: Category = {
  id: 'weight',
  label: 'Peso',
  units: [
    { id: 't', label: 'Tonelada', toBase: 1_000_000 },
    { id: 'kg', label: 'Kilogramo (kg)', toBase: 1000 },
    { id: 'g', label: 'Gramo (g)', toBase: 1 },
    { id: 'mg', label: 'Miligramo (mg)', toBase: 0.001 },
    { id: 'lb', label: 'Libra (lb)', toBase: 453.59237 },
    { id: 'oz', label: 'Onza (oz)', toBase: 28.349523125 },
  ],
}

// Unidad base volumen: litro
const volume: Category = {
  id: 'volume',
  label: 'Volumen',
  units: [
    { id: 'm3', label: 'Metro cúbico (m³)', toBase: 1000 },
    { id: 'l', label: 'Litro (l)', toBase: 1 },
    { id: 'ml', label: 'Mililitro (ml)', toBase: 0.001 },
    { id: 'gal', label: 'Galón (US)', toBase: 3.785411784 },
  ],
}

// Temperatura: unidades manejadas con funciones afines (base = Celsius).
const temperature: Category = {
  id: 'temperature',
  label: 'Temperatura',
  units: [
    { id: 'C', label: 'Celsius (°C)', toBase: 1 },
    { id: 'F', label: 'Fahrenheit (°F)', toBase: 1 },
    { id: 'K', label: 'Kelvin (K)', toBase: 1 },
  ],
}

export const categories: Category[] = [length, weight, volume, temperature]

export function getCategory(id: CategoryId): Category | undefined {
  return categories.find((c) => c.id === id)
}

function tempToCelsius(value: number, from: string): number {
  switch (from) {
    case 'C':
      return value
    case 'F':
      return (value - 32) * (5 / 9)
    case 'K':
      return value - 273.15
    default:
      return value
  }
}

function celsiusTo(celsius: number, to: string): number {
  switch (to) {
    case 'C':
      return celsius
    case 'F':
      return celsius * (9 / 5) + 32
    case 'K':
      return celsius + 273.15
    default:
      return celsius
  }
}

export function convert(
  categoryId: CategoryId,
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  if (categoryId === 'temperature') {
    return celsiusTo(tempToCelsius(value, fromUnit), toUnit)
  }

  const category = getCategory(categoryId)
  if (!category) return NaN

  const from = category.units.find((u) => u.id === fromUnit)
  const to = category.units.find((u) => u.id === toUnit)
  if (!from || !to) return NaN

  const base = value * from.toBase
  return base / to.toBase
}

// Formatea un resultado numérico de forma legible.
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e9 || abs < 1e-6) {
    return value.toExponential(6).replace(/\.?0+e/, 'e')
  }
  // Hasta 6 decimales significativos, sin ceros sobrantes.
  return parseFloat(value.toPrecision(10)).toLocaleString('es-GT', {
    maximumFractionDigits: 6,
  })
}
