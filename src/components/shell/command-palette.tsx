'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Command } from 'cmdk'
import {
  Building2,
  FileText,
  LogOut,
  Moon,
  Palette,
  Search,
  Settings,
  Sun,
  User,
} from 'lucide-react'
import { authClient } from '@/lib/auth/client'
import { cn } from '@/lib/utils'

type Item = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onSelect: () => void
  group: 'Navegación' | 'Acciones'
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  function toggleTheme() {
    setOpen(false)
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  async function logout() {
    setOpen(false)
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  const items: Item[] = [
    { id: 'nav-apps', label: 'Apps', icon: Settings, group: 'Navegación', onSelect: () => go('/app') },
    { id: 'nav-pdf', label: 'PDF Workbench', icon: FileText, group: 'Navegación', onSelect: () => go('/app/tools/pdf-workbench') },
    { id: 'nav-perfil', label: 'Mi perfil', icon: User, group: 'Navegación', onSelect: () => go('/app/settings/perfil') },
    { id: 'nav-apariencia', label: 'Apariencia', icon: Palette, group: 'Navegación', onSelect: () => go('/app/settings/apariencia') },
    { id: 'nav-org', label: 'Organización', icon: Building2, group: 'Navegación', onSelect: () => go('/app/settings/organizacion') },
    {
      id: 'theme-toggle',
      label: theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
      icon: theme === 'dark' ? Sun : Moon,
      group: 'Acciones',
      onSelect: toggleTheme,
    },
    { id: 'logout', label: 'Cerrar sesión', icon: LogOut, group: 'Acciones', onSelect: () => void logout() },
  ]

  const groups = ['Navegación', 'Acciones'] as const

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 h-8 rounded-md border bg-background px-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition w-64"
        aria-label="Buscar o ejecutar"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Buscar o ejecutar…</span>
        <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
        aria-label="Buscar o ejecutar"
      >
        <Search className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 backdrop-blur-sm p-4 pt-[20vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl bg-card border shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Comandos">
              <div className="flex items-center gap-2 border-b px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  placeholder="Buscar o ejecutar…"
                  className="flex-1 h-12 bg-transparent outline-none text-sm"
                  autoFocus
                />
                <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted">esc</kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-sm text-muted-foreground text-center">
                  Sin resultados.
                </Command.Empty>
                {groups.map((g) => {
                  const groupItems = items.filter((i) => i.group === g)
                  if (groupItems.length === 0) return null
                  return (
                    <Command.Group
                      key={g}
                      heading={g}
                      className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground"
                    >
                      {groupItems.map((it) => (
                        <Command.Item
                          key={it.id}
                          value={`${it.label} ${it.group}`}
                          onSelect={it.onSelect}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-foreground cursor-pointer',
                            'data-[selected=true]:bg-brand-accent/15 data-[selected=true]:text-foreground',
                          )}
                        >
                          <it.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{it.label}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )
                })}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  )
}
