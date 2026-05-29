import { z } from 'zod'

export const IDEAS_BOARD_KEY = 'ideas-board:v1'

export const IDEA_CATEGORIES = [
  'Sistemas',
  'Errores de Odoo',
  'Errores de Sistema',
  'Ideas de actividades',
  'Empresa en general',
] as const

export const IDEA_STATUSES = [
  'abierta',
  'en revisión',
  'planificada',
  'resuelta',
] as const

export const ideaCategorySchema = z.enum(IDEA_CATEGORIES)
export const ideaStatusSchema = z.enum(IDEA_STATUSES)

const cleanText = (max: number) =>
  z.string().trim().min(1, 'Campo requerido').max(max, `Máximo ${max} caracteres`)

export const createIdeaSchema = z.object({
  title: cleanText(120),
  description: cleanText(2000),
  category: ideaCategorySchema,
})

export const ideaIdSchema = z.object({
  ideaId: z.string().min(1),
})

export const commentSchema = ideaIdSchema.extend({
  body: cleanText(1000),
})

export const updateStatusSchema = ideaIdSchema.extend({
  status: ideaStatusSchema,
})

export const voteSchema = ideaIdSchema
export const deleteIdeaSchema = ideaIdSchema

export const boardCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
})

export const ideaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: ideaCategorySchema,
  status: ideaStatusSchema.default('abierta'),
  authorId: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  votes: z.array(z.string()).default([]),
  comments: z.array(boardCommentSchema).default([]),
})

export const boardSchema = z.object({
  ideas: z.array(ideaSchema).default([]),
})

export type IdeaCategory = z.infer<typeof ideaCategorySchema>
export type IdeaStatus = z.infer<typeof ideaStatusSchema>
export type BoardComment = z.infer<typeof boardCommentSchema>
export type Idea = z.infer<typeof ideaSchema>
export type IdeasBoard = z.infer<typeof boardSchema>
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>

export type IdeasBoardView = IdeasBoard & {
  currentUserId: string
  canModerate: boolean
}

export function parseBoard(value: unknown): IdeasBoard {
  const parsed = boardSchema.safeParse(value)
  if (!parsed.success) return { ideas: [] }

  return {
    ideas: parsed.data.ideas
      .map((idea) => ({
        ...idea,
        votes: Array.from(new Set(idea.votes)),
        comments: idea.comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      }))
      .sort((a, b) => {
        const votes = b.votes.length - a.votes.length
        if (votes !== 0) return votes
        return b.createdAt.localeCompare(a.createdAt)
      }),
  }
}
