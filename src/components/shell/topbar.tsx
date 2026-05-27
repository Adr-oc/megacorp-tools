import { ThemeToggle } from '@/components/theme-toggle'
import { TourLauncher } from '@/components/help/tour-launcher'
import { Breadcrumbs } from './breadcrumbs'
import { CommandPalette } from './command-palette'
import { NotificationsButton } from './notifications-button'
import { MobileNav } from './mobile-nav'

type Props = {
  orgName: string | null
  user: { email: string; name?: string | null }
  role: 'owner' | 'admin' | 'member'
  isSuperAdmin?: boolean
}

export function Topbar({ orgName, user, role, isSuperAdmin = false }: Props) {
  return (
    <header className="h-14 border-b bg-card/95 backdrop-blur sticky top-0 z-30">
      <div className="h-full flex items-center gap-3 px-4">
        <MobileNav orgName={orgName} user={user} role={role} isSuperAdmin={isSuperAdmin} />
        <Breadcrumbs orgName={orgName} />
        <div className="flex-1" />
        <CommandPalette isSuperAdmin={isSuperAdmin} />
        <NotificationsButton />
        <TourLauncher />
        <ThemeToggle />
      </div>
    </header>
  )
}
