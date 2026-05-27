import { Suspense } from 'react'
import Link from 'next/link'

import { MegacorpLogo } from '@/components/brand/logo'
import { AcceptInvitationForm } from '@/components/auth/accept-invitation-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AcceptInvitationPage() {
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="mb-6 flex items-center justify-center gap-3 text-sm font-semibold">
          <MegacorpLogo variant="brand" size={40} />
          MegaTools
        </Link>
        <Card className="border bg-card/85 shadow-xl shadow-foreground/5 backdrop-blur">
          <CardHeader>
            <CardTitle>Aceptar invitación</CardTitle>
            <CardDescription>
              Usá el enlace privado enviado a tu correo para crear tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
              <AcceptInvitationForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
