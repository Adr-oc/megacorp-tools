import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET debe tener al menos 32 caracteres'),
  BETTER_AUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // OIDC / LearnHouse integration (fase 1+)
  LEARNHOUSE_URL: z.string().url().optional(),
  LEARNHOUSE_CLIENT_SECRET: z.string().min(16).optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Variables de entorno inválidas. Revisa .env contra .env.example.')
}

export const env = parsed.data
