'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth/client'

type Props = {
  user: { email: string; name?: string | null }
}

function initials(name: string | null | undefined, email: string): string {
  const base = name?.trim() || email
  const parts = base.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

export function SidebarFooter({ user }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="border-t p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="w-full justify-start gap-2 h-auto py-1.5 px-2 hover:bg-muted">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">{initials(user.name, user.email)}</AvatarFallback>
              </Avatar>
              <div className="text-left min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user.name ?? user.email}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
              </div>
            </Button>
          }
        />
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user.name ?? 'Usuario'}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
