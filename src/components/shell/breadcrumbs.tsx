'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

type Crumb = { label: string; href: string | null }

const STATIC_LABELS: Record<string, string> = {
  '/app': 'Apps',
  '/app/tools/pdf-workbench': 'PDF Workbench',
  '/app/settings': 'Configuración',
  '/app/settings/perfil': 'Mi perfil',
  '/app/settings/apariencia': 'Apariencia',
  '/app/settings/organizacion': 'Organización',
  '/app/settings/notificaciones': 'Notificaciones',
  '/app/settings/audit': 'Audit log',
}

function buildCrumbs(pathname: string, orgName: string | null): Crumb[] {
  const crumbs: Crumb[] = [{ label: orgName ?? 'MEGACORP', href: '/app' }]

  if (pathname === '/app' || pathname === '/app/') {
    crumbs.push({ label: 'Apps', href: null })
    return crumbs
  }
  if (pathname.startsWith('/app/tools/')) {
    crumbs.push({ label: 'Apps', href: '/app' })
    const label = STATIC_LABELS[pathname] ?? 'Aplicación'
    crumbs.push({ label, href: null })
    return crumbs
  }
  if (pathname.startsWith('/app/settings')) {
    crumbs.push({ label: 'Configuración', href: '/app/settings' })
    const sub = STATIC_LABELS[pathname]
    if (sub && pathname !== '/app/settings') {
      crumbs.push({ label: sub, href: null })
    }
    return crumbs
  }
  return crumbs
}

type Props = { orgName: string | null }

export function Breadcrumbs({ orgName }: Props) {
  const pathname = usePathname() ?? '/app'
  const crumbs = buildCrumbs(pathname, orgName)

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm min-w-0">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            {c.href && !isLast ? (
              <Link href={c.href} className="text-muted-foreground hover:text-foreground truncate">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium truncate' : 'text-muted-foreground truncate'}>
                {c.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
