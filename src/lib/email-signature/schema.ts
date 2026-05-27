import { z } from 'zod'

export const TEMPLATE_KEY = 'email-signature:template'
export const DATA_KEY = 'email-signature:data'

// Campos variables que puede contener una plantilla de firma.
// El admin decide cuáles de estos puede editar el usuario.
export const SIGNATURE_FIELDS = [
  'nombre',
  'puesto',
  'descripcion',
  'correo',
  'telefono',
  'empresa',
] as const

export type SignatureField = (typeof SIGNATURE_FIELDS)[number]

export const SIGNATURE_FIELD_LABELS: Record<SignatureField, string> = {
  nombre: 'Nombre',
  puesto: 'Puesto',
  descripcion: 'Descripción',
  correo: 'Correo',
  telefono: 'Teléfono',
  empresa: 'Empresa',
}

// Imagen embebida como data URL (logo / banner). Son logos chicos.
export const templateImageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  // data URL base64: data:image/png;base64,....
  dataUrl: z
    .string()
    .min(1)
    .max(2_000_000, 'La imagen es demasiado grande (máx ~1.5 MB)')
    .refine((v) => v.startsWith('data:image/'), 'Debe ser una imagen (data URL)'),
})

export type TemplateImage = z.infer<typeof templateImageSchema>

// Valor fijo por defecto para un campo (si no es editable por el usuario,
// se usa este valor; si es editable, sirve como placeholder/valor inicial).
export const templateSchema = z.object({
  html: z.string().min(1, 'El HTML de la plantilla es requerido').max(100_000),
  images: z.array(templateImageSchema).max(8).default([]),
  // Campos que el usuario puede editar.
  editableFields: z.array(z.enum(SIGNATURE_FIELDS)).default([]),
  // Valores fijos definidos por el admin (para campos no editables o por defecto).
  fixedValues: z.record(z.string(), z.string()).default({}),
})

export type SignatureTemplate = z.infer<typeof templateSchema>

// Datos que completa el usuario.
export const dataSchema = z.object({
  values: z.record(z.string(), z.string()).default({}),
})

export type SignatureData = z.infer<typeof dataSchema>

export const DEFAULT_TEMPLATE_HTML = `<table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; color: #1f2937;">
  <tr>
    {{logo}}
    <td style="padding-left: 12px; border-left: 2px solid #e5e7eb;">
      <div style="font-size: 16px; font-weight: bold; color: #111827;">{{nombre}}</div>
      <div style="font-size: 13px; color: #6b7280;">{{puesto}}</div>
      <div style="font-size: 12px; color: #9ca3af; margin: 4px 0;">{{descripcion}}</div>
      <div style="font-size: 12px;">{{empresa}}</div>
      <div style="font-size: 12px;">✉ {{correo}} &nbsp;|&nbsp; ☎ {{telefono}}</div>
    </td>
  </tr>
</table>`
