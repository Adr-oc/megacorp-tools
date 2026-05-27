'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SIGNATURE_FIELD_LABELS,
  type SignatureField,
  type SignatureTemplate,
} from '@/lib/email-signature/schema'

type Props = {
  template: SignatureTemplate
  values: Partial<Record<SignatureField, string>>
  onChange: (values: Partial<Record<SignatureField, string>>) => void
}

export function UserDataForm({ template, values, onChange }: Props) {
  const [local, setLocal] = useState(values)

  function update(field: SignatureField, value: string) {
    const next = { ...local, [field]: value }
    setLocal(next)
    onChange(next)
  }

  const editable = template.editableFields

  if (editable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tu administrador no habilitó campos editables. La firma usa valores fijos.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {editable.map((field) => {
        const isLong = field === 'descripcion'
        return (
          <div key={field} className="grid gap-1.5">
            <Label htmlFor={`field-${field}`}>{SIGNATURE_FIELD_LABELS[field]}</Label>
            {isLong ? (
              <textarea
                id={`field-${field}`}
                value={local[field] ?? ''}
                onChange={(e) => update(field, e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            ) : (
              <Input
                id={`field-${field}`}
                value={local[field] ?? ''}
                onChange={(e) => update(field, e.target.value)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
