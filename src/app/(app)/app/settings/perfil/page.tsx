import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { ProfileForm } from '@/components/settings/profile-form'
import { TrackSettings } from '../_track-settings'

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  return (
    <div>
      <TrackSettings />
      <h1 className="text-2xl font-bold mb-2">Mi perfil</h1>
      <p className="text-muted-foreground mb-6">Actualizá tu información personal.</p>
      <ProfileForm user={session.user} />
    </div>
  )
}
