import { z } from 'zod'

export const extractionTypes = ['factura', 'recibo', 'documento-general'] as const

export const analyzeDocumentInputSchema = z.object({
  extractionType: z.enum(extractionTypes),
  manualText: z.string().max(20_000).optional(),
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(180),
        mimeType: z.string().min(1).max(80),
        dataUrl: z.string().max(12_000_000),
      }),
    )
    .max(3)
    .default([]),
})

export type ExtractionType = (typeof extractionTypes)[number]
export type AnalyzeDocumentInput = z.infer<typeof analyzeDocumentInputSchema>

export type AnalyzeDocumentResult = {
  ok: boolean
  configured: boolean
  mode: 'nvidia' | 'demo' | 'error'
  summary: string
  jsonText: string
  error?: string
}
