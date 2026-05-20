import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { member, organization } from '@/lib/db/schema/auth'
import { OrganizationForm } from '@/components/settings/organization-form'
import { MembersList } from '@/components/settings/members-list'
import { Separator } from '@/components/ui/separator'
import { TrackSettings } from '../_track-settings'

export default async function OrganizationPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) {
    return <p className="text-muted-foreground">No tenés organización activa.</p>
  }

  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, activeOrgId))
    .limit(1)
  if (!org) {
    return <p className="text-destructive">Organización no encontrada.</p>
  }

  const [me] = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrgId)))
    .limit(1)

  const canEdit = me?.role === 'owner' || me?.role === 'admin'

  return (
    <div className="space-y-8">
      <TrackSettings />
      <div>
        <h1 className="text-2xl font-bold mb-2">Organización</h1>
        <p className="text-muted-foreground mb-6">Datos y miembros de tu organización.</p>
        <OrganizationForm
          organization={{ id: org.id, name: org.name, slug: org.slug }}
          canEdit={canEdit}
        />
      </div>
      <Separator />
      <MembersList
        organizationId={activeOrgId}
        myRole={(me?.role ?? 'member') as 'owner' | 'admin' | 'member'}
        myUserId={session.user.id}
      />
    </div>
  )
}
