'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Code2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type Props = {
  html: string
  text: string
}

export function SignaturePreview({ html, text }: Props) {
  const [copied, setCopied] = useState<'rich' | 'raw' | null>(null)

  async function copyRich() {
    try {
      if (
        typeof ClipboardItem !== 'undefined' &&
        navigator.clipboard &&
        'write' in navigator.clipboard
      ) {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })
        await navigator.clipboard.write([item])
      } else {
        await navigator.clipboard.writeText(text)
      }
      setCopied('rich')
      toast.success('Firma copiada con formato. Pegala en tu correo.')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  async function copyRaw() {
    try {
      await navigator.clipboard.writeText(html)
      setCopied('raw')
      toast.success('HTML crudo copiado')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('No se pudo copiar el HTML')
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-lg border bg-white p-4 text-black overflow-auto"
        // El HTML proviene de la plantilla del admin; los valores del usuario
        // se escapan en renderSignature() antes de insertarse.
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={copyRich}>
          <Copy className="size-4" />
          {copied === 'rich' ? '¡Copiada!' : 'COPIAR firma'}
        </Button>
        <Button variant="outline" onClick={copyRaw}>
          <Code2 className="size-4" />
          {copied === 'raw' ? '¡Copiado!' : 'Copiar HTML crudo'}
        </Button>
      </div>
    </div>
  )
}
