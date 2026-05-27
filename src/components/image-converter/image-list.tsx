'use client'

import Image from 'next/image'
import { Download, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes, FORMAT_LABELS, type OutputFormat } from '@/lib/image-converter/convert'

export type ImageItem = {
  id: string
  file: File
  previewUrl: string
  width: number
  height: number
  status: 'pending' | 'converting' | 'done' | 'error'
  resultBlob: Blob | null
  resultName: string | null
  resultFormat: OutputFormat | null
  error: string | null
}

type Props = {
  items: ImageItem[]
  onRemove: (id: string) => void
  onDownload: (item: ImageItem) => void
}

export function ImageList({ items, onRemove, onDownload }: Props) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-lg border p-2"
        >
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={item.previewUrl}
              alt={item.file.name}
              fill
              unoptimized
              className="object-cover"
              sizes="56px"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={item.file.name}>
              {item.file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.width}×{item.height} · {formatBytes(item.file.size)}
              {item.status === 'done' && item.resultBlob && item.resultFormat && (
                <>
                  {' '}
                  → {FORMAT_LABELS[item.resultFormat]} · {formatBytes(item.resultBlob.size)}
                </>
              )}
            </p>
            {item.status === 'error' && item.error && (
              <p className="truncate text-xs text-destructive">{item.error}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {item.status === 'converting' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {item.status === 'done' && item.resultBlob && (
              <Button
                variant="outline"
                size="icon-sm"
                title="Descargar"
                onClick={() => onDownload(item)}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              title="Quitar"
              onClick={() => onRemove(item.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
