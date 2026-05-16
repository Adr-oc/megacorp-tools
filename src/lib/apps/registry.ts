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
    id: 'pdf-workbench',
    name: 'PDF Workbench',
    description: 'Combinar, separar, reordenar y editar páginas de PDFs. Todo en tu navegador, nada se sube.',
    icon: FileText,
    href: '/app/tools/pdf-workbench',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'available',
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
