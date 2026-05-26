'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import type { AppRole } from '@/lib/apps/types'
import { apps } from '@/lib/apps/registry'

export function usePermissions() {
  const { data: session } = authClient.useSession()
  const [rawRole, setRawRole] = useState<AppRole | null>(null)

  const activeOrgId = session?.session.activeOrganizationId
  const userId = session?.user.id
  // `role` derivado: sin sesión activa, siempre null, sin importar el último
  // valor cacheado en rawRole. Esto reemplaza los setRole(null) síncronos
  // que antes vivían dentro del useEffect.
  const role: AppRole | null = session && activeOrgId ? rawRole : null

  useEffect(() => {
    if (!activeOrgId || !userId) return

    let cancelled = false
    fetch(`/api/auth/organization/list-members?organizationId=${encodeURIComponent(activeOrgId)}`)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setRawRole(null)
          return
        }
        const data = await res.json()
        const members = Array.isArray(data) ? data : (data?.members ?? [])
        const me = members.find?.((m: { userId: string }) => m.userId === userId)
        if (!cancelled) setRawRole(((me?.role ?? 'member') as AppRole) || 'member')
      })
      .catch(() => {
        if (!cancelled) setRawRole(null)
      })

    return () => {
      cancelled = true
    }
  }, [activeOrgId, userId])

  return {
    role,
    hasApp(appId: string): boolean {
      if (!role) return false
      const app = apps.find((a) => a.id === appId)
      if (!app) return false
      return app.status === 'available' && app.requiredRoles.includes(role)
    },
  }
}
