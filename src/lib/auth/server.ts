import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, organization } from 'better-auth/plugins'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
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
})

export type Auth = typeof auth
