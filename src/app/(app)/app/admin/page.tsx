import { requireSuperAdmin } from '@/lib/permissions/require-super-admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrganizationsManager } from '@/components/admin/organizations-manager'
import { UsersManager } from '@/components/admin/users-manager'

export default async function AdminPage() {
  // Gate server-side: redirige si no es super admin.
  await requireSuperAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Administración</h1>
        <p className="text-muted-foreground">
          Panel de Super Admin — gestión cross-organización del grupo.
        </p>
      </div>

      <Tabs defaultValue="organizaciones">
        <TabsList>
          <TabsTrigger value="organizaciones">Organizaciones</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
        </TabsList>
        <TabsContent value="organizaciones" className="pt-4">
          <OrganizationsManager />
        </TabsContent>
        <TabsContent value="usuarios" className="pt-4">
          <UsersManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
