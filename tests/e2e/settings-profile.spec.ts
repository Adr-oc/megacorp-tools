import { test, expect } from '@playwright/test'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 })
}

test('admin puede ver y editar su perfil', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app/settings/perfil')
  await expect(page.getByRole('heading', { name: /mi perfil/i })).toBeVisible()
  await expect(page.getByLabel('Nombre')).toHaveValue(/.+/)
  await expect(page.getByLabel('Email')).toBeDisabled()
})

test('home muestra grid de apps con Settings disponible y placeholders', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  await expect(page.getByText(/configuraci/i).first()).toBeVisible()
  await expect(page.getByText(/separador de pdf/i).first()).toBeVisible()
  await expect(page.getByText(/próximamente/i).first()).toBeVisible()
})
