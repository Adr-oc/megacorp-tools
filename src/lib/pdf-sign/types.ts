// Tipos compartidos de la herramienta Firma de PDF.
// Toda la geometría de colocación se expresa en coordenadas NORMALIZADAS
// (0..1) sobre la vista RENDERIZADA de la página (orientación visual, ya
// considerando la rotación intrínseca del PDF). Origen arriba-izquierda.

export type SignaturePlacement = {
  /** Índice de página 0-based donde se estampa. */
  pageIndex: number
  /** Borde izquierdo de la firma, fracción del ancho visual (0..1). */
  x: number
  /** Borde superior de la firma, fracción del alto visual (0..1). */
  y: number
  /** Ancho de la firma, fracción del ancho visual (0..1). */
  width: number
  /** Alto de la firma, fracción del alto visual (0..1). */
  height: number
}

export type PageSize = {
  /** Ancho visual en puntos PDF (ya rotado). */
  width: number
  /** Alto visual en puntos PDF (ya rotado). */
  height: number
}

export type RenderedPage = {
  pageIndex: number
  dataUrl: string
  /** Ancho del canvas renderizado en px. */
  width: number
  /** Alto del canvas renderizado en px. */
  height: number
}
