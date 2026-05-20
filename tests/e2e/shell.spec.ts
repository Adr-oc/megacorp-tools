import { test, expect, type Page } from '@playwright/test'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
  await expect(page).toHaveURL(/\/app(?!\/onboarding)/, { timeout: 10_000 })
}

test('topbar muestra breadcrumbs según pathname', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  const homeCrumb = page.getByRole('navigation', { name: /breadcrumb/i })
  await expect(homeCrumb.getByText('Apps')).toBeVisible()

  await page.goto('/app/settings/perfil')
  const crumb = page.getByRole('navigation', { name: /breadcrumb/i })
  await expect(crumb.getByText('Configuración')).toBeVisible()
  await expect(crumb.getByText('Mi perfil')).toBeVisible()
})

test('sidebar variant cambia con la ruta', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  await expect(page.getByText(/reciente/i).first()).toBeVisible()

  await page.goto('/app/settings/apariencia')
  await expect(page.getByText(/tu cuenta/i).first()).toBeVisible()

  await page.goto('/app/tools/pdf-workbench')
  await expect(page.getByRole('link', { name: /volver a apps/i })).toBeVisible()
})

test('⌘K abre el command palette y navega', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  await page.keyboard.press('Control+K')
  const input = page.getByPlaceholder(/buscar o ejecutar/i).last()
  await expect(input).toBeVisible()
  await input.fill('perfil')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/app\/settings\/perfil/, { timeout: 5_000 })
})

test('sidebar footer tiene user info y dropdown logout', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  await expect(page.getByText('admin@megacorp.local').first()).toBeVisible()
  // Targetear el trigger del footer del sidebar usando el data-slot
  const trigger = page.locator(
    'aside [data-slot="dropdown-menu-trigger"]:has-text("admin@megacorp.local")',
  ).first()
  await trigger.click()
  // El menuitem puede tardar — esperamos visible explícito con timeout más amplio
  await expect(page.getByRole('menuitem', { name: /cerrar sesión/i })).toBeVisible({
    timeout: 5_000,
  })
})
