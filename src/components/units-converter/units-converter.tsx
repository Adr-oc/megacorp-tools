'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categories, convert, formatResult, type CategoryId } from '@/lib/units-converter/conversions'
import { CurrencyConverter } from './currency-converter'

type Tab = CategoryId

const TABS: { id: Tab; label: string }[] = [
  { id: 'length', label: 'Longitud' },
  { id: 'weight', label: 'Peso' },
  { id: 'volume', label: 'Volumen' },
  { id: 'temperature', label: 'Temperatura' },
  { id: 'currency', label: 'Moneda' },
]

export function UnitsConverter() {
  const [tab, setTab] = useState<Tab>('length')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversor de unidades</h1>
        <p className="text-sm text-muted-foreground">
          Longitud, peso, volumen, temperatura y moneda con tasa del Banguat en vivo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              'rounded-lg px-3 py-1.5 text-sm transition-colors ' +
              (tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'currency' ? <CurrencyConverter /> : <PhysicalConverter categoryId={tab} />}
    </div>
  )
}

function PhysicalConverter({ categoryId }: { categoryId: Exclude<CategoryId, 'currency'> }) {
  const category = useMemo(
    () => categories.find((c) => c.id === categoryId)!,
    [categoryId]
  )

  const firstId = category.units[0]!.id
  const secondId = category.units[1]?.id ?? firstId

  const [value, setValue] = useState('1')
  const [fromUnit, setFromUnit] = useState(firstId)
  const [toUnit, setToUnit] = useState(secondId)

  // Reinicia unidades al cambiar de categoría.
  const [lastCat, setLastCat] = useState(categoryId)
  if (lastCat !== categoryId) {
    setLastCat(categoryId)
    setFromUnit(firstId)
    setToUnit(secondId)
  }

  const numeric = parseFloat(value)
  const result =
    value.trim() === '' || Number.isNaN(numeric)
      ? null
      : convert(categoryId, numeric, fromUnit, toUnit)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{category.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="from-value">Cantidad</Label>
            <Input
              id="from-value"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <Select value={fromUnit} onValueChange={(v) => v && setFromUnit(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {category.units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-value">Resultado</Label>
            <Input
              id="to-value"
              readOnly
              value={result === null ? '' : formatResult(result)}
              placeholder="—"
            />
            <Select value={toUnit} onValueChange={(v) => v && setToUnit(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {category.units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setFromUnit(toUnit)
            setToUnit(fromUnit)
          }}
          className="text-sm text-primary hover:underline"
        >
          ↔ Invertir unidades
        </button>
      </CardContent>
    </Card>
  )
}
