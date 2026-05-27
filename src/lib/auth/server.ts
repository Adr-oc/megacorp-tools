import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { magicLink, organization } from 'better-auth/plugins'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { member } from '@/lib/db/schema/auth'
import { env } from '@/lib/env'
import { logAudit } from '@/lib/audit/log'
import { sendEmail, verificationEmail, invitationEmail, magicLinkEmail } from '@/lib/email/send'

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
      onboardedAt: {
        type: 'date',
        required: false,
        input: false,
      },
      isSuperAdmin: {
        type: 'boolean',
        defaultValue: false,
        required: false,
        input: false,
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
      const tpl = verificationEmail(url)
      await sendEmail({ to: user.email, ...tpl })
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: false,
      organizationLimit: 50,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      sendInvitationEmail: async ({ email, invitation, organization }) => {
        const url = `${env.BETTER_AUTH_URL}/accept-invitation?token=${invitation.id}`
        const tpl = invitationEmail(organization.name, url)
        await sendEmail({ to: email, ...tpl })
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const tpl = magicLinkEmail(url)
        await sendEmail({ to: email, ...tpl })
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
