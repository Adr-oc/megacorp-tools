import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { coerceAccent } from '@/lib/accent/presets'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/auth/user-menu'
import { MegacorpLogo } from '@/components/brand/logo'
import { TourLauncher } from '@/components/help/tour-launcher'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/login')
  }

  if (!session.user.emailVerified) {
    redirect('/verify-email-pending')
  }

  if (!(session.user as { onboardedAt?: Date | string | null }).onboardedAt) {
    redirect('/onboarding')
  }

  const accent = coerceAccent((session.user as { accentColor?: unknown }).accentColor)

  return (
    <div data-accent={accent} data-accent-root className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2 font-semibold text-lg">
            <MegacorpLogo variant="mono" size={28} />
            MegaTools
          </Link>
          <div className="flex items-center gap-2">
            <TourLauncher />
            <ThemeToggle />
            <UserMenu user={session.user} />
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
