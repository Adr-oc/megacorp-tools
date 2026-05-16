import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AppDefinition } from '@/lib/apps/types'

export function AppCard({ app }: { app: AppDefinition }) {
  const Icon = app.icon
  const isAvailable = app.status === 'available'

  const card = (
    <Card className={isAvailable ? 'hover:border-primary transition-colors cursor-pointer h-full' : 'opacity-60 h-full'}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <Icon className="h-8 w-8 text-primary" />
          {app.status === 'coming-soon' && (
            <Badge variant="secondary">Próximamente</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="mb-1">{app.name}</CardTitle>
        <CardDescription>{app.description}</CardDescription>
      </CardContent>
    </Card>
  )

  if (!isAvailable) {
    return <div>{card}</div>
  }

  return (
    <Link href={app.href} className="block">
      {card}
    </Link>
  )
}
