import { Settings, FileText, ImageIcon } from 'lucide-react'
import type { AppDefinition, AppRole } from './types'

export const apps: AppDefinition[] = [
  {
    id: 'settings',
    name: 'Configuración',
    description: 'Perfil, organización, apariencia y notificaciones.',
    icon: Settings,
    href: '/app/settings',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'available',
  },
  {
    id: 'pdf-splitter',
    name: 'Separador de PDFs',
    description: 'Dividir y reordenar páginas de PDF.',
    icon: FileText,
    href: '/app/tools/pdf-splitter',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'coming-soon',
  },
  {
    id: 'image-ai',
    name: 'Procesador de imágenes IA',
    description: 'OCR, descripción, remoción de fondo y más.',
    icon: ImageIcon,
    href: '/app/tools/image-ai',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'coming-soon',
  },
]

export function getApp(id: string): AppDefinition | undefined {
  return apps.find((a) => a.id === id)
}

export function getAppsForRole(role: AppRole): AppDefinition[] {
  return apps.filter((a) => a.requiredRoles.includes(role))
}
