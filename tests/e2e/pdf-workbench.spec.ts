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

  // @dnd-kit usa activationConstraint { distance: 6 }: necesitamos pasos intermedios
  // para que el PointerSensor active la operación de drag (de lo contrario lo trata como click).
  const sourceBox = await tiles.nth(2).boundingBox()
  const targetBox = await tiles.nth(0).boundingBox()
  if (!sourceBox || !targetBox) throw new Error('No se pudieron medir los tiles')
  const sx = sourceBox.x + sourceBox.width / 2
  const sy = sourceBox.y + sourceBox.height / 2
  const tx = targetBox.x + targetBox.width / 2
  const ty = targetBox.y + targetBox.height / 2

  await page.mouse.move(sx, sy)
  await page.mouse.down()
  // Pequeño nudge inicial para superar el threshold de 6px
  await page.mouse.move(sx + 10, sy + 10, { steps: 5 })
  await page.mouse.move(tx, ty, { steps: 15 })
  await page.mouse.up()

  // Damos tiempo a que el reorder se propague al estado
  await expect
    .poll(async () => {
      const ids = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute('data-page-id')))
      return ids[0]
    }, { timeout: 5_000 })
    .toBe(idsBefore[2])
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
