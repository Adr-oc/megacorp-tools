import { z } from 'zod'

export const NOTAS_KEY = 'notas:v1'
export const MAX_NOTAS_PAGES = 200
export const MAX_NOTAS_CONTENT_CHARS = 80_000

export const notasPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'El título es requerido').max(120),
  icon: z.string().min(1).max(8).default('📝'),
  content: z.string().max(MAX_NOTAS_CONTENT_CHARS).default(''),
  tags: z.array(z.string().min(1).max(32)).max(12).default([]),
  favoriteBy: z.array(z.string()).default([]),
  archived: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastEditedById: z.string().optional(),
  lastEditedByName: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
})

export const notasWorkspaceSchema = z.object({
  version: z.literal(1).default(1),
  pages: z.array(notasPageSchema).max(MAX_NOTAS_PAGES).default([]),
})

export const saveNotasPageSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Escribí un título').max(120),
  icon: z.string().trim().min(1).max(8).default('📝'),
  content: z.string().max(MAX_NOTAS_CONTENT_CHARS).default(''),
  tags: z
    .array(z.string().trim().min(1).max(32))
    .max(12, 'Máximo 12 tags')
    .default([]),
})

export const notasPageIdSchema = z.object({ id: z.string().min(1) })

export type NotasPage = z.infer<typeof notasPageSchema>
export type NotasWorkspace = z.infer<typeof notasWorkspaceSchema>
export type SaveNotasPageInput = z.infer<typeof saveNotasPageSchema>

export const NOTAS_TEMPLATES = [
  {
    id: 'acta',
    name: 'Acta',
    icon: '🗓️',
    tags: ['reunión', 'acta'],
    title: 'Acta de reunión',
    content:
      '## Objetivo\n\n## Asistentes\n- \n\n## Temas tratados\n- \n\n## Acuerdos\n- \n\n## Próximos pasos\n- [ ] Responsable — fecha',
  },
  {
    id: 'procedimiento',
    name: 'Procedimiento',
    icon: '📋',
    tags: ['procedimiento'],
    title: 'Procedimiento',
    content:
      '## Propósito\n\n## Alcance\n\n## Pasos\n1. \n2. \n3. \n\n## Criterios de éxito\n- ',
  },
  {
    id: 'idea',
    name: 'Idea',
    icon: '💡',
    tags: ['idea'],
    title: 'Idea nueva',
    content:
      '## Problema\n\n## Propuesta\n\n## Impacto esperado\n\n## Riesgos / dudas\n- ',
  },
  {
    id: 'error-solucion',
    name: 'Error/Solución',
    icon: '🛠️',
    tags: ['soporte', 'solución'],
    title: 'Error y solución',
    content:
      '## Error\n\n## Contexto\n\n## Causa probable\n\n## Solución\n1. \n\n## Cómo verificar\n- ',
  },
  {
    id: 'politica',
    name: 'Política',
    icon: '📌',
    tags: ['política', 'empresa'],
    title: 'Política interna',
    content:
      '## Resumen\n\n## Aplica a\n\n## Regla\n\n## Excepciones\n\n## Responsable\n\n## Última revisión\n',
  },
  {
    id: 'manual',
    name: 'Manual rápido',
    icon: '🧭',
    tags: ['manual', 'guía'],
    title: 'Manual rápido',
    content:
      '## Para qué sirve\n\n## Antes de empezar\n- \n\n## Pasos\n1. \n2. \n3. \n\n## Problemas comunes\n- \n\n## Contacto / responsable\n',
  },
] as const

export function emptyNotasWorkspace(): NotasWorkspace {
  return { version: 1, pages: [] }
}

export function normalizeNotasTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 12)
}
