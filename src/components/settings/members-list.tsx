'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InviteMemberDialog } from './invite-member-dialog'

type Role = 'owner' | 'admin' | 'member'

type Member = {
  id: string
  userId: string
  role: Role
  user: { email: string; name: string | null }
}

type Props = {
  organizationId: string
  myRole: Role
  myUserId: string
}

export function MembersList({ organizationId, myRole, myUserId }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [refetchKey, setRefetchKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(
      `/api/auth/organization/list-members?organizationId=${encodeURIComponent(organizationId)}`,
    )
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setMembers(Array.isArray(data) ? data : (data.members ?? []))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [organizationId, refetchKey])

  // Refetch manual: bumpear el contador re-dispara el useEffect sin necesidad
  // de llamar a una función con setState síncrono (que era lo que flaggeaba
  // react-hooks/set-state-in-effect).
  const refetch = useCallback(() => {
    setLoading(true)
    setRefetchKey((k) => k + 1)
  }, [])

  const canManage = myRole === 'owner' || myRole === 'admin'

  async function updateRole(memberId: string, role: Role) {
    const res = await fetch('/api/auth/organization/update-member-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    })
    if (!res.ok) {
      toast.error('No se pudo cambiar el rol')
      return
    }
    toast.success('Rol actualizado')
    refetch()
  }

  async function removeMember(memberId: string) {
    if (!confirm('¿Confirmás remover este miembro?')) return
    const res = await fetch('/api/auth/organization/remove-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    if (!res.ok) {
      toast.error('No se pudo remover')
      return
    }
    toast.success('Miembro removido')
    refetch()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Miembros</h2>
        {canManage && (
          <InviteMemberDialog organizationId={organizationId} onInvited={refetch} />
        )}
      </div>
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="border rounded-md divide-y">
          {members.map((m) => {
            const isSelf = m.userId === myUserId
            const canChangeThis = canManage && !isSelf && m.role !== 'owner'
            return (
              <div key={m.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{m.user?.name ?? m.user?.email ?? '—'}</div>
                  <div className="text-sm text-muted-foreground">{m.user?.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {canChangeThis ? (
                    <Select
                      value={m.role}
                      onValueChange={(v) => updateRole(m.id, (v ?? 'member') as Role)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Miembro</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground capitalize">{m.role}</span>
                  )}
                  {canChangeThis && (
                    <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}>
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
