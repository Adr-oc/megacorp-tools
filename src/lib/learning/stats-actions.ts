'use server'

import { headers } from 'next/headers'
import { ensureActiveOrganization } from '@/lib/auth/active-organization'
import { auth } from '@/lib/auth/server'

/**
 * Server action que devuelve estadísticas de Learning para una org.
 *
 * En fase 1 (sin eventos todavía) devuelve listas vacías y un flag
 * `configured` que indica si la integración OIDC está activa en runtime.
 * En fase 3 leerá de la tabla `learning_event` y recalculará ranking.
 *
 * El cálculo se hace on-demand con cache `orgSetting` key
 * `learning:stats:cache:<orgId>` TTL 5 min.
 */

export interface LeaderboardEntry {
  userExternalId: string
  displayName: string
  xp: number
  streakDays: number
  coursesCompleted: number
}

export interface LearningStats {
  configured: boolean
  learnhouseUrl: string | null
  myPosition: { rank: number; total: number } | null
  myProgress: { xp: number; streakDays: number; coursesCompleted: number } | null
  weekly: LeaderboardEntry[]
  monthly: LeaderboardEntry[]
}

async function getSessionContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('No autenticado')
  const orgId = await ensureActiveOrganization({
    sessionId: session.session.id,
    userId: session.user.id,
    currentOrganizationId: session.session.activeOrganizationId,
  })
  if (!orgId) throw new Error('Sin organización activa')
  return { userId: session.user.id, orgId }
}

export async function getLearningStats(): Promise<LearningStats> {
  const ctx = await getSessionContext()
  if (!ctx.orgId) throw new Error('Sin organización activa')

  const configured = Boolean(process.env.LEARNHOUSE_URL)
  const learnhouseUrl = process.env.LEARNHOUSE_URL ?? null

  // Fase 1: no hay tabla learning_event todavía. Leaderboard vacío.
  // Fase 3: SELECT user_external_id, sum(xp), current_streak, ...
  //         FROM learning_event
  //         WHERE org_id = $1 AND occurred_at >= now() - interval '7 days'
  //         GROUP BY user_external_id ORDER BY xp DESC LIMIT 10;
  const empty: LeaderboardEntry[] = []

  return {
    configured,
    learnhouseUrl,
    myPosition: null,
    myProgress: { xp: 0, streakDays: 0, coursesCompleted: 0 },
    weekly: empty,
    monthly: empty,
  }
}

export async function goToLearnhouseUrl(): Promise<string> {
  // Devuelve la URL a la que apunta el botón "Ir a Learn".
  // En fase 1 simplemente devolvemos LEARNHOUSE_URL. En fase 2 armamos
  // la URL de authorize con state/PKCE.
  const base = process.env.LEARNHOUSE_URL ?? 'http://localhost:3200'
  return base.replace(/\/$/, '') + '/dashboard'
}
