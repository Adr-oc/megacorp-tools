# PDF Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el PDF Workbench Sprint 1 — herramienta cliente-puro para cargar varios PDFs, reordenar/eliminar/rotar/duplicar/mezclar páginas en una grilla única y exportar en 3 modos (completo, selección, página individual).

**Architecture:** Página Next.js client component bajo `/app/tools/pdf-workbench` dentro del shell autenticado. Estado en memoria con `useReducer` + Context. Procesamiento 100% en el navegador con `pdf-lib` (manipulación) y `pdfjs-dist` (thumbnails). Drag-and-drop con `@dnd-kit/sortable`. Cero backend nuevo.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/ui sobre Base UI, `pdf-lib`, `pdfjs-dist`, `@dnd-kit/core` + `@dnd-kit/sortable`, `ulid`. Tests E2E con Playwright.

**Convenciones del repo (importantes):**
- Spanish de Guatemala profesional en strings de UI; código y commits en español.
- Los commits cierran tareas pequeñas (no batchear) y siguen el patrón `feat(s1): …` para Sprint 1, `fix(s1): …`, `test(s1): …`, `docs(s1): …`.
- `pnpm tsc --noEmit` debe pasar en cada commit. Lint es `pnpm lint`.
- No correr `pnpm dev` desde dentro de las tareas — el usuario ya lo tiene en `:3003` desde `pnpm dev --port 3003`. Cuando una tarea exija smoke en runtime, asumir esa URL.
- Triggers de Base UI con un `<Button>` shadcn deben usar la prop `render={<Button …>…</Button>}` para no anidar `<button>` (ver `src/components/theme-toggle.tsx`).

---

## File structure

```
NUEVOS:
src/lib/pdf/
├── types.ts                        # WorkspaceState, LoadedPdf, WorkspacePage
├── badges.ts                       # paleta de colores + asignación por PDF
├── thumbnail-renderer.ts           # PDF.js worker setup + render a dataURL
├── document-store.tsx              # Context + useReducer; expone hooks useWorkspace, useDispatch
├── operations.ts                   # reducers puros (todas las acciones)
└── exporter.ts                     # 3 modos de export con pdf-lib

src/app/(app)/app/tools/pdf-workbench/
├── page.tsx                        # server component thin, gate de auth
└── workbench.tsx                   # client root, monta Context + DnD root + layout

src/components/pdf-workbench/
├── empty-state.tsx                 # CTA inicial "Cargá tu primer PDF"
├── upload-zone.tsx                 # botón + drop area SO (full-screen overlay)
├── sub-header.tsx                  # contador + botón "+ Cargar más" + ExportMenu
├── toolbar.tsx                     # acciones bulk (visible con selección)
├── page-grid.tsx                   # SortableContext + grid
├── page-tile.tsx                   # tile con thumbnail, badge, checkbox, menú contextual
└── export-menu.tsx                 # DropdownMenu con 3 modos

scripts/
└── build-pdf-fixtures.ts           # genera fixtures de prueba

tests/e2e/
├── fixtures/sample-2p.pdf          # binario generado por el script
├── fixtures/sample-3p.pdf
└── pdf-workbench.spec.ts           # 5 specs E2E

MODIFICADOS:
src/lib/apps/registry.ts            # pdf-splitter → pdf-workbench, status available
README.md                           # mención de la herramienta disponible
package.json                        # nuevas deps
public/                             # worker de pdf.js (si la estrategia lo requiere)
```

---

## Task 1: Dependencias y registry

**Files:**
- Modify: `package.json`
- Modify: `src/lib/apps/registry.ts`

- [ ] **Step 1: Instalar dependencias**

```bash
pnpm add pdf-lib pdfjs-dist @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities ulid
```

- [ ] **Step 2: Verificar versiones quedaron registradas**

```bash
grep -E '"(pdf-lib|pdfjs-dist|@dnd-kit|ulid)"' package.json
```

Expected: 5 líneas con versiones resueltas (pdf-lib ^1.x, pdfjs-dist ^4.x o ^5.x, @dnd-kit/core ^6.x, @dnd-kit/sortable ^8.x o ^9.x, @dnd-kit/utilities ^3.x, ulid ^2.x).

- [ ] **Step 3: Modificar el registry**

Reemplazar la entrada `pdf-splitter` en `src/lib/apps/registry.ts` por:

```ts
  {
    id: 'pdf-workbench',
    name: 'PDF Workbench',
    description: 'Combinar, separar, reordenar y editar páginas de PDFs. Todo en tu navegador, nada se sube.',
    icon: FileText,
    href: '/app/tools/pdf-workbench',
    requiredRoles: ['member', 'admin', 'owner'],
    status: 'available',
  },
```

- [ ] **Step 4: Smoke test — tsc + lint + home grid responde**

```bash
pnpm tsc --noEmit && pnpm lint
curl -sS http://localhost:3003/app -b /tmp/mtcookie.txt | grep -oE "PDF Workbench"
```

Expected: tsc EXIT=0, lint EXIT=0, grep imprime `PDF Workbench`. Si el cookie está vencido: re-loguear con `curl -sS -o /dev/null -X POST http://localhost:3003/api/auth/sign-in/email -H 'Content-Type: application/json' -H 'Origin: http://localhost:3003' -d '{"email":"admin@megacorp.local","password":"Admin123!Cambiame"}' -c /tmp/mtcookie.txt`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/apps/registry.ts
git commit -m "feat(s1): registry expone PDF Workbench + dependencias (pdf-lib, pdfjs-dist, dnd-kit, ulid)"
```

---

## Task 2: Tipos centrales y paleta de badges

**Files:**
- Create: `src/lib/pdf/types.ts`
- Create: `src/lib/pdf/badges.ts`

- [ ] **Step 1: Crear `src/lib/pdf/types.ts`**

```ts
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

export type WorkspaceState = {
  pdfs: Record<PdfId, LoadedPdf>
  pages: WorkspacePage[]
  selection: Set<PageId>
  thumbnails: Record<PageId, string>  // dataURL
  lastSelectedId: PageId | null       // para shift-clic rango
  exporting: boolean                  // spinner de export
}

export const initialState: WorkspaceState = {
  pdfs: {},
  pages: [],
  selection: new Set(),
  thumbnails: {},
  lastSelectedId: null,
  exporting: false,
}
```

- [ ] **Step 2: Crear `src/lib/pdf/badges.ts`**

```ts
import type { Badge, PdfId } from './types'

// Paleta de 8 colores accesibles (contraste >4.5 sobre fondo blanco)
const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
] as const

function labelFromName(name: string): string {
  // "Contrato Aduana 2026.pdf" → "CON"
  const base = name.replace(/\.pdf$/i, '').trim()
  const letters = base.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return letters.slice(0, 3) || 'PDF'
}

