# MegaTools — PDF Workbench (Sprint 1, primera herramienta real)

> **Estado:** brainstormed y aprobado por el usuario el 2026-05-16. Próximo paso: writing-plans.
>
> **Path final:** `/app/tools/pdf-workbench` · **Permisos:** member+ · **Estado en registry:** `available`

## Objetivo

Construir una herramienta tipo iLovePDF embebida en el portal MEGACORP que permita cargar uno o varios PDFs simultáneamente y, sobre una grilla única de páginas, **reordenar, eliminar, mezclar, rotar, duplicar e insertar páginas en blanco**, exportando uno o varios PDFs resultantes. Todo el procesamiento ocurre en el navegador del usuario; los archivos nunca tocan el servidor.

## Decisiones de scope (resueltas en brainstorming)

| Decisión | Valor |
|---|---|
| Procesamiento | **Cliente puro** (híbrido para futuro: upload opcional a Odoo/storage queda fuera de Sprint 1) |
| Persistencia del workspace | Ninguna — se pierde al cerrar la pestaña (con `beforeunload` guard) |
| Operaciones core (lo pedido por el usuario) | Cargar varios PDFs, reordenar drag-drop, eliminar, mezclar páginas entre PDFs, descargar página individual |
| Operaciones extra incluidas | Rotar (90°/180°/270°), extraer subset como nuevo PDF, duplicar página, insertar página en blanco |
| Layout | **Grid único** con badges de color por PDF de origen (opción A del mockup) |
| Subida a organización | Fuera de scope — Sprint 1.5 |

## Arquitectura

Página Next.js client component bajo `/app/tools/pdf-workbench`, dentro del shell autenticado existente (`(app)/layout.tsx` provee header, theme y `requiredRoles`). El registry de apps (`src/lib/apps/registry.ts`) cambia la entrada `pdf-splitter` a `pdf-workbench` con `status: 'available'`.

**Stack nuevo (todo cliente):**

| Librería | Rol | Tamaño aprox. |
|---|---|---|
| `pdf-lib` | Manipular PDFs (cargar, mergear, splitear, rotar, insertar blancos, serializar). Pure JS, sin worker. | ~280 KB gzip |
| `pdfjs-dist` | Renderizar thumbnails. Usa Web Worker para no bloquear la UI. | ~400 KB gzip + worker |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag-and-drop accesible (teclado, screen reader, mobile). | ~30 KB gzip |
| `ulid` | IDs únicos para PDFs y páginas (mejor que `crypto.randomUUID()` para ordenamiento lexicográfico). | ~3 KB gzip |

Sin storage, sin backend, sin nuevas tablas, sin nuevas variables de entorno. La única integración con el resto del portal es el registry de apps y el chequeo de auth en el layout.

## Estructura de archivos

```
src/app/(app)/app/tools/pdf-workbench/
├── page.tsx                    # Server component thin, gate de auth
└── workbench.tsx               # 'use client' — monta Context + DnD root

src/components/pdf-workbench/
├── upload-zone.tsx             # Empty state + drop area full-screen
├── page-grid.tsx               # Grid con SortableContext de @dnd-kit
├── page-tile.tsx               # Thumbnail + badge + menú contextual + selección
├── toolbar.tsx                 # Acciones bulk (visible con selección)
├── sub-header.tsx              # Contador de PDFs/páginas + botón Cargar + ExportMenu
├── export-menu.tsx             # DropdownMenu con los 3 modos de export
└── empty-state.tsx             # Pantalla inicial (CTA cargar primer PDF)

src/lib/pdf/
├── document-store.tsx          # Context + useReducer del WorkspaceState
├── operations.ts               # Pure reducers (mover, rotar, duplicar, etc.)
├── exporter.ts                 # Export con pdf-lib (3 modos)
├── thumbnail-renderer.ts       # PDF.js worker setup + render a dataURL
├── badges.ts                   # Asignación de color/label por PDF cargado
└── types.ts                    # Tipos públicos

tests/e2e/
├── fixtures/sample-3p.pdf      # Generado una vez con pdf-lib y commiteado
├── fixtures/sample-2p.pdf
└── pdf-workbench.spec.ts       # 5 specs E2E
```

