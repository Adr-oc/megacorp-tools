'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { AppSidebar } from './app-sidebar'

type Props = {
  orgName: string | null
  user: { email: string; name?: string | null }
  role: 'owner' | 'admin' | 'member'
}

export function MobileNav({ orgName, user, role }: Props) {
  const pathname = usePathname()
  // Guardamos el pathname en el que se abrió el sheet; si el pathname actual
  // cambia (navegación), open queda automáticamente en false. Reemplaza el
  // useEffect(() => setOpen(false), [pathname]).
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === pathname

  function onOpenChange(next: boolean) {
    setOpenedAt(next ? pathname : null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
            <Menu className="h-4 w-4" />
          </Button>
        }
      />
      <SheetContent side="left" className="p-0 w-72" showCloseButton={false}>
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <AppSidebar orgName={orgName} user={user} role={role} />
      </SheetContent>
    </Sheet>
  )
}
