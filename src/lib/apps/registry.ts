import {
  Settings,
  FileText,
  ImageIcon,
  FileImage,
  QrCode,
  Signature,
  Calculator,
  MailCheck,
} from 'lucide-react'
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
    id: 'image-converter',
    name: 'Conversor de imágenes',
    description: 'Convertir entre PNG, JPG y WebP, redimensionar y comprimir. Todo en tu navegador, nada se sube.',
    icon: FileImage,
    href: '/app/tools/image-converter',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'available',
  },
  {
    id: 'qr-generator',
    name: 'Generador de QR',
    description: 'Códigos QR para URLs, vCard, WiFi y texto. Descargá en PNG o SVG.',
    icon: QrCode,
    href: '/app/tools/qr-generator',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'available',
  },
  {
    id: 'pdf-sign',
    name: 'Firma de PDF',
    description: 'Dibujá o subí tu firma y estampala en cualquier PDF. Procesamiento local, nada se sube.',
    icon: Signature,
    href: '/app/tools/pdf-sign',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'available',
  },
  {
    id: 'units-converter',
    name: 'Conversor de unidades',
    description: 'Longitud, peso, volumen, temperatura y moneda con tasas del Banguat en vivo.',
    icon: Calculator,
    href: '/app/tools/units-converter',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'available',
  },
  {
    id: 'email-signature',
    name: 'Firmas de correo',
    description: 'Plantilla de firma corporativa: el admin la define, cada quien completa sus datos y copia lista para pegar.',
    icon: MailCheck,
    href: '/app/tools/email-signature',
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
