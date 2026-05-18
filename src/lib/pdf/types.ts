export type PdfId = string  // ulid
export type PageId = string // ulid por instancia (permite duplicar)

export type Badge = {
  label: string  // 3 letras uppercase, derivado del filename
  color: string  // hex, viene de la paleta en badges.ts
}

export type LoadedPdf = {
  id: PdfId
  name: string
  bytes: Uint8Array
  pageCount: number
  badge: Badge
  loadedAt: number
}

export type WorkspacePage =
  | {
      id: PageId
      kind: 'source'
      sourceId: PdfId
      sourceIndex: number
      rotation: 0 | 90 | 180 | 270
    }
  | {
      id: PageId
      kind: 'blank'
      width: number   // puntos PDF
      height: number
    }

export type ExportQuality = 'high' | 'medium' | 'low'

export type WorkspaceState = {
  pdfs: Record<PdfId, LoadedPdf>
  pages: WorkspacePage[]
  selection: Set<PageId>
  thumbnails: Record<PageId, string>  // dataURL
  lastSelectedId: PageId | null       // para shift-clic rango
  exporting: boolean                  // spinner de export
  exportQuality: ExportQuality
}

export function createInitialState(): WorkspaceState {
  return {
    pdfs: {},
    pages: [],
    selection: new Set(),
    thumbnails: {},
    lastSelectedId: null,
    exporting: false,
    exportQuality: 'high',
  }
}
