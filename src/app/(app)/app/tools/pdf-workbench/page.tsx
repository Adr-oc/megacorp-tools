import { requireApp } from '@/lib/permissions/require-app'
import { Workbench } from './workbench'

export default async function PdfWorkbenchPage() {
  await requireApp('pdf-workbench')
  return <Workbench />
}
