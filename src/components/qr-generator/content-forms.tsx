'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  WIFI_ENCRYPTION_LABELS,
  type QrContentType,
  type WifiEncryption,
} from '@/lib/qr-generator/types'
import type { QrFormState } from '@/lib/qr-generator/payload'

interface ContentFormsProps {
  type: QrContentType
  state: QrFormState
  setState: Dispatch<SetStateAction<QrFormState>>
}

export function ContentForms({ type, state, setState }: ContentFormsProps) {
  if (type === 'url') {
    return (
      <div className="space-y-2">
        <Label htmlFor="qr-url">Dirección (URL)</Label>
        <Input
          id="qr-url"
          type="url"
          inputMode="url"
          placeholder="https://ejemplo.com.gt"
          value={state.url.url}
          onChange={(e) =>
            setState((s) => ({ ...s, url: { url: e.target.value } }))
          }
        />
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div className="space-y-2">
        <Label htmlFor="qr-text">Texto</Label>
        <textarea
          id="qr-text"
          rows={5}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          placeholder="Escribí el texto que querés codificar…"
          value={state.text.text}
          onChange={(e) =>
            setState((s) => ({ ...s, text: { text: e.target.value } }))
          }
        />
      </div>
    )
  }

  if (type === 'vcard') {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="vc-nombre">Nombre completo</Label>
          <Input
            id="vc-nombre"
            placeholder="Juan Pérez"
            value={state.vcard.nombre}
            onChange={(e) =>
              setState((s) => ({ ...s, vcard: { ...s.vcard, nombre: e.target.value } }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vc-empresa">Empresa</Label>
          <Input
            id="vc-empresa"
            placeholder="EGAMSA"
            value={state.vcard.empresa}
            onChange={(e) =>
              setState((s) => ({ ...s, vcard: { ...s.vcard, empresa: e.target.value } }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vc-telefono">Teléfono</Label>
          <Input
            id="vc-telefono"
            type="tel"
            inputMode="tel"
            placeholder="+502 5555 5555"
            value={state.vcard.telefono}
            onChange={(e) =>
              setState((s) => ({ ...s, vcard: { ...s.vcard, telefono: e.target.value } }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vc-email">Correo electrónico</Label>
          <Input
            id="vc-email"
            type="email"
            inputMode="email"
            placeholder="juan.perez@egamsa.com"
            value={state.vcard.email}
            onChange={(e) =>
              setState((s) => ({ ...s, vcard: { ...s.vcard, email: e.target.value } }))
            }
          />
        </div>
      </div>
    )
  }

  // WiFi
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="wifi-ssid">Nombre de red (SSID)</Label>
        <Input
          id="wifi-ssid"
          placeholder="MiRedWiFi"
          value={state.wifi.ssid}
          onChange={(e) =>
            setState((s) => ({ ...s, wifi: { ...s.wifi, ssid: e.target.value } }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wifi-cifrado">Cifrado</Label>
        <Select
          value={state.wifi.cifrado}
          onValueChange={(v) =>
            setState((s) => ({
              ...s,
              wifi: { ...s.wifi, cifrado: (v ?? 'WPA') as WifiEncryption },
            }))
          }
        >
          <SelectTrigger id="wifi-cifrado" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(WIFI_ENCRYPTION_LABELS) as WifiEncryption[]).map((k) => (
              <SelectItem key={k} value={k}>
                {WIFI_ENCRYPTION_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {state.wifi.cifrado !== 'nopass' && (
        <div className="space-y-2">
          <Label htmlFor="wifi-password">Contraseña</Label>
          <Input
            id="wifi-password"
            type="text"
            placeholder="••••••••"
            value={state.wifi.password}
            onChange={(e) =>
              setState((s) => ({ ...s, wifi: { ...s.wifi, password: e.target.value } }))
            }
          />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-input accent-brand-accent"
          checked={state.wifi.oculta}
          onChange={(e) =>
            setState((s) => ({ ...s, wifi: { ...s.wifi, oculta: e.target.checked } }))
          }
        />
        Red oculta
      </label>
    </div>
  )
}
