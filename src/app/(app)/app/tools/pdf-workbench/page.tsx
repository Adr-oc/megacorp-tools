import { requireApp } from '@/lib/permissions/require-app'
import { WorkbenchLoader } from './workbench-loader'

export default async function PdfWorkbenchPage() {
  await requireApp('pdf-workbench')
  return <WorkbenchLoader />
}