export function buildBadge(name: string, existingPdfIds: PdfId[]): Badge {
  // Rota la paleta según cuántos PDFs ya hay cargados
  const color = PALETTE[existingPdfIds.length % PALETTE.length]
  return { label: labelFromName(name), color }
}
```

- [ ] **Step 3: Smoke test — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf/types.ts src/lib/pdf/badges.ts
git commit -m "feat(s1): tipos del workspace + paleta de badges por PDF"
```

---

## Task 3: PDF.js worker + thumbnail renderer

**Files:**
- Create: `src/lib/pdf/thumbnail-renderer.ts`

**Contexto técnico:** `pdfjs-dist` requiere un worker. La estrategia más simple en Next 16 + Turbopack es usar el legacy build sin worker (más lento pero zero config). Para mantener responsiveness usamos un concurrency limit que paraleliza renders sin spawning explícito de Worker.

- [ ] **Step 1: Crear `src/lib/pdf/thumbnail-renderer.ts`**

```ts
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

// El legacy build no necesita worker explícito.
// Lo desactivamos para evitar fetchear el worker de un CDN.
pdfjs.GlobalWorkerOptions.workerSrc = ''

export type ThumbnailRequest = {
  pageId: string
  bytes: Uint8Array
  sourceIndex: number   // 0-based en el PDF original
  rotation: 0 | 90 | 180 | 270
  maxWidth?: number     // default 280px
}

export type ThumbnailResult = {
  pageId: string
  dataUrl: string
}

const MAX_CONCURRENT = 4
const queue: Array<() => Promise<void>> = []
let running = 0

function drain() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!
    running++
    job().finally(() => {
      running--
      drain()
    })
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        resolve(await fn())
      } catch (e) {
        reject(e)
      }
    })
    drain()
  })
}

export async function renderThumbnail(req: ThumbnailRequest): Promise<ThumbnailResult> {
  return enqueue(async () => {
    const loadingTask = pdfjs.getDocument({ data: req.bytes })
    const doc = await loadingTask.promise
    try {
      const page = await doc.getPage(req.sourceIndex + 1)
      const baseViewport = page.getViewport({ scale: 1 })
      const maxWidth = req.maxWidth ?? 280
      const scale = maxWidth / baseViewport.width
      const viewport = page.getViewport({ scale, rotation: req.rotation })

      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No se pudo crear contexto 2D')

      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      return { pageId: req.pageId, dataUrl }
    } finally {
      doc.destroy()
    }
  })
}
```

- [ ] **Step 2: Smoke test — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0. Si pdfjs-dist quejara por tipos (a veces el legacy entry no tiene types), agregar un `declare module 'pdfjs-dist/legacy/build/pdf.mjs'` en `src/types/pdfjs.d.ts` con `export = pdfjs; export as namespace pdfjs;` o `import type * as pdfjs from 'pdfjs-dist'` y re-castear.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/thumbnail-renderer.ts
git commit -m "feat(s1): thumbnail renderer con pdfjs-dist legacy + concurrency limit"
```

---

## Task 4: Operaciones puras del reducer

**Files:**
- Create: `src/lib/pdf/operations.ts`

- [ ] **Step 1: Crear `src/lib/pdf/operations.ts`**

```ts
import { ulid } from 'ulid'
import type { PageId, WorkspaceState, WorkspacePage } from './types'

export type Action =
  | { type: 'pdf/load'; pdfId: string; name: string; bytes: Uint8Array; pageCount: number; badge: { label: string; color: string } }
  | { type: 'pdf/remove'; pdfId: string }
  | { type: 'pages/delete'; ids: PageId[] }
  | { type: 'pages/move'; ids: PageId[]; toIndex: number }
  | { type: 'pages/rotate'; ids: PageId[]; delta: 90 | -90 | 180 }
  | { type: 'pages/duplicate'; ids: PageId[] }
  | { type: 'pages/insertBlank'; index: number; preset: 'a4' | 'letter' }
  | { type: 'selection/toggle'; id: PageId; mode: 'single' | 'add' | 'range' }
  | { type: 'selection/all' }
  | { type: 'selection/clear' }
  | { type: 'thumbnail/set'; id: PageId; dataUrl: string }
  | { type: 'export/start' }
  | { type: 'export/end' }

const PAGE_SIZES = {
  a4:     { width: 595, height: 842 },
  letter: { width: 612, height: 792 },
} as const

function normalizeRotation(current: 0 | 90 | 180 | 270, delta: 90 | -90 | 180): 0 | 90 | 180 | 270 {
  const next = (current + delta + 360) % 360
  return next as 0 | 90 | 180 | 270
}

export function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'pdf/load': {
      const newPages: WorkspacePage[] = []
      for (let i = 0; i < action.pageCount; i++) {
        newPages.push({ id: ulid(), kind: 'source', sourceId: action.pdfId, sourceIndex: i, rotation: 0 })
      }
      return {
        ...state,
        pdfs: {
          ...state.pdfs,
          [action.pdfId]: {
            id: action.pdfId,
            name: action.name,
            bytes: action.bytes,
            pageCount: action.pageCount,
            badge: action.badge,
            loadedAt: Date.now(),
          },
        },
        pages: [...state.pages, ...newPages],
      }
    }

    case 'pdf/remove': {
      const remainingPages = state.pages.filter(
        (p) => p.kind !== 'source' || p.sourceId !== action.pdfId,
      )
      const nextPdfs = { ...state.pdfs }
      delete nextPdfs[action.pdfId]
      const nextSelection = new Set(state.selection)
      for (const p of state.pages) {
        if (p.kind === 'source' && p.sourceId === action.pdfId) nextSelection.delete(p.id)
      }
      return { ...state, pdfs: nextPdfs, pages: remainingPages, selection: nextSelection }
    }

    case 'pages/delete': {
      const idsSet = new Set(action.ids)
      const remaining = state.pages.filter((p) => !idsSet.has(p.id))
      const nextSelection = new Set(state.selection)
      for (const id of action.ids) nextSelection.delete(id)
      return { ...state, pages: remaining, selection: nextSelection }
    }

    case 'pages/move': {
      const idsSet = new Set(action.ids)
      const moving = state.pages.filter((p) => idsSet.has(p.id))
      const remaining = state.pages.filter((p) => !idsSet.has(p.id))
      // toIndex es relativo al array original — ajustamos contando cuántos seleccionados quedan antes
      const targetBeforeRemoval = action.toIndex
      let adjustedIndex = targetBeforeRemoval
      for (const p of state.pages.slice(0, targetBeforeRemoval)) {
        if (idsSet.has(p.id)) adjustedIndex--
      }
      const next = [...remaining]
      next.splice(adjustedIndex, 0, ...moving)
      return { ...state, pages: next }
    }

    case 'pages/rotate': {
      const idsSet = new Set(action.ids)
      const next = state.pages.map<WorkspacePage>((p) => {
        if (!idsSet.has(p.id) || p.kind !== 'source') return p
        return { ...p, rotation: normalizeRotation(p.rotation, action.delta) }
      })
      return { ...state, pages: next }
    }

    case 'pages/duplicate': {
      const idsSet = new Set(action.ids)
      const result: WorkspacePage[] = []
      for (const p of state.pages) {
        result.push(p)
        if (idsSet.has(p.id)) {
          result.push({ ...p, id: ulid() })
        }
      }
      return { ...state, pages: result }
    }

    case 'pages/insertBlank': {
      const size = PAGE_SIZES[action.preset]
      const blank: WorkspacePage = { id: ulid(), kind: 'blank', width: size.width, height: size.height }
      const next = [...state.pages]
      next.splice(action.index, 0, blank)
      return { ...state, pages: next }
    }

    case 'selection/toggle': {
      const { id, mode } = action
      if (mode === 'single') {
        return { ...state, selection: new Set([id]), lastSelectedId: id }
      }
      if (mode === 'add') {
        const next = new Set(state.selection)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return { ...state, selection: next, lastSelectedId: id }
      }
      // range
      if (!state.lastSelectedId) {
        return { ...state, selection: new Set([id]), lastSelectedId: id }
      }
      const start = state.pages.findIndex((p) => p.id === state.lastSelectedId)
      const end = state.pages.findIndex((p) => p.id === id)
      if (start < 0 || end < 0) return state
      const [lo, hi] = start < end ? [start, end] : [end, start]
      const range = state.pages.slice(lo, hi + 1).map((p) => p.id)
      return { ...state, selection: new Set(range), lastSelectedId: id }
    }

    case 'selection/all':
      return { ...state, selection: new Set(state.pages.map((p) => p.id)) }

    case 'selection/clear':
      return { ...state, selection: new Set(), lastSelectedId: null }

    case 'thumbnail/set':
      return { ...state, thumbnails: { ...state.thumbnails, [action.id]: action.dataUrl } }

    case 'export/start':
      return { ...state, exporting: true }

    case 'export/end':
      return { ...state, exporting: false }

    default:
      return state
  }
}
```

- [ ] **Step 2: Smoke test — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/operations.ts
git commit -m "feat(s1): reducer puro del workspace con todas las acciones"
```

