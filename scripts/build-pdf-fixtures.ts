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
