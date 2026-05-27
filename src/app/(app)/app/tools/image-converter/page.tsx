import { requireApp } from '@/lib/permissions/require-app'
import { ConverterLoader } from './converter-loader'

export default async function ImageConverterPage() {
  await requireApp('image-converter')
  return <ConverterLoader />
}
