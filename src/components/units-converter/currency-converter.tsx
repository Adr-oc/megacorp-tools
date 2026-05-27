'use client'

import { useEffect, useState } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatResult } from '@/lib/units-converter/conversions'
import { getBanguatRate, type BanguatRate } from '@/lib/units-converter/banguat'

type CurrencyId = 'USD' | 'GTQ'

const CURRENCIES: { id: CurrencyId; label: string }[] = [
  { id: 'USD', label: 'Dólar estadounidense (USD)' },
  { id: 'GTQ', label: 'Quetzal (GTQ)' },
]

export function CurrencyConverter() {
  const [rate, setRate] = useState<BanguatRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState('1')
  const [from, setFrom] = useState<CurrencyId>('USD')
  const [to, setTo] = useState<CurrencyId>('GTQ')

  useEffect(() => {
    let active = true
    getBanguatRate()
      .then((r) => {
        if (active) setRate(r)
      })
      .catch(() => {
        if (active) setRate({ ok: false, error: 'No se pudo obtener la tasa.' })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const numeric = parseFloat(value)
  let result: number | null = null
  if (rate?.ok && !Number.isNaN(numeric) && value.trim() !== '') {
    const q = rate.referencia // quetzales por dólar
    if (from === to) {
      result = numeric
    } else if (from === 'USD' && to === 'GTQ') {
      result = numeric * q
    } else if (from === 'GTQ' && to === 'USD') {
      result = numeric / q
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moneda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <p className="text-sm text-muted-foreground">Consultando tasa del Banguat…</p>
        )}

        {!loading && rate && !rate.ok && (
          <Alert variant="destructive">
            <AlertDescription>
              Tasa no disponible: {rate.error} Intentá de nuevo más tarde.
            </AlertDescription>
          </Alert>
        )}

        {!loading && rate?.ok && (
          <p className="text-sm text-muted-foreground">
            Tasa de referencia Banguat: <strong>Q{rate.referencia.toFixed(5)}</strong> por USD
            {rate.fecha ? ` (${rate.fecha})` : ''}.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="cur-from-value">Cantidad</Label>
            <Input
              id="cur-from-value"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={!rate?.ok}
            />
            <Select value={from} onValueChange={(v) => v && setFrom(v as CurrencyId)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cur-to-value">Resultado</Label>
            <Input
              id="cur-to-value"
              readOnly
              value={result === null ? '' : formatResult(result)}
              placeholder="—"
            />
            <Select value={to} onValueChange={(v) => v && setTo(v as CurrencyId)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setFrom(to)
            setTo(from)
          }}
          className="text-sm text-primary hover:underline"
          disabled={!rate?.ok}
        >
          ↔ Invertir monedas
        </button>
      </CardContent>
    </Card>
  )
}
