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

// Máximo de plantillas por organización.
export const MAX_TEMPLATES = 6

// HTML generado por editores de firmas puede venir muy verboso: tablas
// anidadas, CSS inline e incluso data URLs pequeñas. 100 KB era demasiado
// bajo para plantillas reales.
export const MAX_TEMPLATE_HTML_CHARS = 1_000_000

// Una plantilla individual de firma definida por el admin.
// Valor fijo por defecto para un campo (si no es editable por el usuario,
// se usa este valor; si es editable, sirve como placeholder/valor inicial).
export const signatureTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'El nombre es requerido').max(60),
  html: z
    .string()
    .min(1, 'El HTML de la plantilla es requerido')
    .max(
      MAX_TEMPLATE_HTML_CHARS,
      'El HTML de la plantilla es demasiado grande (máx 1 MB)'
    ),
  images: z.array(templateImageSchema).max(8).default([]),
  // Campos que el usuario puede editar.
  editableFields: z.array(z.enum(SIGNATURE_FIELDS)).default([]),
  // Valores fijos definidos por el admin (para campos no editables o por defecto).
  fixedValues: z.record(z.string(), z.string()).default({}),
})

export type SignatureTemplate = z.infer<typeof signatureTemplateSchema>

// Conjunto de plantillas de la organización (formato nuevo en orgSetting).
export const templateSetSchema = z.object({
  templates: z.array(signatureTemplateSchema).max(MAX_TEMPLATES).default([]),
})

export type TemplateSet = z.infer<typeof templateSetSchema>

// Formato VIEJO: una sola plantilla guardada directamente bajo TEMPLATE_KEY,
// sin id, sin name y sin array. Se usa solo para migrar al leer.
export const legacyTemplateSchema = z.object({
  html: z.string().min(1).max(MAX_TEMPLATE_HTML_CHARS),
  images: z.array(templateImageSchema).max(8).default([]),
  editableFields: z.array(z.enum(SIGNATURE_FIELDS)).default([]),
  fixedValues: z.record(z.string(), z.string()).default({}),
})

// Datos que completa el usuario (compartidos entre plantillas) + selección.
export const dataSchema = z.object({
  values: z.record(z.string(), z.string()).default({}),
  selectedTemplateId: z.string().optional(),
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

const DEFAULT_COMPACT_HTML = `<table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; color: #1f2937;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: bold; color: #111827;">{{nombre}}</div>
      <div style="font-size: 12px; color: #6b7280;">{{puesto}} · {{empresa}}</div>
      <div style="font-size: 12px;">{{correo}} &nbsp;|&nbsp; {{telefono}}</div>
    </td>
  </tr>
</table>`

// Plantillas de ejemplo por defecto (cuando la org aún no definió ninguna).
export function defaultTemplates(): SignatureTemplate[] {
  const editableFields: SignatureField[] = [
    'nombre',
    'puesto',
    'descripcion',
    'correo',
    'telefono',
  ]
  return [
    {
      id: 'tpl-formal',
      name: 'Formal',
      html: DEFAULT_TEMPLATE_HTML,
      images: [],
      editableFields,
      fixedValues: {},
    },
    {
      id: 'tpl-compacta',
      name: 'Compacta',
      html: DEFAULT_COMPACT_HTML,
      images: [],
      editableFields: ['nombre', 'puesto', 'correo', 'telefono'],
      fixedValues: {},
    },
  ]
}

// Genera un id único corto para una plantilla nueva.
export function newTemplateId(): string {
  return 'tpl-' + crypto.randomUUID().slice(0, 8)
}

// Migra un valor crudo de orgSetting (que puede estar en formato viejo o nuevo)
// a la forma nueva { templates: [...] }. Devuelve null si no hay nada válido.
export function migrateTemplateValue(value: unknown): TemplateSet | null {
  // Formato nuevo: { templates: [...] }
  const asSet = templateSetSchema.safeParse(value)
  if (asSet.success) return asSet.data

  // Formato viejo: una sola plantilla sin array.
  const legacy = legacyTemplateSchema.safeParse(value)
  if (legacy.success) {
    return {
      templates: [
        {
          id: newTemplateId(),
          name: 'Plantilla 1',
          ...legacy.data,
        },
      ],
    }
  }

  return null
}