## Modelo de datos en memoria

```ts
// src/lib/pdf/types.ts

export type PdfId = string  // ulid
export type PageId = string // ulid por instancia (permite duplicar)

export type LoadedPdf = {
  id: PdfId
  name: string
  bytes: Uint8Array
  pageCount: number
  badge: { label: string; color: string }
  loadedAt: number
}

export type WorkspacePage =
  | { id: PageId; kind: 'source'; sourceId: PdfId; sourceIndex: number; rotation: 0 | 90 | 180 | 270 }
  | { id: PageId; kind: 'blank';  width: number; height: number }

export type WorkspaceState = {
  pdfs: Record<PdfId, LoadedPdf>
  pages: WorkspacePage[]
  selection: Set<PageId>
  thumbnails: Record<PageId, string> // dataURL, lazy
}
```

Cada `WorkspacePage` tiene su propio `PageId` único — esto permite que la misma página de origen aparezca múltiples veces en el documento (duplicación) sin colisión, y que los thumbnails cacheen por instancia.

**Store:** `useReducer` + Context React. Suficiente para un solo route. Si crece, migrar a Zustand (no en Sprint 1).

## Operaciones (reducers puros)

| Acción | Firma | Comportamiento |
|---|---|---|
| `loadPdf` | `(file: File) → state` | Async: `PDFDocument.load(bytes)`, leer `pageCount`, asignar badge, crear N `WorkspacePage` y appendear. Lanza render de thumbnails en background. |
| `deletePages` | `(ids: PageId[])` | Quita las páginas del array. PDFs sin referencias quedan en `pdfs` (los limpia `removeOrphanPdfs()` al exportar). |
| `movePages` | `(ids: PageId[], toIndex: number)` | Reordena preservando orden relativo de la selección. |
| `rotatePages` | `(ids: PageId[], delta: 90 \| -90 \| 180)` | Modifica `rotation` mod 360. State-only — se aplica al exportar. |
| `duplicatePages` | `(ids: PageId[])` | Clona cada WorkspacePage con nuevo `PageId`, inserta después del original. |
| `insertBlankAt` | `(index: number, preset: 'a4' \| 'letter')` | Inserta `kind: 'blank'` con tamaño en puntos PDF. |
| `removePdf` | `(pdfId: PdfId)` | Borra todas las páginas de ese PDF y la entrada de `pdfs`. |
| `toggleSelect` | `(id: PageId, mode: 'single' \| 'add' \| 'range', lastSelectedId?)` | Maneja clic simple, Ctrl-clic, Shift-clic. |
| `selectAll`, `clearSelection` | | Trivial. |

Todas síncronas excepto `loadPdf` (await load + parse). Los thumbnails se renderizan post-load y se mergean al state cuando están listos.

## UI y layout

Layout final (top-down):

```
┌─ Header del shell (logo MEGACORP · ThemeToggle · UserMenu) ──────┐
├─ Sub-header del workbench ───────────────────────────────────────┤
│ ← Apps     3 PDFs · 11 páginas · 1 seleccionada                  │
│            [+ Cargar más]                         [Exportar ▾]   │
├─ Toolbar contextual (sólo con selección) ────────────────────────┤
│ 1 página seleccionada · [↻ Rotar] [Duplicar] [Eliminar] [✕]      │
├─ PageGrid (grid único) ──────────────────────────────────────────┤
│   [tile][tile][tile][tile][tile][tile]                           │
│   [tile][tile][tile][tile][tile][tile]                           │
└──────────────────────────────────────────────────────────────────┘
```

Cada `PageTile`: thumbnail (~140×200 px), badge de color con label de 3 letras del PDF de origen en esquina superior-izquierda, número de página original en esquina inferior-derecha, checkbox de selección visible al hover (siempre visible si está seleccionado), menú contextual (clic derecho o icono `⋮`).

