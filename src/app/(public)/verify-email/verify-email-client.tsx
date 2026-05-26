'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function VerifyEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [asyncStatus, setAsyncStatus] = useState<'success' | 'error' | null>(null)
  // `status` derivado: sin token la respuesta es siempre 'error', sin necesidad
  // de un setState síncrono dentro del effect.
  const status: 'pending' | 'success' | 'error' = !token ? 'error' : (asyncStatus ?? 'pending')

  useEffect(() => {
    if (!token) return

    let cancelled = false
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setAsyncStatus('error')
          return
        }
        const pendingInvitation =
          typeof window !== 'undefined'
            ? sessionStorage.getItem('pendingInvitationToken')
            : null
        if (pendingInvitation) {
          await fetch('/api/auth/organization/accept-invitation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invitationId: pendingInvitation }),
          }).catch(() => {})
          sessionStorage.removeItem('pendingInvitationToken')
        }
        if (!cancelled) setAsyncStatus('success')
      })
      .catch(() => {
        if (!cancelled) setAsyncStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {status === 'pending' && 'Verificando email…'}
          {status === 'success' && 'Email verificado'}
          {status === 'error' && 'No pudimos verificar tu email'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'success' && (
          <Link href="/login">
            <Button className="w-full">Iniciar sesión</Button>
          </Link>
        )}
        {status === 'error' && (
          <p className="text-sm text-muted-foreground">
            El enlace puede haber expirado. Iniciá sesión y pediremos un reenvío.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
