'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DEFAULT_TEMPLATE_HTML,
  MAX_TEMPLATES,
  newTemplateId,
  type SignatureField,
  type SignatureTemplate,
} from '@/lib/email-signature/schema'
import { saveTemplates } from '@/lib/email-signature/actions'
import { TemplateEditor } from './template-editor'

type Props = {
  templates: SignatureTemplate[]
  onChange: (templates: SignatureTemplate[]) => void
  selectedId: string | null
  onSelect: (id: string) => void
}

const DEFAULT_EDITABLE: SignatureField[] = [
  'nombre',
  'puesto',
  'descripcion',
  'correo',
  'telefono',
]

export function TemplateManager({
  templates,
  onChange,
  selectedId,
  onSelect,
}: Props) {
  const [saving, setSaving] = useState(false)

  const current =
    templates.find((t) => t.id === selectedId) ?? templates[0] ?? null

  function addTemplate() {
    if (templates.length >= MAX_TEMPLATES) return
    const tpl: SignatureTemplate = {
      id: newTemplateId(),
      name: `Plantilla ${templates.length + 1}`,
      html: DEFAULT_TEMPLATE_HTML,
      images: [],
      editableFields: [...DEFAULT_EDITABLE],
      fixedValues: {},
    }
    onChange([...templates, tpl])
    onSelect(tpl.id)
  }

  function updateCurrent(next: SignatureTemplate) {
    onChange(templates.map((t) => (t.id === next.id ? next : t)))
  }

  function removeTemplate(id: string) {
    const next = templates.filter((t) => t.id !== id)
    onChange(next)
    if (selectedId === id && next[0]) onSelect(next[0].id)
  }

  async function onSave() {
    setSaving(true)
    try {
      const res = await saveTemplates({ templates })
      if (res.ok) toast.success('Plantillas guardadas para toda la organización')
      else toast.error(res.error)
    } catch {
      toast.error('Error al guardar las plantillas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center">
            <Button
              type="button"
              size="sm"
              variant={t.id === current?.id ? 'default' : 'outline'}
              className="rounded-r-none"
              onClick={() => onSelect(t.id)}
            >
              {t.name || 'Sin nombre'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-l-none border-l-0 px-2"
              onClick={() => removeTemplate(t.id)}
              aria-label={`Borrar ${t.name}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={addTemplate}
          disabled={templates.length >= MAX_TEMPLATES}
        >
          <Plus className="size-4" />
          Nueva plantilla
        </Button>
      </div>

      {templates.length >= MAX_TEMPLATES ? (
        <p className="text-xs text-muted-foreground">
          Alcanzaste el máximo de {MAX_TEMPLATES} plantillas.
        </p>
      ) : null}

      {current ? (
        <TemplateEditor template={current} onChange={updateCurrent} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Aún no hay plantillas. Creá una con “Nueva plantilla”.
        </p>
      )}

      <Button onClick={onSave} disabled={saving}>
        <Save className="size-4" />
        {saving ? 'Guardando…' : 'Guardar plantillas'}
      </Button>
    </div>
  )
}
