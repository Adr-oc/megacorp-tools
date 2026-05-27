'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createOrganization,
  deleteOrganization,
  listOrganizations,
  updateOrganization,
  type OrgNode,
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

const NO_PARENT = '__none__'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

type EditState =
  | { mode: 'create' }
  | { mode: 'edit'; node: OrgNode }
  | null

export function OrganizationsManager() {
  const [roots, setRoots] = useState<OrgNode[]>([])
  const [loading, setLoading] = useState(true)
  const [refetchKey, setRefetchKey] = useState(0)
  const [editState, setEditState] = useState<EditState>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgNode | null>(null)

  useEffect(() => {
    let cancelled = false
    listOrganizations()
      .then((data) => {
        if (!cancelled) setRoots(data)
      })
      .catch(() => {
        if (!cancelled) toast.error('No se pudieron cargar las organizaciones')
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

  const parentOptions = roots.map((r) => ({ id: r.id, name: r.name }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Organizaciones</h2>
        <Button size="sm" onClick={() => setEditState({ mode: 'create' })}>
          <Plus className="h-4 w-4" /> Nueva organización
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : roots.length === 0 ? (
        <p className="text-muted-foreground">No hay organizaciones todavía.</p>
      ) : (
        <div className="space-y-3">
          {roots.map((root) => (
            <div key={root.id} className="border rounded-md">
              <OrgRow node={root} onEdit={setEditState} onDelete={setDeleteTarget} />
              {root.affiliates.length > 0 && (
                <div className="border-t bg-muted/30">
                  {root.affiliates.map((aff) => (
                    <div key={aff.id} className="pl-6 border-b last:border-b-0">
                      <OrgRow node={aff} onEdit={setEditState} onDelete={setDeleteTarget} affiliate />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editState && (
        <OrgFormDialog
          state={editState}
          parentOptions={parentOptions}
          onClose={() => setEditState(null)}
          onSaved={() => {
            setEditState(null)
            refetch()
          }}
        />
      )}

      {deleteTarget && (
        <DeleteOrgDialog
          node={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}

function OrgRow({
  node,
  onEdit,
  onDelete,
  affiliate,
}: {
  node: OrgNode
  onEdit: (s: EditState) => void
  onDelete: (n: OrgNode) => void
  affiliate?: boolean
}) {
  return (
    <div className="flex items-center justify-between p-3">
      <div className="flex items-center gap-2 min-w-0">
        {affiliate ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{node.name}</span>
            <Badge variant={node.isParent ? 'secondary' : 'outline'}>
              {node.isParent ? 'Madre' : 'Afiliada'}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground truncate">
            <span className="font-mono">{node.slug}</span> · {node.memberCount}{' '}
            {node.memberCount === 1 ? 'miembro' : 'miembros'}
            {node.owners.length > 0 && (
              <> · owner: {node.owners.map((o) => o.email).join(', ')}</>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={() => onEdit({ mode: 'edit', node })}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => onDelete(node)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

function OrgFormDialog({
  state,
  parentOptions,
  onClose,
  onSaved,
}: {
  state: NonNullable<EditState>
  parentOptions: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const editing = state.mode === 'edit' ? state.node : null
  const [name, setName] = useState(editing?.name ?? '')
  const [slug, setSlug] = useState(editing?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(state.mode === 'edit')
  const [parentId, setParentId] = useState<string>(
    editing?.parentOrganizationId ?? NO_PARENT,
  )
  const [saving, setSaving] = useState(false)

  // No se puede asignar como madre a sí misma ni a una afiliada existente.
  const availableParents = parentOptions.filter((p) => p.id !== editing?.id)

  function handleName(v: string) {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  async function handleSubmit() {
    setSaving(true)
    const parentOrganizationId = parentId === NO_PARENT ? null : parentId
    const res =
      state.mode === 'create'
        ? await createOrganization({ name, slug, parentOrganizationId })
        : await updateOrganization({ id: editing!.id, name, slug, parentOrganizationId })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(state.mode === 'create' ? 'Organización creada' : 'Organización actualizada')
    onSaved()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state.mode === 'create' ? 'Nueva organización' : 'Editar organización'}
          </DialogTitle>
          <DialogDescription>
            Una org sin madre es una organización madre; si elegís una madre, será su afiliada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => handleName(e.target.value)} placeholder="EGAMSA" />
          </div>
          <div className="space-y-2">
            <Label>Slug (URL)</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(slugify(e.target.value))
              }}
              placeholder="egamsa"
            />
          </div>
          <div className="space-y-2">
            <Label>Organización madre</Label>
            <Select value={parentId} onValueChange={(v) => setParentId(v ?? NO_PARENT)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>Ninguna (es organización madre)</SelectItem>
                {availableParents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteOrgDialog({
  node,
  onClose,
  onDeleted,
}: {
  node: OrgNode
  onClose: () => void
  onDeleted: () => void
}) {
  const [saving, setSaving] = useState(false)
  const hasWarnings = node.memberCount > 0 || node.affiliates.length > 0

  async function handleDelete() {
    setSaving(true)
    const res = await deleteOrganization({ id: node.id })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success('Organización borrada')
    onDeleted()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar «{node.name}»</DialogTitle>
          <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
        </DialogHeader>
        {hasWarnings && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">Atención:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              {node.memberCount > 0 && (
                <li>
                  Tiene {node.memberCount} {node.memberCount === 1 ? 'miembro' : 'miembros'}. Se
                  quitarán sus membresías e invitaciones.
                </li>
              )}
              {node.affiliates.length > 0 && (
                <li>
                  Tiene {node.affiliates.length}{' '}
                  {node.affiliates.length === 1 ? 'afiliada' : 'afiliadas'}. Quedarán como orgs
                  madre (sin madre).
                </li>
              )}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            {saving ? 'Borrando…' : 'Borrar definitivamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
