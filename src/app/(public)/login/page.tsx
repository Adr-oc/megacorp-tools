import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoginForm } from '@/components/auth/login-form'
import { MagicLinkForm } from '@/components/auth/magic-link-form'
import { MegacorpLogo } from '@/components/brand/logo'

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <MegacorpLogo variant="brand" size={64} className="mx-auto mb-6" />
      <Card>
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger
                value="password"
                className="data-[state=active]:text-brand-accent data-[state=active]:border-b-2 data-[state=active]:border-brand-accent"
              >
                Contraseña
              </TabsTrigger>
              <TabsTrigger
                value="magic"
                className="data-[state=active]:text-brand-accent data-[state=active]:border-b-2 data-[state=active]:border-brand-accent"
              >
                Enlace mágico
              </TabsTrigger>
            </TabsList>
            <TabsContent value="password">
              <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
                <LoginForm />
              </Suspense>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                <Link href="/forgot-password" className="text-brand-accent underline underline-offset-2">
                  ¿Olvidaste tu contraseña?
                </Link>
              </p>
            </TabsContent>
            <TabsContent value="magic">
              <MagicLinkForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
