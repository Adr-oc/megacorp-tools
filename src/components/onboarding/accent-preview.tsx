import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AccentPreview() {
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
        Vista previa en vivo
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="rounded-md bg-muted p-2">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] px-2 py-0.5 rounded border border-brand-accent text-brand-accent">
            Disponible
          </span>
        </div>
        <div>
          <div className="font-semibold mb-1">PDF Workbench</div>
          <p className="text-sm text-muted-foreground">
            Combiná, separá, reordená y rotá páginas. Todo en tu navegador.
          </p>
        </div>
        <Button size="sm">Abrir herramienta →</Button>
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="text-sm font-medium">Botones</div>
        <div className="flex gap-2">
          <Button size="sm">Primario</Button>
          <Button size="sm" variant="outline">Outline</Button>
          <Button size="sm" variant="ghost">Subtle</Button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Tags</span>
          <span className="px-1.5 py-0.5 rounded bg-muted font-mono">pdf-workbench</span>
          <span className="px-1.5 py-0.5 rounded bg-muted font-mono">settings</span>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Uso este mes</span>
          <span className="font-mono text-xs">72 %</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-brand-accent" style={{ width: '72%' }} />
        </div>
      </div>
    </div>
  )
}
