import { NextResponse } from 'next/server'
import { getLearningJwks } from '@/lib/learning/webhook-sign'

/**
 * GET /api/learning/jwks
 *
 * Publica la clave pública RS256 que LearnHouse usa para validar los
 * webhooks firmados por MegaTools. Endpoint público, sin auth.
 */
export async function GET() {
  return NextResponse.json(getLearningJwks(), {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  })
}
