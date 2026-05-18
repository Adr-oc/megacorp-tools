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
              <TabsTrigger value="password">Contraseña</TabsTrigger>
              <TabsTrigger value="magic">Enlace mágico</TabsTrigger>
            </TabsList>
            <TabsContent value="password">
              <LoginForm />
              <p className="text-sm text-muted-foreground mt-4 text-center">
                <Link href="/forgot-password" className="underline">
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
