import Link from 'next/link'

type Section = { id: string; label: string; href: string }

const sections: Section[] = [
  { id: 'perfil', label: 'Mi perfil', href: '/app/settings/perfil' },
  { id: 'organizacion', label: 'Organización', href: '/app/settings/organizacion' },
  { id: 'apariencia', label: 'Apariencia', href: '/app/settings/apariencia' },
  { id: 'notificaciones', label: 'Notificaciones', href: '/app/settings/notificaciones' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-8">
      <aside className="w-48 shrink-0">
        <h2 className="text-lg font-semibold mb-4">Configuración</h2>
        <nav className="flex flex-col gap-1">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="px-3 py-2 rounded-md text-sm hover:bg-muted"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
