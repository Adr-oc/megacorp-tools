'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus(res.ok ? 'success' : 'error')
      })
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
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
    </div>
  )
}
