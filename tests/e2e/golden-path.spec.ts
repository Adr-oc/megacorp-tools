import { test, expect } from '@playwright/test'

test('superadmin puede iniciar sesión y ver el shell autenticado', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'MegaTools' })).toBeVisible()

  await page.getByRole('link', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.getByLabel('Email').fill('admin@megacorp.local')
  // The tab "Contraseña" and the password input label both match getByLabel — target input[type=password] to disambiguate
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()

  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: /aplicaciones/i })).toBeVisible()
})

test('rutas autenticadas redirigen a /login sin sesión', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login/)
})

test('landing pública es accesible sin sesión', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'MegaTools' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
})
