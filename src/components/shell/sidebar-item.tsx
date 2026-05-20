'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  label: string
  icon?: LucideIcon
  exact?: boolean
  meta?: string
}

export function SidebarItem({ href, label, icon: Icon, exact, meta }: Props) {
  const pathname = usePathname() ?? ''
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm border-l-2 transition',
        active
          ? 'border-brand-accent bg-muted/40 text-foreground font-medium'
          : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {meta && <span className="text-[10px] font-mono text-muted-foreground">{meta}</span>}
    </Link>
  )
}
