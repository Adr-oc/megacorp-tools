import { z } from 'zod'

export const LEARNING_LIBRARY_KEY = 'learning:v1'
export const LEARNING_PROGRESS_KEY = 'learning:progress:v1'

export const LEARNING_TYPES = ['video', 'documento', 'enlace', 'curso', 'taller'] as const
export const LEARNING_RESOURCE_TYPES = ['video', 'texto', 'clase', 'documento', 'link', 'quiz'] as const
export const LEARNING_LEVELS = ['básico', 'intermedio', 'avanzado'] as const
export const LEARNING_PROGRESS_STATUSES = [
  'pendiente',
  'en progreso',
  'completado',
] as const

export type LearningType = (typeof LEARNING_TYPES)[number]
export type LearningResourceType = (typeof LEARNING_RESOURCE_TYPES)[number]
export type LearningLevel = (typeof LEARNING_LEVELS)[number]
export type LearningProgressStatus = (typeof LEARNING_PROGRESS_STATUSES)[number]

export const LEARNING_TYPE_LABELS: Record<LearningType, string> = {
  video: 'Video',
  documento: 'Documento',
  enlace: 'Enlace',
  curso: 'Curso',
  taller: 'Taller',
}

export const LEARNING_RESOURCE_TYPE_LABELS: Record<LearningResourceType, string> = {
  video: 'Video',
  texto: 'Texto',
  clase: 'Clase',
  documento: 'Documento',
  link: 'Link',
  quiz: 'Quiz',
}

export const LEARNING_LEVEL_LABELS: Record<LearningLevel, string> = {
  básico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

export const LEARNING_PROGRESS_LABELS: Record<LearningProgressStatus, string> = {
  pendiente: 'Pendiente',
  'en progreso': 'En progreso',
  completado: 'Completado',
}

const cleanString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)

const optionalCleanString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max).optional()
  )

export const learningContentSchema = z.object({
  id: z.string().min(1),
  title: cleanString(120).min(1, 'El título es requerido'),
  description: cleanString(1000).min(1, 'La descripción es requerida'),
  type: z.enum(LEARNING_TYPES),
  category: cleanString(60).min(1, 'La categoría es requerida'),
  url: optionalCleanString(500).refine(
    (value) => !value || /^https?:\/\//i.test(value),
    'La URL debe iniciar con http:// o https://'
  ),
  duration: optionalCleanString(60),
  level: z.enum(LEARNING_LEVELS),
  published: z.boolean().default(false),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export type LearningContent = z.infer<typeof learningContentSchema>

export const learningResourceSchema = z.object({
  id: z.string().min(1),
  title: cleanString(120).min(1, 'El título del recurso es requerido'),
  type: z.enum(LEARNING_RESOURCE_TYPES),
  description: cleanString(2000).default(''),
  url: optionalCleanString(500).refine(
    (value) => !value || /^https?:\/\//i.test(value),
    'La URL debe iniciar con http:// o https://'
  ),
  duration: optionalCleanString(60),
  required: z.boolean().default(true),
})

export const learningCourseSchema = z.object({
  id: z.string().min(1),
  title: cleanString(120).min(1, 'El título del curso es requerido'),
  description: cleanString(1200).default(''),
  level: z.enum(LEARNING_LEVELS).default('básico'),
  resources: z.array(learningResourceSchema).default([]),
})

export const learningRouteSchema = z.object({
  id: z.string().min(1),
  title: cleanString(120).min(1, 'El título de la ruta es requerido'),
  description: cleanString(1600).default(''),
  category: cleanString(60).min(1, 'La categoría de la ruta es requerida'),
  level: z.enum(LEARNING_LEVELS).default('básico'),
  published: z.boolean().default(false),
  courses: z.array(learningCourseSchema).default([]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export type LearningResource = z.infer<typeof learningResourceSchema>
export type LearningCourse = z.infer<typeof learningCourseSchema>
export type LearningRoute = z.infer<typeof learningRouteSchema>

export const learningLibrarySchema = z.object({
  contents: z.array(learningContentSchema).default([]),
  routes: z.array(learningRouteSchema).default([]),
})

export type LearningLibrary = z.infer<typeof learningLibrarySchema>

export const learningProgressSchema = z.object({
  contentId: z.string().min(1),
  status: z.enum(LEARNING_PROGRESS_STATUSES),
  updatedAt: z.string().min(1),
})

export type LearningProgress = z.infer<typeof learningProgressSchema>

export const learningProgressSetSchema = z.object({
  progress: z.array(learningProgressSchema).default([]),
})

export type LearningProgressSet = z.infer<typeof learningProgressSetSchema>

export const learningContentInputSchema = learningContentSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ id: z.string().min(1).optional() })

export type LearningContentInput = z.infer<typeof learningContentInputSchema>

export const learningResourceInputSchema = learningResourceSchema.extend({ id: z.string().min(1).optional() })
export const learningCourseInputSchema = learningCourseSchema.extend({
  id: z.string().min(1).optional(),
  resources: z.array(learningResourceInputSchema).default([]),
})
export const learningRouteInputSchema = learningRouteSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    id: z.string().min(1).optional(),
    courses: z.array(learningCourseInputSchema).default([]),
  })

export type LearningRouteInput = z.infer<typeof learningRouteInputSchema>

export const progressInputSchema = z.object({
  contentId: z.string().min(1),
  status: z.enum(LEARNING_PROGRESS_STATUSES),
})

export const emptyLibrary: LearningLibrary = { contents: [], routes: [] }
export const emptyProgressSet: LearningProgressSet = { progress: [] }
