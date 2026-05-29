'use client'

import dynamic from 'next/dynamic'

import type { Announcement } from '@/lib/announcements/schema'

const Announcements = dynamic(
  () =>
    import('@/components/announcements/announcements').then((mod) => ({
      default: mod.Announcements,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Anuncios</h1>
          <p className="text-sm text-muted-foreground">
            Cargando anuncios internos…
          </p>
        </div>
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Preparando el tablero…
        </div>
      </div>
    ),
  }
)

export function AnnouncementsLoader(props: {
  initialAnnouncements: Announcement[]
  currentUserId: string
  isAdmin: boolean
}) {
  return <Announcements {...props} />
}
