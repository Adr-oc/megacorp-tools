export type TourStep = {
  number: string
  label: string
  title: string
  body: string
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    number: '01',
    label: 'BIENVENIDA',
    title: 'Bienvenido a MegaTools',
    body:
      'Este es el portal interno del grupo MEGACORP — todas tus herramientas en un solo lugar, con tu cuenta.',
  },
  {
    number: '02',
    label: 'APPS REGISTRY',
    title: 'Cada herramienta es una app',
    body:
      'El panel principal lista todas las apps disponibles para tu rol. Hoy: PDF Workbench (operar sobre PDFs) y Configuración. Próximamente: Imágenes con IA. Iremos sumando más.',
  },
  {
    number: '03',
    label: 'TU COLOR',
    title: 'Tu accent te acompaña',
    body:
      'El color que elegiste tiñe botones, focos y resaltes en todo el portal. Lo cambiás cuando quieras desde Configuración → Apariencia.',
  },
  {
    number: '04',
    label: 'CONFIGURACIÓN',
    title: 'Todo lo personal está en Settings',
    body:
      'Tu perfil, apariencia, organización y notificaciones viven en Configuración. Owner/admin también ven Miembros.',
  },
  {
    number: '05',
    label: 'ATAJOS',
    title: 'Tip — atajos de teclado',
    body:
      'En herramientas que los soportan, mirá el bottom-left para ver atajos. En PDF Workbench: Del, R, Cmd/Ctrl+D, Esc, Cmd/Ctrl+A.',
  },
  {
    number: '06',
    label: 'AYUDA',
    title: 'Siempre a un click',
    body:
      'Si te perdés o querés repasar este tour, el botón ❓ del header te trae de vuelta acá.',
  },
] as const
