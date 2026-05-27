import { requireApp } from '@/lib/permissions/require-app'
import { PdfSignLoader } from './pdf-sign-loader'

export default async function PdfSignPage() {
  await requireApp('pdf-sign')
  return <PdfSignLoader />
}
