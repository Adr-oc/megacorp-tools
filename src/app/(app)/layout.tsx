import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { member, organization } from '@/lib/db/schema/auth'
import { ensureActiveOrganization } from '@/lib/auth/active-organization'
import { coerceAccent } from '@/lib/accent/presets'
import { AppSidebar } from '@/components/shell/app-sidebar'
import { Topbar } from '@/components/shell/topbar'

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

  const activeOrgId = await ensureActiveOrganization({
    sessionId: session.session.id,
    userId: session.user.id,
    currentOrganizationId: session.session.activeOrganizationId,
  })
  let orgName: string | null = null
  let role: 'owner' | 'admin' | 'member' = 'member'
  const isSuperAdmin = session.user.isSuperAdmin === true

  if (activeOrgId) {
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, activeOrgId))
      .limit(1)
    orgName = org?.name ?? null
    const [m] = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrgId)))
      .limit(1)
    role = (m?.role ?? 'member') as 'owner' | 'admin' | 'member'
  }

  return (
    <div data-accent={accent} data-accent-root className="h-screen flex">
      <div className="hidden lg:block h-full">
        <AppSidebar user={session.user} orgName={orgName} role={role} isSuperAdmin={isSuperAdmin} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar orgName={orgName} user={session.user} role={role} isSuperAdmin={isSuperAdmin} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
