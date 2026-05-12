'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerifyEmailPendingPage() {
  const [isLoading, setIsLoading] = useState(false)

  async function resend() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackURL: '/verify-email' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.message ?? 'No se pudo reenviar')
      } else {
        toast.success('Email reenviado')
      }
    } catch (err) {
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
