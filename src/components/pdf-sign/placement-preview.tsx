'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RenderedPage } from '@/lib/pdf-sign/types'

/** Colocación 2D editable (sin alto: el alto se deriva del aspect de la firma). */
export type Placement2D = {
  /** Borde izquierdo, fracción del ancho visual (0..1). */
  x: number
  /** Borde superior, fracción del alto visual (0..1). */
  y: number
  /** Ancho de la firma, fracción del ancho visual (0..1). */
  width: number
}

type Props = {
  page: RenderedPage
  signatureDataUrl: string
  /** Aspect ratio (ancho/alto) de la firma recortada. */
  signatureAspect: number
  placement: Placement2D
  onChange: (next: Placement2D) => void
}

/** Alto normalizado de la firma, derivado del ancho y el aspect. */
export function deriveHeight(widthFrac: number, page: RenderedPage, aspect: number): number {
  const heightPx = (widthFrac * page.width) / aspect
  return heightPx / page.height
}

/**
 * Muestra la página renderizada y un overlay con la firma que se puede
 * arrastrar (mover) y redimensionar (esquina inferior-derecha). Todo en
 * coordenadas normalizadas (0..1) sobre la vista visual de la página.
 */
export function PlacementPreview({
  page,
  signatureDataUrl,
  signatureAspect,
  placement,
  onChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<null | { type: 'move' | 'resize'; offsetX: number; offsetY: number }>(null)

  const height = deriveHeight(placement.width, page, signatureAspect)

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const container = containerRef.current
      if (!container || !mode) return
      const rect = container.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width
      const ny = (e.clientY - rect.top) / rect.height
      const p = placement
      const h = deriveHeight(p.width, page, signatureAspect)

      if (mode.type === 'move') {
        const x = clamp(nx - mode.offsetX, 0, 1 - p.width)
        const y = clamp(ny - mode.offsetY, 0, 1 - h)
        onChange({ ...p, x, y })
      } else {
        const minW = 0.05
        let width = clamp(nx - p.x, minW, 1 - p.x)
        // No dejar que el alto derivado se salga de la página.
        const maxHeight = 1 - p.y
        const widthForMaxH = (maxHeight * page.height * signatureAspect) / page.width
        if (width > widthForMaxH) width = widthForMaxH
        onChange({ ...p, width })
      }
    },
    [mode, placement, page, signatureAspect, onChange],
  )

  const endDrag = useCallback(() => setMode(null), [])

  useEffect(() => {
    if (!mode) return
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
    }
  }, [mode, onPointerMove, endDrag])

  function startMove(e: React.PointerEvent) {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width
    const ny = (e.clientY - rect.top) / rect.height
    setMode({ type: 'move', offsetX: nx - placement.x, offsetY: ny - placement.y })
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    setMode({ type: 'resize', offsetX: 0, offsetY: 0 })
  }

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-3xl select-none overflow-hidden rounded-lg border bg-white shadow-sm"
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={page.dataUrl}
        alt={`Página ${page.pageIndex + 1}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        draggable={false}
      />
      <div
        className="absolute cursor-move touch-none border-2 border-primary/70 bg-primary/5"
        style={{
          left: `${placement.x * 100}%`,
          top: `${placement.y * 100}%`,
          width: `${placement.width * 100}%`,
          height: `${height * 100}%`,
        }}
        onPointerDown={startMove}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signatureDataUrl}
          alt="Firma"
          className="pointer-events-none h-full w-full object-contain"
          draggable={false}
        />
        <div
          className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border-2 border-background bg-primary"
          onPointerDown={startResize}
          aria-label="Redimensionar firma"
        />
      </div>
    </div>
  )
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
