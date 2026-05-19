import { headers } from 'next/headers'
import { auth } from '@/lib/auth/server'
import { coerceAccent } from '@/lib/accent/presets'
import { AppearanceForm } from '@/components/settings/appearance-form'

export default async function AppearancePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const accent = coerceAccent((session?.user as { accentColor?: unknown } | undefined)?.accentColor)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Apariencia</h1>
      <p className="text-muted-foreground mb-6">Personalizá la apariencia del portal.</p>
      <AppearanceForm initialAccent={accent} />
    </div>
  )
}
