import type { LucideIcon } from 'lucide-react'

export type AppRole = 'member' | 'admin' | 'owner' | 'super-admin'

export type AppStatus = 'available' | 'coming-soon' | 'disabled'

export type AppDefinition = {
  id: string
  name: string
  description: string
  icon: LucideIcon
  href: string
  requiredRoles: AppRole[]
  status: AppStatus
}
