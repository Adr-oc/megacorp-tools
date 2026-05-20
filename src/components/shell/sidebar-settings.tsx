'use client'

import Link from 'next/link'
import { ArrowLeft, Bell, Building2, FileSearch, Palette, User } from 'lucide-react'
import { SidebarSection } from './sidebar-section'
import { SidebarItem } from './sidebar-item'

type Props = {
  role: 'owner' | 'admin' | 'member'
}

export function SidebarSettings({ role }: Props) {
  const canManageOrg = role === 'owner' || role === 'admin'

  return (
    <div className="space-y-5">
      <Link
        href="/app"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a apps
      </Link>

      <SidebarSection label="Tu cuenta">
        <SidebarItem href="/app/settings/perfil" label="Mi perfil" icon={User} />
        <SidebarItem href="/app/settings/apariencia" label="Apariencia" icon={Palette} />
      </SidebarSection>

      <SidebarSection label="Organización">
        <SidebarItem href="/app/settings/organizacion" label="Organización" icon={Building2} />
        {canManageOrg && (
          <SidebarItem href="/app/settings/audit" label="Audit log" icon={FileSearch} />
        )}
      </SidebarSection>

      <SidebarSection label="Notificaciones">
        <SidebarItem href="/app/settings/notificaciones" label="Notificaciones" icon={Bell} />
      </SidebarSection>
    </div>
  )
}
