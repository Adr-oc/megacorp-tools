'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/lib/auth/client'

export default function VerifyEmailPendingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()

  async function resend() {
    const email = session?.user?.email
    if (!email) {
      toast.error('No se pudo detectar tu sesión. Iniciá sesión de nuevo.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, callbackURL: '/verify-email' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.message ?? 'No se pudo reenviar')
      } else {
        toast.success('Email reenviado')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Verificá tu email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace al email con el que te registraste. Cliqueá el enlace para activar tu cuenta.
          </p>
          <Button onClick={resend} disabled={isLoading} className="w-full" variant="outline">
            {isLoading ? 'Reenviando…' : 'Reenviar email'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
