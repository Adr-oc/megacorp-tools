'use client'

import { FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState({ onChoose }: { onChoose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full bg-muted p-6">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-1">Cargá tu primer PDF</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Soltá archivos PDF acá o hacé clic en el botón. Todo el procesamiento ocurre en tu navegador — nada se sube al servidor.
        </p>
      </div>
      <Button onClick={onChoose} className="gap-2">
        <Upload className="h-4 w-4" />
        Elegir archivos
      </Button>
    </div>
  )
}
