'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { isAcceptedImage } from '@/lib/image-converter/convert'

type Props = {
  onFiles: (files: File[]) => Promise<void> | void
  /** Si true, muestra como botón compacto en sub-header. */
  showButton?: boolean
  /** El padre registra un trigger del file picker para invocarlo desde otros componentes. */
  registerTrigger?: (fn: () => void) => void
}

export function UploadZone({ onFiles, showButton = true, registerTrigger }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)

  useEffect(() => {
    registerTrigger?.(() => inputRef.current?.click())
  }, [registerTrigger])

  useEffect(() => {
    function hasFiles(e: DragEvent): boolean {
      return Array.from(e.dataTransfer?.types ?? []).includes('Files')
    }

    function onEnter(e: DragEvent) {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragCounter.current++
      setDragging(true)
    }
    function onOver(e: DragEvent) {
      if (!hasFiles(e)) return
      e.preventDefault()
    }
    function onLeave(e: DragEvent) {
      if (!hasFiles(e)) return
      dragCounter.current--
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setDragging(false)
      }
    }
    async function onDrop(e: DragEvent) {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragCounter.current = 0
      setDragging(false)
      const dropped = Array.from(e.dataTransfer?.files ?? [])
      const images = dropped.filter(isAcceptedImage)
      const skipped = dropped.length - images.length
      if (skipped > 0)
        toast.warning(
          `${skipped} archivo${skipped === 1 ? '' : 's'} ignorado${skipped === 1 ? '' : 's'} (solo imágenes)`,
        )
      if (images.length > 0) await onFiles(images)
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [onFiles])

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
      {showButton && (
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="gap-2">
          <Upload className="h-4 w-4" />
          Cargar más
        </Button>
      )}
      {dragging && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-none"
          aria-live="polite"
        >
          <div className="rounded-lg border-2 border-dashed border-primary bg-background px-12 py-8 text-center">
            <Upload className="h-10 w-10 text-primary mx-auto mb-2" />
            <p className="text-lg font-semibold">Soltá tus imágenes para agregarlas</p>
          </div>
        </div>
      )}
    </>
  )
}