**Selección con teclado/mouse:**

| Acción | Comportamiento |
|---|---|
| Clic | Selecciona solo esta página |
| Ctrl/Cmd + Clic | Toggle al set de selección |
| Shift + Clic | Selecciona rango desde el último |
| Ctrl/Cmd + A | Seleccionar todo |
| Esc | Limpiar selección |
| Delete / Backspace | Eliminar seleccionadas |
| Cmd/Ctrl + D | Duplicar seleccionadas |
| R | Rotar 90° las seleccionadas |

## Drag-and-drop

Dos sistemas de drop independientes:

1. **Reordenar dentro del grid** (`@dnd-kit/sortable`):
   - Arrastre desde un tile → todas las páginas de la selección se mueven juntas si el tile arrastrado está seleccionado; si no, sólo esa página.
   - Drop indicator: barra vertical entre tiles donde caerá.
   - Auto-scroll cuando se arrastra cerca del borde superior/inferior del viewport.

2. **Drop de archivos PDF desde el sistema operativo** (HTML5 File API):
   - Listener global en `<Workbench>` para `dragenter/dragover/drop` con `dataTransfer.types.includes('Files')`.
   - Overlay full-screen "Soltá para agregar al workspace" mientras hay archivos en hover.
   - Archivos no-PDF: toast de aviso "Solo se aceptan .pdf", se ignoran.

Los dos sistemas no chocan porque @dnd-kit escucha pointer events sobre tiles, mientras el drop de SO es un evento nativo del browser sobre la ventana.

## Export (3 modos)

| Modo | Trigger | Filename por defecto |
|---|---|---|
| **Documento completo** | Botón principal del ExportMenu | Si todos los pages vienen del mismo PDF: `<nombre-original>-editado.pdf`. Si hay mezcla: `documento-<YYYY-MM-DD>.pdf` |
| **Selección como PDF nuevo** | "Exportar selección" (visible sólo con selección > 0) | `seleccion-<YYYY-MM-DD>.pdf` |
| **Una página individual** | Menú contextual del tile → "Descargar esta página" | `<nombre-pdf-origen>-pagina-<N>.pdf` |

Implementación común (`src/lib/pdf/exporter.ts`):

```ts
async function exportPages(state: WorkspaceState, pageIds: PageId[]): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  const docCache = new Map<PdfId, PDFDocument>()
  for (const id of pageIds) {
    const page = state.pages.find(p => p.id === id)!
    if (page.kind === 'blank') {
      out.addPage([page.width, page.height])
      continue
    }
    let srcDoc = docCache.get(page.sourceId)
    if (!srcDoc) {
      srcDoc = await PDFDocument.load(state.pdfs[page.sourceId].bytes)
      docCache.set(page.sourceId, srcDoc)
    }
    const [copied] = await out.copyPages(srcDoc, [page.sourceIndex])
    if (page.rotation !== 0) copied.setRotation(degrees(page.rotation))
    out.addPage(copied)
  }
  return out.save()
}
```

El usuario puede sobreescribir el filename en un `<input>` del ExportMenu antes de descargar. Trigger del download vía `<a download>` programático sobre un `Blob` URL — sin necesidad de `file-saver`.

Para docs > 100 MB el spinner "Generando PDF…" aparece durante el `await out.save()`. No vale la pena un worker para Sprint 1.

## Errores y validación

| Caso | Manejo |
|---|---|
| Archivo no es PDF | Toast: "Solo se aceptan archivos .pdf" |
| PDF con contraseña | `PDFDocument.load()` rechaza → catch → toast: "El PDF está protegido con contraseña; quitá la protección antes de cargarlo" |
| PDF corrupto | Mismo flow, toast genérico: "No se pudo leer el archivo" |
| Tamaño total > 500 MB | Warning toast al cargar (no bloquea): "Estás cerca del límite del navegador; podría volverse lento" |
| Render de thumbnail falla | Tile muestra placeholder gris con el número de página + badge; la operación no se rompe |
| Export con 0 páginas | Botón "Descargar" deshabilitado, tooltip "Agregá páginas para exportar" |
| Cierre de pestaña con cambios | `beforeunload` guard cuando `pages.length > 0` |

