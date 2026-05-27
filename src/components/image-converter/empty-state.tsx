'use client'

import { ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  onChoose: () => void
}

export function EmptyState({ onChoose }: Props) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <ImagePlus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <h2 className="text-lg font-semibold">Convertí tus imágenes sin salir del navegador</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Arrastrá imágenes acá o seleccionalas. Todo el procesamiento ocurre en tu equipo —
        nada se sube a ningún servidor.
      </p>
      <Button className="mt-4 gap-2" onClick={onChoose}>
        <ImagePlus className="h-4 w-4" />
        Seleccionar imágenes
      </Button>
    </div>
  )
}
