import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function NotificationsForm() {
  return (
    <div className="space-y-4 max-w-2xl">
      <Alert>
        <AlertTitle>Notificaciones por email</AlertTitle>
        <AlertDescription>
          Las notificaciones (verificación, invitaciones, password reset) se envían automáticamente a tu email.
          La configuración avanzada (SMTP custom, preferencias por usuario) estará disponible en futuras versiones.
        </AlertDescription>
      </Alert>
    </div>
  )
}