---

## Task 5: Document store (Context + hooks)

**Files:**
- Create: `src/lib/pdf/document-store.tsx`

- [ ] **Step 1: Crear `src/lib/pdf/document-store.tsx`**

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ulid } from 'ulid'
import { toast } from 'sonner'
import type { Action } from './operations'
import { reducer } from './operations'
import { initialState, type WorkspaceState } from './types'
import { buildBadge } from './badges'
import { renderThumbnail } from './thumbnail-renderer'

type Dispatch = (a: Action) => void

const StateCtx = createContext<WorkspaceState | null>(null)
const DispatchCtx = createContext<Dispatch | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // beforeunload guard
  useEffect(() => {
    if (state.pages.length === 0) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state.pages.length])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        {children}
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useWorkspace(): WorkspaceState {
  const v = useContext(StateCtx)
  if (!v) throw new Error('useWorkspace fuera de WorkspaceProvider')
  return v
}

export function useDispatch(): Dispatch {
  const v = useContext(DispatchCtx)
  if (!v) throw new Error('useDispatch fuera de WorkspaceProvider')
  return v
}

/**
 * Hook con la acción async loadPdf — porque carga + parseo + thumbnails son side effects.
 * Devuelve una función que toma un File y dispatcha pdf/load + render thumbnails en background.
 */
export function useLoadPdf() {
  const state = useWorkspace()
  const dispatch = useDispatch()
  return useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Solo se aceptan archivos .pdf')
        return
      }
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let pageCount: number
      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: false })
        pageCount = doc.getPageCount()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('encrypted')) {
          toast.error('El PDF está protegido con contraseña; quitá la protección antes de cargarlo')
        } else {
          toast.error(`No se pudo leer ${file.name}`)
        }
        return
      }
      const pdfId = ulid()
      const badge = buildBadge(file.name, Object.keys(state.pdfs))
      dispatch({ type: 'pdf/load', pdfId, name: file.name, bytes, pageCount, badge })

      // Render thumbnails en background (no esperamos)
      ;(async () => {
        // Las pages recién agregadas son las últimas `pageCount` del state futuro;
        // como dispatch ya corrió, leemos del próximo render via callback ref.
        // Para evitar carrera, lanzamos render por cada (pdfId, sourceIndex) y dispatchamos thumbnail/set
        // usando el pageId que ya conocemos del state actualizado en el siguiente tick.
        await new Promise((r) => setTimeout(r, 0))
        // Lectura via state cerrado: tomamos las pages del pdfId
        const pagesOfThisPdf = (window as unknown as { __mtState?: () => WorkspaceState }).__mtState?.()
          ?.pages.filter((p) => p.kind === 'source' && p.sourceId === pdfId) ?? []
        for (const p of pagesOfThisPdf) {
          if (p.kind !== 'source') continue
          renderThumbnail({ pageId: p.id, bytes, sourceIndex: p.sourceIndex, rotation: p.rotation })
            .then((r) => dispatch({ type: 'thumbnail/set', id: r.pageId, dataUrl: r.dataUrl }))
            .catch(() => {
              // tile mostrará placeholder; no rompe el flow
            })
        }
      })()
    },
    [state.pdfs, dispatch],
  )
}

/**
 * Bridge para que el hook async useLoadPdf pueda leer el state actual.
 * En lugar de pasar pages por argumento (lo cual obliga al caller a coordinarlo),
 * exponemos un lookup en window. Es un trade-off consciente para el MVP.
 */
export function useStateBridge() {
  const state = useWorkspace()
  useEffect(() => {
    ;(window as unknown as { __mtState?: () => WorkspaceState }).__mtState = () => state
    return () => {
      delete (window as unknown as { __mtState?: () => WorkspaceState }).__mtState
    }
  }, [state])
}

export function useTotalSize(): number {
  const { pdfs } = useWorkspace()
  return useMemo(() => Object.values(pdfs).reduce((acc, p) => acc + p.bytes.length, 0), [pdfs])
}
```

- [ ] **Step 2: Smoke test — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/document-store.tsx
git commit -m "feat(s1): Context + hooks del workspace + loader async con manejo de errores"
```

---

## Task 6: Exporter (3 modos)

**Files:**
- Create: `src/lib/pdf/exporter.ts`

- [ ] **Step 1: Crear `src/lib/pdf/exporter.ts`**

