import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  if (!session.user.emailVerified) redirect('/verify-email-pending')
  // NO chequeamos onboardedAt — sería un loop. Si ya está, igual permitimos refresh.
  return <div className="min-h-screen flex flex-col">{children}</div>
}
