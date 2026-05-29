import { requireApp } from '@/lib/permissions/require-app'
import { getAnnouncementsBoard } from '@/lib/announcements/actions'
import { AnnouncementsLoader } from './announcements-loader'

export default async function AnnouncementsPage() {
  const { role, isSuperAdmin } = await requireApp('announcements')
  const isAdmin = isSuperAdmin || role === 'admin' || role === 'owner'
  const { announcements, currentUserId } = await getAnnouncementsBoard()

  return (
    <AnnouncementsLoader
      initialAnnouncements={announcements}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
    />
  )
}
