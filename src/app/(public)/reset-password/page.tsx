import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Establecer nueva contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