```ts
import { PDFDocument, degrees } from 'pdf-lib'
import type { PageId, WorkspaceState } from './types'

export async function exportPages(
  state: WorkspaceState,
  pageIds: PageId[],
): Promise<Uint8Array> {
  if (pageIds.length === 0) throw new Error('Sin páginas para exportar')

  const out = await PDFDocument.create()
  const docCache = new Map<string, PDFDocument>()

  for (const id of pageIds) {
    const page = state.pages.find((p) => p.id === id)
    if (!page) continue

    if (page.kind === 'blank') {
      out.addPage([page.width, page.height])
      continue
    }

    let srcDoc = docCache.get(page.sourceId)
    if (!srcDoc) {
      const pdf = state.pdfs[page.sourceId]
      if (!pdf) throw new Error(`PDF de origen no encontrado: ${page.sourceId}`)
      srcDoc = await PDFDocument.load(pdf.bytes)
      docCache.set(page.sourceId, srcDoc)
    }

    const [copied] = await out.copyPages(srcDoc, [page.sourceIndex])
    if (page.rotation !== 0) copied.setRotation(degrees(page.rotation))
    out.addPage(copied)
  }

  return out.save()
}

export function buildFilename(state: WorkspaceState, pageIds: PageId[], mode: 'all' | 'selection' | 'single'): string {
  const today = new Date().toISOString().slice(0, 10)

  if (mode === 'single' && pageIds.length === 1) {
    const page = state.pages.find((p) => p.id === pageIds[0])
    if (page && page.kind === 'source') {
      const pdf = state.pdfs[page.sourceId]
      const base = pdf?.name.replace(/\.pdf$/i, '') ?? 'pagina'
      return `${base}-pagina-${page.sourceIndex + 1}.pdf`
    }
    return `pagina-${today}.pdf`
  }

  if (mode === 'selection') return `seleccion-${today}.pdf`

  // mode === 'all'
  const sourceIds = new Set<string>()
  for (const p of state.pages) {
    if (p.kind === 'source') sourceIds.add(p.sourceId)
  }
  if (sourceIds.size === 1) {
    const [onlyId] = sourceIds
    const base = state.pdfs[onlyId]?.name.replace(/\.pdf$/i, '')
    if (base) return `${base}-editado.pdf`
  }
  return `documento-${today}.pdf`
}

export function downloadBytes(bytes: Uint8Array, filename: string): void {
  // Cast to satisfy the BlobPart type which expects ArrayBuffer in some TS lib versions
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

- [ ] **Step 2: Smoke test — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/exporter.ts
git commit -m "feat(s1): exporter con 3 modos (all/selection/single) y filename builder"
```

---

## Task 7: Página + workbench client root + empty state

**Files:**
- Create: `src/app/(app)/app/tools/pdf-workbench/page.tsx`
- Create: `src/app/(app)/app/tools/pdf-workbench/workbench.tsx`
- Create: `src/components/pdf-workbench/empty-state.tsx`

- [ ] **Step 1: Crear `src/app/(app)/app/tools/pdf-workbench/page.tsx`**

```tsx
import { requireApp } from '@/lib/permissions/require-app'
import { Workbench } from './workbench'

export default async function PdfWorkbenchPage() {
  await requireApp('pdf-workbench')
  return <Workbench />
}
```

- [ ] **Step 2: Crear `src/components/pdf-workbench/empty-state.tsx`**

```tsx
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
```

- [ ] **Step 3: Crear `src/app/(app)/app/tools/pdf-workbench/workbench.tsx`**

```tsx
'use client'

import { useRef } from 'react'
import { WorkspaceProvider, useLoadPdf, useStateBridge, useWorkspace } from '@/lib/pdf/document-store'
import { EmptyState } from '@/components/pdf-workbench/empty-state'

function WorkbenchInner() {
  useStateBridge()
  const { pages } = useWorkspace()
  const loadPdf = useLoadPdf()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onFilesPicked(files: FileList | null) {
    if (!files) return
    for (const f of Array.from(files)) await loadPdf(f)
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => onFilesPicked(e.target.files)}
      />
      {pages.length === 0 ? (
        <EmptyState onChoose={() => fileInputRef.current?.click()} />
      ) : (
        <div className="text-sm text-muted-foreground">
          {pages.length} página{pages.length === 1 ? '' : 's'} cargada{pages.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}

export function Workbench() {
  return (
    <WorkspaceProvider>
      <WorkbenchInner />
    </WorkspaceProvider>
  )
}
```

- [ ] **Step 4: Smoke test — tsc + ruta responde**

```bash
pnpm tsc --noEmit
curl -sS -o /tmp/wb.html -w "http=%{http_code}\n" http://localhost:3003/app/tools/pdf-workbench -b /tmp/mtcookie.txt
grep -oE "Cargá tu primer PDF|Elegir archivos" /tmp/wb.html | sort -u
```

Expected: EXIT=0, http=200, ambos textos aparecen en grep.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/app/tools/pdf-workbench' src/components/pdf-workbench/empty-state.tsx
git commit -m "feat(s1): página /app/tools/pdf-workbench con empty state funcional"
```

---

## Task 8: Upload zone (drop SO + botón "Cargar más")

**Files:**
- Create: `src/components/pdf-workbench/upload-zone.tsx`
- Modify: `src/app/(app)/app/tools/pdf-workbench/workbench.tsx`

- [ ] **Step 1: Crear `src/components/pdf-workbench/upload-zone.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Props = {
  onFiles: (files: File[]) => Promise<void> | void
  /** Si true, muestra como botón compacto en sub-header. Si false, oculto (sólo drop SO activo). */
  showButton?: boolean
}

