'use client'

import { FileText, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRecents, formatRelativeTime, type RecentApp } from '@/lib/recents/client'
import { apps } from '@/lib/apps/registry'
import { SidebarSection } from './sidebar-section'
import { SidebarItem } from './sidebar-item'

type AppMeta = { icon: LucideIcon; href: string; label: string }

// Mapeo de appId → metadata para los recientes "internos" que no están en el registry
// (los appIds del registry usan registry.ts; los "settings" lo handleamos acá).
const FALLBACK_META: Record<string, AppMeta> = {
  settings: { icon: Settings, href: '/app/settings/perfil', label: 'Configuración' },
  'pdf-workbench': { icon: FileText, href: '/app/tools/pdf-workbench', label: 'PDF Workbench' },
}

function metaFor(r: RecentApp): AppMeta | null {
  const fb = FALLBACK_META[r.appId]
  if (fb) return fb
  const app = apps.find((a) => a.id === r.appId)
  if (app) return { icon: app.icon, href: app.href, label: app.name }
  return null
}

export function SidebarHome() {
  const recents = useRecents()
  const now = Date.now()

  type Resolved = { r: RecentApp; meta: AppMeta }
  const resolved: Resolved[] = recents
    .map((r): Resolved | null => {
      const meta = metaFor(r)
      return meta ? { r, meta } : null
    })
    .filter((x): x is Resolved => x !== null)
    .slice(0, 5)

  return (
    <div className="space-y-5">
      {resolved.length > 0 ? (
        <SidebarSection label="Reciente">
          {resolved.map(({ r, meta }) => (
            <SidebarItem
              key={r.appId}
              href={meta.href}
              label={meta.label}
              icon={meta.icon}
              meta={formatRelativeTime(r.visitedAt, now)}
            />
          ))}
        </SidebarSection>
      ) : (
        <SidebarSection label="Reciente">
          <p className="px-2.5 py-1 text-xs text-muted-foreground italic">
            Tus apps recientes aparecerán acá.
          </p>
        </SidebarSection>
      )}
    </div>
  )
}
