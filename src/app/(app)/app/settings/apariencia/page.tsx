import { AppearanceForm } from '@/components/settings/appearance-form'

export default function AppearancePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Apariencia</h1>
      <p className="text-muted-foreground mb-6">Personalizá la apariencia del portal.</p>
      <AppearanceForm />
    </div>
  )
}