export function UploadZone({ onFiles, showButton = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)

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
      const pdfs = dropped.filter((f) => f.name.toLowerCase().endsWith('.pdf'))
      const skipped = dropped.length - pdfs.length
      if (skipped > 0) toast.warning(`${skipped} archivo${skipped === 1 ? '' : 's'} ignorado${skipped === 1 ? '' : 's'} (solo .pdf)`)
      if (pdfs.length > 0) await onFiles(pdfs)
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
        accept="application/pdf"
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
            <p className="text-lg font-semibold">Soltá para agregar al workspace</p>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Modificar `workbench.tsx` para usar UploadZone**

Reemplazar el contenido de `WorkbenchInner` (manteniendo el wrapper `Workbench` con `WorkspaceProvider` intacto):

```tsx
function WorkbenchInner() {
  useStateBridge()
  const { pages } = useWorkspace()
  const loadPdf = useLoadPdf()

  async function onFiles(files: File[]) {
    for (const f of files) await loadPdf(f)
  }

  return (
    <div className="space-y-4">
      <UploadZone onFiles={onFiles} showButton={pages.length > 0} />
      {pages.length === 0 ? (
        <EmptyState onChoose={() => {
          // Trigger del file input via simulación del botón mismo de UploadZone
          const btn = document.querySelector<HTMLButtonElement>('[data-upload-trigger]')
          btn?.click()
        }} />
      ) : (
        <div className="text-sm text-muted-foreground">
          {pages.length} página{pages.length === 1 ? '' : 's'} cargada{pages.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}
```

Como el `EmptyState` necesita disparar el file picker pero `UploadZone` esconde su botón cuando `pages.length === 0`, usar un patrón más limpio: extraer el file input a un ref compartido. Reemplazar la versión anterior por esta variante final:

```tsx
'use client'

import { useRef } from 'react'
import { WorkspaceProvider, useLoadPdf, useStateBridge, useWorkspace } from '@/lib/pdf/document-store'
import { EmptyState } from '@/components/pdf-workbench/empty-state'
import { UploadZone } from '@/components/pdf-workbench/upload-zone'

function WorkbenchInner() {
  useStateBridge()
  const { pages } = useWorkspace()
  const loadPdf = useLoadPdf()
  const triggerPickerRef = useRef<() => void>(() => {})

  async function onFiles(files: File[]) {
    for (const f of files) await loadPdf(f)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PDF Workbench</h1>
        {pages.length > 0 && (
          <UploadZone onFiles={onFiles} registerTrigger={(fn) => { triggerPickerRef.current = fn }} />
        )}
      </div>
      {pages.length === 0 ? (
        <>
          <UploadZone onFiles={onFiles} showButton={false} registerTrigger={(fn) => { triggerPickerRef.current = fn }} />
          <EmptyState onChoose={() => triggerPickerRef.current()} />
        </>
      ) : (
        <div className="text-sm text-muted-foreground">
          {pages.length} página{pages.length === 1 ? '' : 's'} cargada{pages.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}

export function Workbench() {
  return (
    <WorkspaceProvider>
      <WorkbenchInner />
    </WorkspaceProvider>
  )
}
```

Y agregar `registerTrigger?: (fn: () => void) => void` a las Props de `UploadZone`, llamándolo en el `useEffect` o como `useEffect(() => registerTrigger?.(() => inputRef.current?.click()), [registerTrigger])`. Actualizar `upload-zone.tsx` agregando ese efecto:

```tsx
// Dentro de UploadZone, después del useEffect de drag:
useEffect(() => {
  registerTrigger?.(() => inputRef.current?.click())
}, [registerTrigger])
```

Y al tipo Props: `registerTrigger?: (fn: () => void) => void`.

- [ ] **Step 3: Smoke test — tsc + página renderiza**

```bash
pnpm tsc --noEmit
curl -sS http://localhost:3003/app/tools/pdf-workbench -b /tmp/mtcookie.txt | grep -oE "PDF Workbench|Cargá tu primer PDF" | sort -u
```

Expected: ambos textos.

- [ ] **Step 4: Commit**

```bash
git add src/components/pdf-workbench/upload-zone.tsx 'src/app/(app)/app/tools/pdf-workbench/workbench.tsx'
git commit -m "feat(s1): upload zone con drop desde el SO + overlay full-screen"
```

---

## Task 9: PageTile

**Files:**
- Create: `src/components/pdf-workbench/page-tile.tsx`

- [ ] **Step 1: Crear `src/components/pdf-workbench/page-tile.tsx`**

```tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, RotateCw, Trash2 } from 'lucide-react'
import { useWorkspace, useDispatch } from '@/lib/pdf/document-store'
import type { WorkspacePage } from '@/lib/pdf/types'
import { cn } from '@/lib/utils'
import { exportPages, buildFilename, downloadBytes } from '@/lib/pdf/exporter'

type Props = {
  page: WorkspacePage
}

export function PageTile({ page }: Props) {
  const { pdfs, thumbnails, selection } = useWorkspace()
  const dispatch = useDispatch()
  const selected = selection.has(page.id)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const badge = page.kind === 'source' ? pdfs[page.sourceId]?.badge : null
  const sourceLabel =
    page.kind === 'source'
      ? `${pdfs[page.sourceId]?.name ?? 'PDF'} · pág. ${page.sourceIndex + 1}`
      : 'En blanco'
  const thumb = thumbnails[page.id]

  function onClick(e: React.MouseEvent) {
    const mode = e.shiftKey ? 'range' : e.metaKey || e.ctrlKey ? 'add' : 'single'
    dispatch({ type: 'selection/toggle', id: page.id, mode })
  }

  async function onDownloadOne() {
    dispatch({ type: 'export/start' })
    try {
      const state = (window as unknown as { __mtState?: () => import('@/lib/pdf/types').WorkspaceState }).__mtState?.()
      if (!state) return
      const bytes = await exportPages(state, [page.id])
      downloadBytes(bytes, buildFilename(state, [page.id], 'single'))
    } finally {
      dispatch({ type: 'export/end' })
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'group relative aspect-[0.7] rounded-md border-2 bg-card overflow-hidden cursor-pointer',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-foreground/30',
      )}
      onClick={onClick}
      role="checkbox"
      aria-checked={selected}
      aria-label={sourceLabel}
      data-page-id={page.id}
    >
      {/* Drag handle: la zona central es donde se agarra para arrastrar */}
      <div {...listeners} className="absolute inset-0 z-0" />

      {/* Thumbnail / placeholder */}
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={sourceLabel}
          draggable={false}
          className="w-full h-full object-contain bg-muted pointer-events-none"
          style={{ transform: page.kind === 'source' ? `rotate(${page.rotation}deg)` : undefined }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
          {page.kind === 'blank' ? 'En blanco' : 'Cargando…'}
        </div>
      )}

      {/* Badge de PDF origen */}
      {badge && (
        <span
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow z-10"
          style={{ backgroundColor: badge.color }}
        >
          {badge.label}
        </span>
      )}

      {/* Número de página origen */}
      {page.kind === 'source' && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] z-10">
          p.{page.sourceIndex + 1}
        </span>
      )}

      {/* Acciones rápidas (hover o seleccionado) */}
      <div
        className={cn(
          'absolute top-1 right-1 flex gap-0.5 z-10 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'pages/rotate', ids: [page.id], delta: 90 })
          }}
          className="rounded bg-background/90 hover:bg-background p-1 shadow"
          aria-label="Rotar 90°"
          title="Rotar 90°"
        >
          <RotateCw className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'pages/duplicate', ids: [page.id] })
          }}
          className="rounded bg-background/90 hover:bg-background p-1 shadow"
          aria-label="Duplicar"
          title="Duplicar"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            void onDownloadOne()
          }}
          className="rounded bg-background/90 hover:bg-background p-1 shadow text-xs px-1.5"
          aria-label="Descargar esta página"
          title="Descargar esta página"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'pages/delete', ids: [page.id] })
          }}
          className="rounded bg-background/90 hover:bg-destructive hover:text-destructive-foreground p-1 shadow"
          aria-label="Eliminar"
          title="Eliminar"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke test — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 3: Commit**

```bash
git add src/components/pdf-workbench/page-tile.tsx
git commit -m "feat(s1): PageTile con thumbnail, badge, acciones rápidas y selección"
```

---

## Task 10: PageGrid con @dnd-kit + atajos de teclado

**Files:**
- Create: `src/components/pdf-workbench/page-grid.tsx`
- Modify: `src/app/(app)/app/tools/pdf-workbench/workbench.tsx`

- [ ] **Step 1: Crear `src/components/pdf-workbench/page-grid.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'
import { PageTile } from './page-tile'

export function PageGrid() {
  const { pages, selection } = useWorkspace()
  const dispatch = useDispatch()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fromIndex = pages.findIndex((p) => p.id === active.id)
    const toIndex = pages.findIndex((p) => p.id === over.id)
    if (fromIndex < 0 || toIndex < 0) return

    // Si la página arrastrada está en la selección, mover toda la selección
    const ids = selection.has(active.id as string)
      ? pages.filter((p) => selection.has(p.id)).map((p) => p.id)
      : [active.id as string]

    dispatch({ type: 'pages/move', ids, toIndex })
  }

  // Atajos de teclado globales del workbench
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      // Ignorar si el foco está en un input/textarea
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      const meta = e.metaKey || e.ctrlKey
      const selIds = Array.from(selection)

      if (meta && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        dispatch({ type: 'selection/all' })
        return
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'selection/clear' })
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selIds.length > 0) {
        e.preventDefault()
        dispatch({ type: 'pages/delete', ids: selIds })
        return
      }
      if (meta && (e.key === 'd' || e.key === 'D') && selIds.length > 0) {
        e.preventDefault()
        dispatch({ type: 'pages/duplicate', ids: selIds })
        return
      }
      if ((e.key === 'r' || e.key === 'R') && !meta && selIds.length > 0) {
        e.preventDefault()
        dispatch({ type: 'pages/rotate', ids: selIds, delta: 90 })
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, dispatch])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
        >
          {pages.map((p) => (
            <PageTile key={p.id} page={p} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

- [ ] **Step 2: Modificar `workbench.tsx` para renderizar el grid**

Reemplazar el bloque `pages.length === 0 ? <…/> : <div>… cargadas</div>` por:

```tsx
{pages.length === 0 ? (
  <>
    <UploadZone onFiles={onFiles} showButton={false} registerTrigger={(fn) => { triggerPickerRef.current = fn }} />
    <EmptyState onChoose={() => triggerPickerRef.current()} />
  </>
) : (
  <>
    <div className="text-sm text-muted-foreground">
      {Object.keys(pdfs).length} PDF{Object.keys(pdfs).length === 1 ? '' : 's'} · {pages.length} página{pages.length === 1 ? '' : 's'}
      {selection.size > 0 && ` · ${selection.size} seleccionada${selection.size === 1 ? '' : 's'}`}
    </div>
    <PageGrid />
  </>
)}
```

Y agregar a las destructuraciones del top de `WorkbenchInner`:
```tsx
const { pages, pdfs, selection } = useWorkspace()
```

Y al import: `import { PageGrid } from '@/components/pdf-workbench/page-grid'`.

- [ ] **Step 3: Smoke test — tsc + log sin errores**

```bash
pnpm tsc --noEmit
# Disparar render del workbench
curl -sS -o /dev/null http://localhost:3003/app/tools/pdf-workbench -b /tmp/mtcookie.txt
sleep 1
echo "===Task10===" >> /tmp/mt-dev.log
sleep 1
awk '/===Task10===/{flag=1; next} flag' /tmp/mt-dev.log | grep -iE "error|hydra" | head -5 || echo "limpio"
```

Expected: tsc EXIT=0; log "limpio".

- [ ] **Step 4: Commit**

```bash
git add src/components/pdf-workbench/page-grid.tsx 'src/app/(app)/app/tools/pdf-workbench/workbench.tsx'
git commit -m "feat(s1): PageGrid con @dnd-kit sortable + atajos de teclado (Del/R/Cmd+D/Esc/Cmd+A)"
```

---

## Task 11: Toolbar bulk actions

**Files:**
- Create: `src/components/pdf-workbench/toolbar.tsx`
- Modify: `src/app/(app)/app/tools/pdf-workbench/workbench.tsx`

- [ ] **Step 1: Crear `src/components/pdf-workbench/toolbar.tsx`**

```tsx
'use client'

import { Copy, FilePlus, RotateCw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'

export function Toolbar() {
  const { pages, selection } = useWorkspace()
  const dispatch = useDispatch()
  if (selection.size === 0) return null

  const ids = Array.from(selection)

  // Posición para insertar en blanco: justo después de la última página seleccionada
  const lastSelectedIndex = pages
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => selection.has(p.id))
    .map(({ i }) => i)
    .reduce((max, i) => (i > max ? i : max), -1)

  return (
    <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-md border bg-card/95 backdrop-blur px-3 py-2 shadow-sm">
      <span className="text-sm font-medium">
        {selection.size} página{selection.size === 1 ? '' : 's'} seleccionada{selection.size === 1 ? '' : 's'}
      </span>
      <div className="h-4 w-px bg-border mx-1" />
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => dispatch({ type: 'pages/rotate', ids, delta: 90 })}>
        <RotateCw className="h-4 w-4" />
        Rotar
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => dispatch({ type: 'pages/duplicate', ids })}>
        <Copy className="h-4 w-4" />
        Duplicar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => dispatch({ type: 'pages/insertBlank', index: lastSelectedIndex + 1, preset: 'a4' })}
        title="Insertar página en blanco después de la selección"
      >
        <FilePlus className="h-4 w-4" />
        Insertar blanco
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => dispatch({ type: 'pages/delete', ids })}>
        <Trash2 className="h-4 w-4" />
        Eliminar
      </Button>
      <div className="ml-auto">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => dispatch({ type: 'selection/clear' })}>
          <X className="h-4 w-4" />
          Limpiar selección
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modificar `workbench.tsx` para incluir la Toolbar**

Agregar `import { Toolbar } from '@/components/pdf-workbench/toolbar'` y antes del `<PageGrid />` insertar `<Toolbar />`.

- [ ] **Step 3: Smoke test — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 4: Commit**

```bash
git add src/components/pdf-workbench/toolbar.tsx 'src/app/(app)/app/tools/pdf-workbench/workbench.tsx'
git commit -m "feat(s1): toolbar bulk con rotar/duplicar/eliminar/insertar blanco"
```

---

## Task 12: ExportMenu

**Files:**
- Create: `src/components/pdf-workbench/export-menu.tsx`
- Modify: `src/app/(app)/app/tools/pdf-workbench/workbench.tsx`

- [ ] **Step 1: Crear `src/components/pdf-workbench/export-menu.tsx`**

```tsx
'use client'

import { Download, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDispatch, useWorkspace } from '@/lib/pdf/document-store'
import { buildFilename, downloadBytes, exportPages } from '@/lib/pdf/exporter'
import { toast } from 'sonner'

export function ExportMenu() {
  const state = useWorkspace()
  const dispatch = useDispatch()
  const hasPages = state.pages.length > 0
  const hasSelection = state.selection.size > 0

  async function runExport(mode: 'all' | 'selection') {
    const ids =
      mode === 'all'
        ? state.pages.map((p) => p.id)
        : state.pages.filter((p) => state.selection.has(p.id)).map((p) => p.id)
    if (ids.length === 0) return
    dispatch({ type: 'export/start' })
    try {
      const bytes = await exportPages(state, ids)
      downloadBytes(bytes, buildFilename(state, ids, mode))
      toast.success('Descarga iniciada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      dispatch({ type: 'export/end' })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button disabled={!hasPages || state.exporting} className="gap-2">
            {state.exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={() => runExport('all')} disabled={!hasPages}>
          <FileDown className="h-4 w-4 mr-2" />
          Descargar documento completo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runExport('selection')} disabled={!hasSelection}>
          <FileDown className="h-4 w-4 mr-2" />
          Descargar selección ({state.selection.size})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Modificar `workbench.tsx` para mostrar ExportMenu en el sub-header**

Reemplazar el bloque del título por:

```tsx
<div className="flex items-center justify-between flex-wrap gap-3">
  <h1 className="text-2xl font-bold">PDF Workbench</h1>
  <div className="flex items-center gap-2">
    {pages.length > 0 && <UploadZone onFiles={onFiles} registerTrigger={(fn) => { triggerPickerRef.current = fn }} />}
    {pages.length > 0 && <ExportMenu />}
  </div>
</div>
```

Y al import: `import { ExportMenu } from '@/components/pdf-workbench/export-menu'`.

- [ ] **Step 3: Smoke test — tsc + página renderiza**

```bash
pnpm tsc --noEmit
curl -sS http://localhost:3003/app/tools/pdf-workbench -b /tmp/mtcookie.txt | grep -oE "PDF Workbench" | head -1
```

Expected: tsc EXIT=0, grep imprime `PDF Workbench`.

- [ ] **Step 4: Commit**

```bash
git add src/components/pdf-workbench/export-menu.tsx 'src/app/(app)/app/tools/pdf-workbench/workbench.tsx'
git commit -m "feat(s1): ExportMenu con descarga completa y de selección"
```

---

## Task 13: Validación de tamaño total + cleanup PDFs huérfanos al exportar

**Files:**
- Modify: `src/lib/pdf/document-store.tsx`
- Modify: `src/lib/pdf/exporter.ts`

- [ ] **Step 1: Agregar warning de tamaño en `useLoadPdf`**

Antes del `dispatch({ type: 'pdf/load', ... })` en `document-store.tsx`, calcular y avisar si el tamaño total post-carga supera 500MB:

```ts
const currentTotal = Object.values(state.pdfs).reduce((acc, p) => acc + p.bytes.length, 0)
const futureTotal = currentTotal + bytes.length
if (futureTotal > 500 * 1024 * 1024) {
  toast.warning('Estás cerca del límite del navegador; podría volverse lento')
}
```

- [ ] **Step 2: Modificar `exportPages` para limpiar PDFs huérfanos antes**

En `src/lib/pdf/exporter.ts`, después del header de la función `exportPages`, NO modificar el state (es función pura). En su lugar, exponer un helper opcional que detecta orphans desde `Workbench`:

Agregar al final de `exporter.ts`:

```ts
export function findOrphanPdfIds(state: WorkspaceState): string[] {
  const referenced = new Set<string>()
  for (const p of state.pages) {
    if (p.kind === 'source') referenced.add(p.sourceId)
  }
  return Object.keys(state.pdfs).filter((id) => !referenced.has(id))
}
```

Y en `export-menu.tsx`, después de un export exitoso:

```ts
// Cleanup PDFs huérfanos
const orphans = findOrphanPdfIds(state)
for (const id of orphans) dispatch({ type: 'pdf/remove', pdfId: id })
```

Agregar el import `import { findOrphanPdfIds } from '@/lib/pdf/exporter'`.

- [ ] **Step 3: Smoke test — tsc**

```bash
pnpm tsc --noEmit
```

Expected: EXIT=0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf/document-store.tsx src/lib/pdf/exporter.ts src/components/pdf-workbench/export-menu.tsx
git commit -m "feat(s1): warning de tamaño +500MB y cleanup de PDFs huérfanos post-export"
```

---

## Task 14: Fixtures de prueba (script + binarios commiteados)

**Files:**
- Create: `scripts/build-pdf-fixtures.ts`
- Create: `tests/e2e/fixtures/sample-2p.pdf` (binario)
- Create: `tests/e2e/fixtures/sample-3p.pdf` (binario)
- Modify: `package.json` (script `pdf:fixtures`)

- [ ] **Step 1: Crear `scripts/build-pdf-fixtures.ts`**

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const OUT_DIR = resolve(process.cwd(), 'tests/e2e/fixtures')

async function buildPdf(pageCount: number, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([595, 842])
    page.drawText(`${label} — página ${i + 1}`, {
      x: 50,
      y: 780,
      size: 36,
      font,
      color: rgb(0.1, 0.1, 0.4),
    })
    page.drawText('Fixture E2E — pdf-workbench', {
      x: 50,
      y: 730,
      size: 14,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
  }
  return doc.save()
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const sample2 = await buildPdf(2, 'Sample 2P')
  const sample3 = await buildPdf(3, 'Sample 3P')
  const p2 = resolve(OUT_DIR, 'sample-2p.pdf')
  const p3 = resolve(OUT_DIR, 'sample-3p.pdf')
  await writeFile(p2, sample2)
  await writeFile(p3, sample3)
  await mkdir(dirname(p2), { recursive: true })
  console.log(`wrote ${p2} (${sample2.length} bytes)`)
  console.log(`wrote ${p3} (${sample3.length} bytes)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Agregar script al `package.json`**

En la sección `scripts`:

```json
"pdf:fixtures": "tsx scripts/build-pdf-fixtures.ts",
```

- [ ] **Step 3: Generar los fixtures**

```bash
pnpm pdf:fixtures
```

Expected: salida `wrote tests/e2e/fixtures/sample-2p.pdf (...)` + `sample-3p.pdf`. Ambos archivos creados.

- [ ] **Step 4: Smoke test — los archivos son PDFs válidos**

```bash
head -c 5 tests/e2e/fixtures/sample-2p.pdf
echo
head -c 5 tests/e2e/fixtures/sample-3p.pdf
echo
```

Expected: ambos imprimen `%PDF-`.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-pdf-fixtures.ts tests/e2e/fixtures/sample-2p.pdf tests/e2e/fixtures/sample-3p.pdf package.json
git commit -m "test(s1): fixtures sample-2p y sample-3p generados por scripts/build-pdf-fixtures.ts"
```

---

## Task 15: Tests E2E

**Files:**
- Create: `tests/e2e/pdf-workbench.spec.ts`

- [ ] **Step 1: Crear `tests/e2e/pdf-workbench.spec.ts`**

```ts
import { test, expect, type Page } from '@playwright/test'
import { resolve } from 'node:path'

const FIXTURE_3P = resolve(process.cwd(), 'tests/e2e/fixtures/sample-3p.pdf')
const FIXTURE_2P = resolve(process.cwd(), 'tests/e2e/fixtures/sample-2p.pdf')

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 })
}

async function openWorkbench(page: Page) {
  await loginAsAdmin(page)
  await page.goto('/app/tools/pdf-workbench')
  await expect(page.getByRole('heading', { name: 'PDF Workbench' })).toBeVisible()
}

async function uploadFile(page: Page, filePath: string) {
  // El input[type=file] es hidden — usar setInputFiles directo
  const input = page.locator('input[type="file"][accept="application/pdf"]').first()
  await input.setInputFiles(filePath)
}

test('carga un PDF y muestra sus 3 páginas', async ({ page }) => {
  await openWorkbench(page)
  await uploadFile(page, FIXTURE_3P)
  await expect(page.locator('[data-page-id]')).toHaveCount(3, { timeout: 10_000 })
})

test('elimina una página seleccionada con Delete', async ({ page }) => {
  await openWorkbench(page)
  await uploadFile(page, FIXTURE_3P)
  const tiles = page.locator('[data-page-id]')
  await expect(tiles).toHaveCount(3)
  await tiles.first().click()
  await page.keyboard.press('Delete')
  await expect(tiles).toHaveCount(2)
})

test('reordena con drag-and-drop', async ({ page }) => {
  await openWorkbench(page)
  await uploadFile(page, FIXTURE_3P)
  const tiles = page.locator('[data-page-id]')
  await expect(tiles).toHaveCount(3)
  const idsBefore = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute('data-page-id')))
  // Arrastra el último tile al inicio
  await tiles.nth(2).dragTo(tiles.nth(0))
  const idsAfter = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute('data-page-id')))
  expect(idsAfter[0]).toBe(idsBefore[2])
})

