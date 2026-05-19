import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { magicLink, organization } from 'better-auth/plugins'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'
import { env } from '@/lib/env'
import { logAudit } from '@/lib/audit/log'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  user: {
    additionalFields: {
      accentColor: {
        type: 'string',
        defaultValue: 'mustard',
        required: false,
        input: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // En Fase 1 solo loggeamos. En Fase 2 se integra Resend.
      console.log(`[email-verification] to=${user.email} url=${url}`)
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: false,
      organizationLimit: 1,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      sendInvitationEmail: async ({ email, invitation, organization }) => {
        const url = `${env.BETTER_AUTH_URL}/accept-invitation?token=${invitation.id}`
        console.log(`[invitation] to=${email} org=${organization.name} url=${url}`)
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // En Fase 2 solo loggeamos. Resend se integra en F2-11.
        console.log(`[magic-link] to=${email} url=${url}`)
      },
    }),
  ],
  trustedOrigins: [env.BETTER_AUTH_URL],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          if (session.activeOrganizationId) return
          const [firstMembership] = await db
            .select({ organizationId: member.organizationId })
            .from(member)
            .where(eq(member.userId, session.userId))
            .orderBy(asc(member.createdAt))
            .limit(1)
          if (!firstMembership) return
          return {
            data: { ...session, activeOrganizationId: firstMembership.organizationId },
          }
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const userId = ctx.context.newSession?.user?.id
      if (!userId) return
      const path = ctx.path ?? ''
      if (path.startsWith('/sign-in') || path.startsWith('/magic-link')) {
        await logAudit({ action: 'user.login', userId })
      }
    }),
  },
})

export type Auth = typeof auth
