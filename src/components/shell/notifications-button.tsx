'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function NotificationsButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notificaciones">
            <Bell className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-3 py-2">
          <div className="text-sm font-medium mb-1">Notificaciones</div>
          <p className="text-xs text-muted-foreground">No tenés notificaciones.</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