test('mezcla dos PDFs y muestra contador correcto', async ({ page }) => {
  await openWorkbench(page)
  await uploadFile(page, FIXTURE_3P)
  await expect(page.locator('[data-page-id]')).toHaveCount(3)
  await uploadFile(page, FIXTURE_2P)
  await expect(page.locator('[data-page-id]')).toHaveCount(5)
  await expect(page.getByText('2 PDFs · 5 páginas')).toBeVisible()
})

test('exporta documento completo y descarga un PDF válido', async ({ page }) => {
  await openWorkbench(page)
  await uploadFile(page, FIXTURE_3P)
  await expect(page.locator('[data-page-id]')).toHaveCount(3)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /exportar/i }).click()
  await page.getByRole('menuitem', { name: /documento completo/i }).click()
  const dl = await downloadPromise

  const path = await dl.path()
  const fs = await import('node:fs/promises')
  const buf = await fs.readFile(path)
  expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
})
```

- [ ] **Step 2: Generar fixtures si no existen y correr la suite**

```bash
test -f tests/e2e/fixtures/sample-3p.pdf || pnpm pdf:fixtures
pnpm test:e2e tests/e2e/pdf-workbench.spec.ts
```

Expected: 5 passed. Si un selector falla por el role del menuitem (Base UI usa role `menuitem` en `MenuItem` por defecto, pero podría diferir), inspeccionar el DOM en `playwright-report/` y ajustar el selector — no la implementación.

- [ ] **Step 3: Correr suite completa para confirmar nada se rompió**

```bash
pnpm test:e2e
```

Expected: total = 7 anteriores + 5 nuevos = 12 passed.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/pdf-workbench.spec.ts
git commit -m "test(s1): 5 specs E2E del PDF Workbench (carga, delete, reorder, mezcla, export)"
```

