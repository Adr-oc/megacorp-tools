'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { Trash2, ImagePlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SIGNATURE_FIELDS,
  SIGNATURE_FIELD_LABELS,
  type SignatureField,
  type SignatureTemplate,
  type TemplateImage,
} from '@/lib/email-signature/schema'

type Props = {
  template: SignatureTemplate
  onChange: (template: SignatureTemplate) => void
}

const MAX_IMG_BYTES = 1_400_000

export function TemplateEditor({ template, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  function patch(next: Partial<SignatureTemplate>) {
    onChange({ ...template, ...next })
  }

  function toggleEditable(field: SignatureField) {
    const has = template.editableFields.includes(field)
    patch({
      editableFields: has
        ? template.editableFields.filter((f) => f !== field)
        : [...template.editableFields, field],
    })
  }

  function setFixed(field: SignatureField, value: string) {
    patch({ fixedValues: { ...template.fixedValues, [field]: value } })
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const next: TemplateImage[] = [...template.images]
    for (const file of Array.from(files)) {
      if (file.size > MAX_IMG_BYTES) {
        toast.error(`"${file.name}" supera ~1.4 MB`)
        continue
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      next.push({
        id: crypto.randomUUID().slice(0, 8),
        name: file.name,
        dataUrl,
      })
    }
    patch({ images: next.slice(0, 8) })
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeImage(id: string) {
    patch({ images: template.images.filter((i) => i.id !== id) })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-1.5">
        <Label htmlFor="tpl-name">Nombre de la plantilla</Label>
        <Input
          id="tpl-name"
          value={template.name}
          maxLength={60}
          placeholder="Ej.: Formal, Comercial…"
          onChange={(e) => patch({ name: e.target.value })}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tpl-html">HTML de la plantilla</Label>
        <p className="text-xs text-muted-foreground">
          Usá variables como {'{{nombre}}'}, {'{{puesto}}'}, {'{{correo}}'},{' '}
          {'{{telefono}}'}, {'{{empresa}}'}, {'{{descripcion}}'}. Para imágenes:{' '}
          {'{{logo}}'} (primera imagen) o {'{{img:ID}}'}.
        </p>
        <textarea
          id="tpl-html"
          value={template.html}
          onChange={(e) => patch({ html: e.target.value })}
          rows={12}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Imágenes (logo / banners)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Subir imagen
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        {template.images.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin imágenes todavía.</p>
        ) : (
          <ul className="grid gap-2">
            {template.images.map((img) => (
              <li
                key={img.id}
                className="flex items-center gap-3 rounded-lg border p-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-10 w-auto max-w-24 object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{img.name}</p>
                  <code className="text-xs text-muted-foreground">
                    {'{{img:' + img.id + '}}'}
                  </code>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeImage(img.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Campos</Label>
        <p className="text-xs text-muted-foreground">
          Marcá los campos que el usuario podrá editar. Los no marcados usan el
          valor fijo que definás acá.
        </p>
        <div className="grid gap-2">
          {SIGNATURE_FIELDS.map((field) => {
            const editable = template.editableFields.includes(field)
            return (
              <div
                key={field}
                className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg border p-2"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editable}
                    onChange={() => toggleEditable(field)}
                  />
                  <span className="w-28">{SIGNATURE_FIELD_LABELS[field]}</span>
                </label>
                <Input
                  placeholder={
                    editable ? 'Valor por defecto (opcional)' : 'Valor fijo'
                  }
                  value={template.fixedValues[field] ?? ''}
                  onChange={(e) => setFixed(field, e.target.value)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
