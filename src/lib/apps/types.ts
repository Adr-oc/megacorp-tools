import type { LucideIcon } from 'lucide-react'

export type AppRole = 'member' | 'admin' | 'owner'

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