---

## Task 16: README + cierre Sprint 1

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Agregar sección a `README.md`**

Reemplazar la sección "Próximas herramientas" por:

```markdown
## Herramientas disponibles

- **PDF Workbench** (`/app/tools/pdf-workbench`) — Combiná, separá, reordená y editá páginas de uno o varios PDFs. Procesamiento 100% en el navegador, los archivos nunca tocan el servidor.

## Próximas herramientas

- Procesador de imágenes con IA (Sprint 2)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(s1): README anuncia PDF Workbench como herramienta disponible"
```

- [ ] **Step 3: Verificación final del Sprint**

```bash
pnpm tsc --noEmit && pnpm lint
git log --oneline feat/fase-3-apps-settings-deploy...HEAD | wc -l
git log --oneline -20
```

Expected: tsc EXIT=0, lint EXIT=0, ~16 commits nuevos en la rama de Sprint 1.

---

## Definición de hecho del Sprint 1 (recap del spec)

- [x] `/app/tools/pdf-workbench` accesible para todos los roles
- [x] Visible en el home grid (registry `status: 'available'`)
- [x] Drop de uno o varios PDFs muestra las páginas como tiles con badges
- [x] Drag-drop reordena (incluye multi-selección)
- [x] Delete elimina, R rota, Cmd/Ctrl+D duplica
- [x] "Insertar página en blanco" funciona desde toolbar
- [x] Tres modos de export funcionan y descargan PDFs válidos (completo + selección + página individual)
- [x] 5 specs E2E pasan
- [x] README actualizado mencionando la herramienta

