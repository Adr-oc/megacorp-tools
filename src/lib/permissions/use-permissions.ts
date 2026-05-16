'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import type { AppRole } from '@/lib/apps/types'
import { apps } from '@/lib/apps/registry'

export function usePermissions() {
  const { data: session } = authClient.useSession()
  const [role, setRole] = useState<AppRole | null>(null)

  useEffect(() => {
    if (!session) {
      setRole(null)
      return
    }
    const activeOrgId = session.session.activeOrganizationId
    if (!activeOrgId) {
      setRole(null)
      return
    }
    fetch(`/api/auth/organization/list-members?organizationId=${encodeURIComponent(activeOrgId)}`)
      .then(async (res) => {
        if (!res.ok) {
          setRole(null)
          return
        }
        const data = await res.json()
        const members = Array.isArray(data) ? data : (data?.members ?? [])
        const me = members.find?.((m: { userId: string }) => m.userId === session.user.id)
        setRole(((me?.role ?? 'member') as AppRole) || 'member')
      })
      .catch(() => setRole(null))
  }, [session])

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
