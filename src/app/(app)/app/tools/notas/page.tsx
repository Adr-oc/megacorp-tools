import { requireApp } from '@/lib/permissions/require-app'
import { NotasLoader } from './notas-loader'

export default async function NotasPage() {
  await requireApp('notas')
  return <NotasLoader />
}
