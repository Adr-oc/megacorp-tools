import { LearningLoader } from './learning-loader'
import { requireApp } from '@/lib/permissions/require-app'
import { getLearningHubData } from '@/lib/learning/actions'

export default async function LearningPage() {
  await requireApp('learning')
  const initialData = await getLearningHubData()
  return <LearningLoader initialData={initialData} />
}
