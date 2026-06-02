'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight, Info } from 'lucide-react'
import type { AppDefinition } from '@/lib/apps/types'
import { SidebarSection } from './sidebar-section'

type Props = {
  app?: AppDefinition
}

export function SidebarApp({ app }: Props) {
  const Icon = app?.icon ?? Info
  const label = app?.name ?? 'Aplicación'

  return (
    <div className="space-y-5">
      <Link
        href="/app"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a apps
      </Link>

      <SidebarSection label={label}>
        <div className="px-2.5 py-1.5 flex items-start gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{app?.description ?? 'Workspace abierto'}</span>
        </div>
      </SidebarSection>

      {app?.sidebarModules?.map((module) => (
        <SidebarSection key={module.label} label={module.label}>
          <div className="space-y-1">
            {module.items.map((item) => (
              <a
                key={item.label}
                href={item.href ?? '#'}
                className="group flex items-start gap-2 rounded-md px-2.5 py-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5" />
                <span>
                  <span className="block font-medium text-foreground">{item.label}</span>
                  {item.description ? <span className="block leading-5">{item.description}</span> : null}
                </span>
              </a>
            ))}
          </div>
        </SidebarSection>
      ))}
    </div>
  )
}
