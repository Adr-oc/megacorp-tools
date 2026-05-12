import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <section className="container mx-auto px-4 py-24 max-w-2xl text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-4">MegaTools</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Portal de herramientas internas del grupo MEGACORP.
      </p>
      <Button asChild size="lg">
        <Link href="/login">Iniciar sesión</Link>
      </Button>
    </section>
  )
}
