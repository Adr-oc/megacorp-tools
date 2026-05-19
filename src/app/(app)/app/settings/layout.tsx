'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Section = { id: string; label: string; href: string }

const sections: Section[] = [
  { id: 'perfil', label: 'Mi perfil', href: '/app/settings/perfil' },
  { id: 'organizacion', label: 'Organización', href: '/app/settings/organizacion' },
  { id: 'apariencia', label: 'Apariencia', href: '/app/settings/apariencia' },
  { id: 'notificaciones', label: 'Notificaciones', href: '/app/settings/notificaciones' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex gap-8">
      <aside className="w-48 shrink-0">
        <h2 className="text-lg font-semibold mb-4">Configuración</h2>
        <nav className="flex flex-col gap-1">
          {sections.map((s) => {
            const active = pathname?.startsWith(s.href) ?? false
            return (
              <Link
                key={s.id}
                href={s.href}
                aria-current={active ? 'page' : undefined}
                className={
                  'px-3 py-2 rounded-md text-sm border-l-2 transition ' +
                  (active
                    ? 'border-brand-accent bg-muted/40 font-medium text-foreground'
                    : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground')
                }
              >
                {s.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
