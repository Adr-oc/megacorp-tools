import { test, expect } from '@playwright/test'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 })
}

test('admin puede ver lista de miembros de la organización', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app/settings/organizacion')
  await expect(page.getByRole('heading', { name: /organizaci/i })).toBeVisible()
  await expect(page.getByText('admin@megacorp.local')).toBeVisible()
  await expect(page.getByText(/owner/i)).toBeVisible()
})

test('admin puede abrir diálogo de invitar miembro', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app/settings/organizacion')
  await page.getByRole('button', { name: /invitar/i }).click()
  await expect(page.getByRole('heading', { name: /invitar miembro/i })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
})