## Performance

- **Render de thumbnails**: PDF.js worker en background; un job por página, paralelizados con concurrency limit de 4. Thumbnails cacheados en state — no se re-renderizan al reordenar.
- **Virtualización del grid**: Sprint 1 sin virtualización (suficiente hasta ~200 páginas). Si en uso real aparecen workspaces más grandes, agregar `@tanstack/react-virtual` en Sprint 1.x.
- **Export sync**: pdf-lib es síncrono después del await; no bloquea por mucho tiempo en docs medianos. Spinner para feedback.

## Testing E2E

`tests/e2e/pdf-workbench.spec.ts` (Playwright, mismo patrón del repo actual):

1. **Carga y muestra páginas**: login → ir al workbench → cargar `sample-3p.pdf` → ver 3 tiles
2. **Eliminar página**: cargar, seleccionar tile, presionar Delete, ver 2 tiles
3. **Reordenar**: cargar, drag tile #3 antes del #1 (Playwright `dragTo`), verificar orden
4. **Mezclar dos PDFs**: cargar 2 PDFs, ver tiles con badges distintos, contador "2 PDFs · 5 páginas"
5. **Export descarga un PDF válido**: clic "Descargar" → capturar el download → verificar header `%PDF-` en los primeros bytes

Fixture: un script one-shot `scripts/build-pdf-fixtures.ts` que genera `tests/e2e/fixtures/sample-{2,3}p.pdf` con pdf-lib. Los archivos quedan commiteados (binarios pequeños, ~4 KB cada uno).

Pruebas unitarias del reducer y de `exporter.ts` quedan para Sprint 1.5 si decidimos agregar Vitest al repo (hoy no hay test runner unit).

## Registry de apps — cambio

`src/lib/apps/registry.ts`:

```diff
   {
-    id: 'pdf-splitter',
-    name: 'Separador de PDFs',
-    description: 'Dividir y reordenar páginas de PDF.',
+    id: 'pdf-workbench',
+    name: 'PDF Workbench',
+    description: 'Combinar, separar, reordenar y editar páginas de PDFs. Todo en tu navegador, nada se sube.',
     icon: FileText,
-    href: '/app/tools/pdf-splitter',
+    href: '/app/tools/pdf-workbench',
     requiredRoles: ['member', 'admin', 'owner'],
-    status: 'coming-soon',
+    status: 'available',
   },
```

`requireApp('pdf-workbench')` (helper existente del Sprint 0) se usa en `page.tsx` del workbench para el gate de auth + permisos.

## Fuera de scope (explícito, para no scope-creep)

- Upload a Odoo o storage propio (Sprint 1.5)
- OCR / extracción de texto (futuro, posiblemente Sprint 2 con la herramienta de imágenes IA)
- Edición de contenido de páginas (texto, formas, anotaciones)
- Compresión / optimización del PDF resultante
- Watermark / firma digital
- Conversión a otros formatos (PNG, DOCX, etc.)
- Persistencia del workspace entre sesiones de browser
- Virtualización del grid (se agrega si surge necesidad real)
- Tests unitarios (depende de agregar Vitest, queda para Sprint 1.5)

## Definición de hecho

- `/app/tools/pdf-workbench` accesible para todos los roles, visible en el home grid
- Drop de uno o varios PDFs muestra todas sus páginas como tiles con badges
- Drag-drop reordena (incluye multi-selección)
- Delete elimina, R rota, Cmd+D duplica
- "Insertar página en blanco" funciona desde la toolbar
- Tres modos de export funcionan y descargan PDFs válidos
- 5 specs E2E pasan
- README actualizado mencionando la herramienta en "Próximas / disponibles"
