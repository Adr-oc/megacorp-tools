import { requireApp } from '@/lib/permissions/require-app'
import { QrGeneratorLoader } from './qr-generator-loader'

export default async function QrGeneratorPage() {
  await requireApp('qr-generator')
  return <QrGeneratorLoader />
}