## Notas para el implementador

- **El usuario tiene `pnpm dev --port 3003` corriendo todo el tiempo.** No matar ese proceso. Los smoke tests intermedios asumen esa URL.
- **Postgres dev**: `docker compose -f docker-compose.dev.yml up -d` ya está corriendo, no levantarlo de nuevo. Verificar con `docker compose -f docker-compose.dev.yml ps`.
- **Cookie de admin**: si los smokes fallan con 307/401, re-loguear con el snippet de la Task 1 step 4.
- **Triggers de Base UI con `<Button>` adentro**: SIEMPRE usar `render={<Button …>…</Button>}` para evitar `<button>` anidados. Ver `src/components/theme-toggle.tsx:18-26` y `src/components/auth/user-menu.tsx:28-37` como referencia.
- **`DropdownMenuLabel`**: requiere estar dentro de `<DropdownMenuGroup>` (limitación de Base UI's `MenuPrimitive.GroupLabel`). No usar suelto.
- **Pruebas unitarias**: el spec acuerda que NO se agregan en Sprint 1 (queda Sprint 1.5 si decidimos agregar Vitest). Las E2E son la única red.
- **Si una tarea queda larga**: comitear igual al final del paso correspondiente. Mejor un commit por funcionalidad que un mega-commit "todo el workbench".
