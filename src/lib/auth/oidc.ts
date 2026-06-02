import { and, eq } from 'drizzle-orm'
import { oidcProvider } from 'better-auth/plugins'
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'
import { env } from '@/lib/env'

/**
 * MegaTools como IdP OIDC.
 *
 * El plugin OIDC de Better Auth (en `better-auth/plugins`) emite tokens
 * RS256 firmados con las claves generadas por Better Auth. Los clientes
 * externos (LearnHouse en fase 1) se registran con `trustedClients`
 * (hardcoded, no en DB) para evitar pantalla de consentimiento.
 *
 * Custom claims inyectados vía `getAdditionalUserInfoClaim`:
 *   - megatools_role:   "admin" | "owner" | "member" | "super-admin"
 *   - megatools_org_id: id de la org activa del usuario
 *   - megatools_user_id: id del usuario (sub ya lo trae, esto es para claims extra)
 *
 * Estos claims también aparecen en el `id_token` cuando el cliente los pide
 * dentro del scope `megatools`.
 */
export function buildOidcProvider() {
  const learnhouseRedirect = env.LEARNHOUSE_URL
    ? `${env.LEARNHOUSE_URL.replace(/\/$/, '')}/auth/megatools/callback`
    : 'http://localhost:3200/auth/megatools/callback'

  return oidcProvider({
    loginPage: '/login',
    scopes: ['openid', 'profile', 'email', 'megatools', 'offline_access'],
    defaultScope: 'openid profile email megatools',
    metadata: {
      issuer: env.BETTER_AUTH_URL,
      scopes_supported: ['openid', 'profile', 'email', 'megatools', 'offline_access'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    },
    trustedClients: [
      {
        clientId: 'learnhouse',
        clientSecret: env.LEARNHOUSE_CLIENT_SECRET ?? 'dev-only-rotate-in-prod',
        redirectUrls: [learnhouseRedirect],
        type: 'web' as const,
        name: 'LearnHouse',
        disabled: false,
        skipConsent: true,
        metadata: { scope: 'openid profile email megatools' },
      },
    ],
    getAdditionalUserInfoClaim: async (user, scopes) => {
      if (!scopes.includes('megatools')) return {}

      const orgId = (user as { activeOrganizationId?: string | null }).activeOrganizationId ?? null
      const [membership] = orgId
        ? await db
            .select({ role: member.role })
            .from(member)
            .where(and(eq(member.userId, user.id), eq(member.organizationId, orgId)))
            .limit(1)
        : []

      const baseRole = (user as { isSuperAdmin?: boolean }).isSuperAdmin
        ? 'super-admin'
        : (membership?.role ?? 'member')

      return {
        megatools_role: baseRole,
        megatools_org_id: orgId,
        megatools_user_id: user.id,
      }
    },
  })
}

export const OIDC_SCOPES = ['openid', 'profile', 'email', 'megatools', 'offline_access'] as const
export type OidcScope = (typeof OIDC_SCOPES)[number]

/** Identifica el cliente LearnHouse. Útil para scripts y tests. */
export const LEARNHOUSE_CLIENT_ID = 'learnhouse' as const
