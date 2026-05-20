import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VerifyEmailClient } from './verify-email-client'

export default function VerifyEmailPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <CardTitle>Verificando email…</CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        }
      >
        <VerifyEmailClient />
      </Suspense>
    </div>
  )
}
