import { requireApp } from '@/lib/permissions/require-app'
import { UnitsConverter } from '@/components/units-converter/units-converter'

export default async function UnitsConverterPage() {
  await requireApp('units-converter')
  return <UnitsConverter />
}
