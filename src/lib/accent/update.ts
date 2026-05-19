'use client'

import { authClient } from '@/lib/auth/client'
import type { AccentColor } from './presets'

export async function updateUserAccent(accent: AccentColor): Promise<void> {
  // Better Auth tipa updateUser sólo con campos conocidos; el additional field
  // se acepta en runtime via additionalFields del config server.
  const res = await authClient.updateUser({ accentColor: accent } as never)
  if ('error' in res && res.error) {
    throw new Error(res.error.message ?? 'No se pudo actualizar el color')
  }
}
