'use client'

import { useTheme } from 'next-themes'
import { useIsMounted } from '@/hooks/use-is-mounted'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AccentPicker } from '@/components/settings/accent-picker'
import type { AccentColor } from '@/lib/accent/presets'

type Props = {
  initialAccent: AccentColor
}

export function AppearanceForm({ initialAccent }: Props) {
  const { theme, setTheme } = useTheme()
  const mounted = useIsMounted()

  if (!mounted) return null

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <Label htmlFor="theme">Tema</Label>
        <Select value={theme ?? 'system'} onValueChange={(value) => setTheme(value || 'system')}>
          <SelectTrigger id="theme" className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Claro</SelectItem>
            <SelectItem value="dark">Oscuro</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <AccentPicker value={initialAccent} />
    </div>
  )
}
