import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AcceptInvitationForm } from '@/components/auth/accept-invitation-form'

export default function AcceptInvitationPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Aceptar invitación</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
            <AcceptInvitationForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
