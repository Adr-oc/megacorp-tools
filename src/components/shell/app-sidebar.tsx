'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MegacorpLogo } from '@/components/brand/logo'
import { apps } from '@/lib/apps/registry'
import type { AppDefinition } from '@/lib/apps/types'
import { SidebarHome } from './sidebar-home'
import { SidebarApp } from './sidebar-app'
import { SidebarSettings } from './sidebar-settings'
import { SidebarFooter } from './sidebar-footer'

type Variant = 'home' | 'app' | 'settings'

function variantFor(pathname: string): Variant {
  if (pathname.startsWith('/app/settings')) return 'settings'
  if (pathname.startsWith('/app/tools')) return 'app'
  return 'home'
}

// Resuelve la app activa desde el registry según la URL (single source of truth).
// Coincide la entrada cuyo href es prefijo del pathname actual.
function appFor(pathname: string): AppDefinition | undefined {
  return apps
    .filter((a) => a.href.startsWith('/app/tools/'))
    .find((a) => pathname === a.href || pathname.startsWith(`${a.href}/`))
}

type Props = {
  user: { email: string; name?: string | null }
  orgName: string | null
  role: 'owner' | 'admin' | 'member'
  isSuperAdmin?: boolean
}

export function AppSidebar({ user, orgName, role, isSuperAdmin = false }: Props) {
  const pathname = usePathname() ?? '/app'
  const variant = variantFor(pathname)

  return (
    <aside className="h-full flex flex-col bg-card border-r w-60 shrink-0">
      <div className="p-3 border-b">
        <Link
          href="/app"
          className="flex items-center gap-2.5 px-1 py-0.5 rounded-md hover:bg-muted transition"
        >
          <MegacorpLogo variant="mono" size={24} />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">{orgName ?? 'MEGACORP'}</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
              workspace
            </span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {variant === 'home' && <SidebarHome isSuperAdmin={isSuperAdmin} />}
        {variant === 'app' && <SidebarApp app={appFor(pathname)} />}
        {variant === 'settings' && <SidebarSettings role={role} />}
      </div>

      <SidebarFooter user={user} />
    </aside>
  )
}
