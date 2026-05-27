'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { addRecent } from '@/lib/recents/client'
import { Controls } from '@/components/image-converter/controls'
import { EmptyState } from '@/components/image-converter/empty-state'
import { ImageList, type ImageItem } from '@/components/image-converter/image-list'
import { UploadZone } from '@/components/image-converter/upload-zone'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import {
  convertImage,
  loadSourceImage,
  rename,
  type ConvertOptions,
} from '@/lib/image-converter/convert'
import { downloadBlob, downloadMany } from '@/lib/image-converter/download'

const DEFAULT_OPTIONS: ConvertOptions = {
  format: 'webp',
  quality: 0.8,
  resize: { width: null, height: null, keepAspect: true },
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function Converter() {
  const [items, setItems] = useState<ImageItem[]>([])
  const [options, setOptions] = useState<ConvertOptions>(DEFAULT_OPTIONS)
  const [converting, setConverting] = useState(false)
  const triggerPickerRef = useRef<() => void>(() => {})
  const itemsRef = useRef<ImageItem[]>([])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    addRecent('image-converter')
  }, [])

  // Liberar los object URLs de las previews al desmontar.
  useEffect(() => {
    return () => {
      for (const it of itemsRef.current) URL.revokeObjectURL(it.previewUrl)
    }
  }, [])

  const onFiles = useCallback(async (files: File[]) => {
    const loaded = await Promise.all(
      files.map(async (file) => {
        try {
          const src = await loadSourceImage(file)
          // No retenemos el bitmap en estado para no consumir memoria; se recrea al convertir.
          src.bitmap.close?.()
          const item: ImageItem = {
            id: makeId(),
            file,
            previewUrl: URL.createObjectURL(file),
            width: src.width,
            height: src.height,
            status: 'pending',
            resultBlob: null,
            resultName: null,
            resultFormat: null,
            error: null,
          }
          return item
        } catch {
          toast.error(`No se pudo leer "${file.name}"`)
          return null
        }
      }),
    )
    const valid = loaded.filter((x): x is ImageItem => x !== null)
    if (valid.length > 0) setItems((prev) => [...prev, ...valid])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    setItems((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl)
      return []
    })
  }, [])

  // Convierte un único archivo y devuelve el blob + nombre.
  const convertOne = useCallback(
    async (item: ImageItem, opts: ConvertOptions) => {
      const src = await loadSourceImage(item.file)
      try {
        const blob = await convertImage(src, opts)
        const name = rename(item.file.name, opts.format)
        return { blob, name }
      } finally {
        src.bitmap.close?.()
      }
    },
    [],
  )

  // Convierte todas las imágenes y descarga el lote.
  const convertAll = useCallback(async () => {
    const current = itemsRef.current
    if (current.length === 0 || converting) return
    setConverting(true)

    const results: { blob: Blob; filename: string }[] = []
    for (const item of current) {
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: 'converting', error: null } : p)),
      )
      try {
        const { blob, name } = await convertOne(item, options)
        results.push({ blob, filename: name })
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  status: 'done',
                  resultBlob: blob,
                  resultName: name,
                  resultFormat: options.format,
                  error: null,
                }
              : p,
          ),
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al convertir'
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: message } : p)),
        )
      }
    }

    setConverting(false)

    if (results.length > 0) {
      await downloadMany(results)
      toast.success(
        `${results.length} imagen${results.length === 1 ? '' : 'es'} convertida${results.length === 1 ? '' : 's'} y descargada${results.length === 1 ? '' : 's'}`,
      )
    } else {
      toast.error('No se pudo convertir ninguna imagen')
    }
  }, [converting, convertOne, options])

  // Descarga individual: convierte al vuelo si aún no hay resultado vigente.
  const downloadOne = useCallback(
    async (item: ImageItem) => {
      try {
        if (item.resultBlob && item.resultName) {
          downloadBlob(item.resultBlob, item.resultName)
          return
        }
        const { blob, name } = await convertOne(item, options)
        downloadBlob(blob, name)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al convertir'
        toast.error(message)
      }
    },
    [convertOne, options],
  )

  const hasItems = items.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conversor de imágenes</h1>
          <p className="text-sm text-muted-foreground">
            Convertí, redimensioná y comprimí imágenes. Todo se procesa en tu navegador.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasItems && (
            <UploadZone
              onFiles={onFiles}
              registerTrigger={(fn) => {
                triggerPickerRef.current = fn
              }}
            />
          )}
          {hasItems && (
            <Button variant="outline" size="sm" className="gap-2" onClick={clearAll}>
              <Trash2 className="h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {!hasItems ? (
        <>
          <UploadZone
            onFiles={onFiles}
            showButton={false}
            registerTrigger={(fn) => {
              triggerPickerRef.current = fn
            }}
          />
          <EmptyState onChoose={() => triggerPickerRef.current()} />
        </>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="mb-2 text-sm text-muted-foreground">
              {items.length} imagen{items.length === 1 ? '' : 'es'} en la cola
            </div>
            <ImageList items={items} onRemove={removeItem} onDownload={downloadOne} />
          </div>
          <div className="w-full lg:w-80 lg:shrink-0">
            <Controls
              options={options}
              onChange={setOptions}
              onConvertAll={convertAll}
              converting={converting}
              count={items.length}
            />
          </div>
        </div>
      )}
    </div>
  )
}
