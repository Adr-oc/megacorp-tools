import { NotificationsForm } from '@/components/settings/notifications-form'
import { TrackSettings } from '../_track-settings'

export default function NotificationsPage() {
  return (
    <div>
      <TrackSettings />
      <h1 className="text-2xl font-bold mb-2">Notificaciones</h1>
      <p className="text-muted-foreground mb-6">Configuración de notificaciones por email.</p>
      <NotificationsForm />
    </div>
  )
}
