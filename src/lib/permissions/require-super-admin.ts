import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'

/**
 * Gate server-side de Super Admin (global, por encima de los owners por-org).
 * Verifica session.user.isSuperAdmin === true. Si no hay sesión o no es super
 * admin, redirige a /app. Devuelve { userId } si pasa.
 */
export async function requireSuperAdmin(): Promise<{ userId: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/login')
  }

  if (session.user.isSuperAdmin !== true) {
    redirect('/app')
  }

  return { userId: session.user.id }
}

/**
 * Versión NO-redirect para checks de visibilidad (mostrar/ocultar UI).
 * Devuelve true/false sin redirigir.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user.isSuperAdmin === true
}
