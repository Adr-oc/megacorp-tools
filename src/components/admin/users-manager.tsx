'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Shield, ShieldCheck, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  addUserToOrg,
  inviteUser,
  listOrganizationsFlat,
  listUsers,
  removeUserFromOrg,
  setSuperAdmin,
  updateUserRole,
  type UserRow,
} from '@/lib/admin/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Role = 'owner' | 'admin' | 'member'
type OrgOption = { id: string; name: string }

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Administrador',
  member: 'Miembro',
}

const ROLE_ITEMS = [
  { value: 'member', label: ROLE_LABEL.member },
  { value: 'admin', label: ROLE_LABEL.admin },
  { value: 'owner', label: ROLE_LABEL.owner },
]

export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refetchKey, setRefetchKey] = useState(0)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [superAdminTarget, setSuperAdminTarget] = useState<{ user: UserRow; value: boolean } | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    Promise.all([listUsers(), listOrganizationsFlat()])
      .then(([u, o]) => {
        if (cancelled) return
        setUsers(u)
        setOrgs(o.map((x) => ({ id: x.id, name: x.name })))
      })
      .catch(() => {
        if (!cancelled) toast.error('No se pudieron cargar los usuarios')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refetchKey])

  const refetch = useCallback(() => {
    setLoading(true)
    setRefetchKey((k) => k + 1)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usuarios</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4" /> Enviar invitación
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground">No hay usuarios.</p>
      ) : (
        <div className="border rounded-md divide-y">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{u.name}</span>
                  {u.isSuperAdmin && (
                    <Badge variant="default">
                      <ShieldCheck className="h-3 w-3" /> Super Admin
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {u.memberships.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Sin organización</span>
                  ) : (
                    u.memberships.map((m) => (
                      <Badge key={m.organizationId} variant="outline">
                        {m.organizationName} · {ROLE_LABEL[m.role] ?? m.role}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSuperAdminTarget({ user: u, value: !u.isSuperAdmin })}
                >
                  <Shield className="h-4 w-4" />
                  {u.isSuperAdmin ? 'Quitar SA' : 'Hacer SA'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(u)}>
                  Organizaciones
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <InviteUserDialog
          orgs={orgs}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            refetch()
          }}
        />
      )}

      {editing && (
        <ManageMembershipsDialog
          user={editing}
          orgs={orgs}
          onClose={() => setEditing(null)}
          onChanged={refetch}
        />
      )}

      {superAdminTarget && (
        <SuperAdminDialog
          target={superAdminTarget}
          onClose={() => setSuperAdminTarget(null)}
          onSaved={() => {
            setSuperAdminTarget(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}

function InviteUserDialog({
  orgs,
  onClose,
  onSaved,
}: {
  orgs: OrgOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [email, setEmail] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [saving, setSaving] = useState(false)
  const orgItems = orgs.map((o) => ({ value: o.id, label: o.name }))

  async function handleSubmit() {
    setSaving(true)
    const res = await inviteUser({ email, organizationId, role })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success('Invitación enviada')
    onSaved()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar invitación</DialogTitle>
          <DialogDescription>
            El usuario recibirá un enlace para crear su cuenta y definir su contraseña.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colaborador@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Organización</Label>
            <Select
              items={orgItems}
              value={organizationId}
              onValueChange={(v) => setOrganizationId(v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegí una organización" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select
              items={ROLE_ITEMS}
              value={role}
              onValueChange={(v) => setRole((v ?? 'member') as Role)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Miembro</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !email.trim() || !organizationId}
          >
            {saving ? 'Enviando…' : 'Enviar invitación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManageMembershipsDialog({
  user,
  orgs,
  onClose,
  onChanged,
}: {
  user: UserRow
  orgs: OrgOption[]
  onClose: () => void
  onChanged: () => void
}) {
  // Estado local optimista del usuario para reflejar cambios sin cerrar el diálogo.
  const [memberships, setMemberships] = useState(user.memberships)
  const [addOrgId, setAddOrgId] = useState('')
  const [addRole, setAddRole] = useState<Role>('member')
  const [busy, setBusy] = useState(false)

  const memberOrgIds = new Set(memberships.map((m) => m.organizationId))
  const addable = orgs.filter((o) => !memberOrgIds.has(o.id))
  const addableOrgItems = addable.map((o) => ({ value: o.id, label: o.name }))

  async function changeRole(organizationId: string, newRole: Role) {
    setBusy(true)
    const res = await updateUserRole({ userId: user.id, organizationId, role: newRole })
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setMemberships((prev) =>
      prev.map((m) => (m.organizationId === organizationId ? { ...m, role: newRole } : m)),
    )
    toast.success('Rol actualizado')
    onChanged()
  }

  async function remove(organizationId: string) {
    if (!confirm('¿Quitar al usuario de esta organización?')) return
    setBusy(true)
    const res = await removeUserFromOrg({ userId: user.id, organizationId })
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setMemberships((prev) => prev.filter((m) => m.organizationId !== organizationId))
    toast.success('Usuario removido de la organización')
    onChanged()
  }

  async function add() {
    if (!addOrgId) return
    setBusy(true)
    const res = await addUserToOrg({ userId: user.id, organizationId: addOrgId, role: addRole })
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    const org = orgs.find((o) => o.id === addOrgId)
    setMemberships((prev) => [
      ...prev,
      { organizationId: addOrgId, organizationName: org?.name ?? '—', role: addRole },
    ])
    setAddOrgId('')
    setAddRole('member')
    toast.success('Usuario agregado a la organización')
    onChanged()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Organizaciones de {user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pertenece a ninguna organización.</p>
          ) : (
            <div className="border rounded-md divide-y">
              {memberships.map((m) => (
                <div key={m.organizationId} className="flex items-center justify-between p-2.5 gap-2">
                  <span className="text-sm font-medium truncate">{m.organizationName}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Select
                      items={ROLE_ITEMS}
                      value={m.role}
                      onValueChange={(v) => changeRole(m.organizationId, (v ?? 'member') as Role)}
                    >
                      <SelectTrigger className="w-36" disabled={busy}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Miembro</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(m.organizationId)}
                      disabled={busy}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {addable.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <Label>Agregar a otra organización</Label>
              <div className="flex items-center gap-2">
                <Select
                  items={addableOrgItems}
                  value={addOrgId}
                  onValueChange={(v) => setAddOrgId(v ?? '')}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Organización" />
                  </SelectTrigger>
                  <SelectContent>
                    {addable.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  items={ROLE_ITEMS}
                  value={addRole}
                  onValueChange={(v) => setAddRole((v ?? 'member') as Role)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Miembro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" onClick={add} disabled={busy || !addOrgId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SuperAdminDialog({
  target,
  onClose,
  onSaved,
}: {
  target: { user: UserRow; value: boolean }
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const { user, value } = target

  async function handleConfirm() {
    setSaving(true)
    const res = await setSuperAdmin({ userId: user.id, value })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(value ? 'Ahora es Super Admin' : 'Se quitó el rol de Super Admin')
    onSaved()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value ? 'Otorgar Super Admin' : 'Quitar Super Admin'}</DialogTitle>
          <DialogDescription>
            {value
              ? `${user.email} podrá gestionar TODAS las organizaciones y usuarios del portal. Es un rol muy poderoso.`
              : `${user.email} dejará de tener acceso al panel de administración cross-org.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant={value ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? 'Aplicando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
