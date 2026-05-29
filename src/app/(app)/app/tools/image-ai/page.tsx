import { requireApp } from '@/lib/permissions/require-app'
import { ImageAiLoader } from './image-ai-loader'

export default async function ImageAiPage() {
  await requireApp('image-ai')
  return <ImageAiLoader />
}
