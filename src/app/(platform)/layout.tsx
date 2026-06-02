import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { coerceAccent } from '@/lib/accent/presets'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect('/login')
  if (!session.user.emailVerified) redirect('/verify-email-pending')
  if (!(session.user as { onboardedAt?: Date | string | null }).onboardedAt) redirect('/onboarding')

  const accent = coerceAccent((session.user as { accentColor?: unknown }).accentColor)

  return (
    <div data-accent={accent} data-accent-root className="min-h-svh bg-background text-foreground">
      {children}
    </div>
  )
}
