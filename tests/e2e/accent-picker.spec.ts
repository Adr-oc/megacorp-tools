import { test, expect, type Page } from '@playwright/test'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 10_000 })
}

async function resetAccent(page: Page) {
  await page.goto('/app/settings/apariencia')
  await page.locator('[data-accent-swatch="mustard"]').click()
  await page.waitForTimeout(300)
}

test('default mustard para users sin valor explícito', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app')
  const root = page.locator('[data-accent-root]').first()
  await expect(root).toHaveAttribute('data-accent', /(mustard|sienna|forest|lake|plum|slate)/)
})

test('cambiar accent persiste tras reload', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/app/settings/apariencia')

  await page.locator('[data-accent-swatch="forest"]').click()
  await expect(page.locator('[data-accent-root]')).toHaveAttribute('data-accent', 'forest', {
    timeout: 5_000,
  })
  await page.waitForTimeout(500)

  await page.reload()
  await expect(page.locator('[data-accent-root]')).toHaveAttribute('data-accent', 'forest', {
    timeout: 5_000,
  })

  await resetAccent(page)
})
