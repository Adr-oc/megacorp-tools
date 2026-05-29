import { z } from 'zod'

export const ANNOUNCEMENTS_KEY = 'announcements:v1'

export const announcementSeveritySchema = z.enum(['info', 'importante', 'urgente'])
export const announcementStatusSchema = z.enum(['published', 'draft'])

export const announcementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
  severity: announcementSeveritySchema.default('info'),
  status: announcementStatusSchema.default('draft'),
  sendByEmail: z.boolean().default(false),
  emailStatus: z.enum(['none', 'pending']).default('none'),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  readBy: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const announcementsDataSchema = z.object({
  announcements: z.array(announcementSchema).default([]),
})

export const announcementInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(120, 'El título es muy largo'),
  body: z.string().trim().min(5, 'El cuerpo debe tener al menos 5 caracteres').max(4000, 'El cuerpo es muy largo'),
  severity: announcementSeveritySchema,
  status: announcementStatusSchema,
  sendByEmail: z.boolean().default(false),
})

export const announcementReadInputSchema = z.object({
  id: z.string().min(1),
  read: z.boolean(),
})

export type AnnouncementSeverity = z.infer<typeof announcementSeveritySchema>
export type AnnouncementStatus = z.infer<typeof announcementStatusSchema>
export type Announcement = z.infer<typeof announcementSchema>
export type AnnouncementsData = z.infer<typeof announcementsDataSchema>
export type AnnouncementInput = z.infer<typeof announcementInputSchema>

export function parseAnnouncementsData(value: unknown): AnnouncementsData {
  const parsed = announcementsDataSchema.safeParse(value)
  if (!parsed.success) return { announcements: [] }
  return {
    announcements: parsed.data.announcements.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      return bTime - aTime
    }),
  }
}
