import { test, expect, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'

function resetAdminOnboarding(value: 'NULL' | 'NOW()') {
  execSync(
    `docker exec megatools-postgres-dev psql -U megatools -d megatools_dev -c "UPDATE \\"user\\" SET onboarded_at = ${value} WHERE email = 'admin@megacorp.local';"`,
    { stdio: 'ignore' },
  )
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('admin@megacorp.local')
  await page.locator('input[type="password"]').fill('Admin123!Cambiame')
  await page.getByRole('button', { name: /iniciar sesi/i }).click()
}

test.describe('onboarding', () => {
  test.beforeEach(() => {
    resetAdminOnboarding('NULL')
  })

  test.afterAll(() => {
    resetAdminOnboarding('NOW()')
  })

  test('user nuevo es redirigido a /onboarding después del login', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /hola,/i })).toBeVisible()
  })

  test('"Saltar e ir a apps" marca onboardedAt y va a /app', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 })
    await page.getByRole('button', { name: /saltar e ir a apps/i }).click()
    await expect(page).toHaveURL(/\/app(?!\/)/, { timeout: 10_000 })
  })

  test('tour completo: 6 pasos + terminar va a /app', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 })

    // Paso 1 → 2
    await page.getByRole('button', { name: /empezar el recorrido/i }).click()
    // Paso 2 → 3
    await page.getByRole('button', { name: /^continuar$/i }).click()

    // Tour modal: 5 "Siguiente" + "Terminar"
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /siguiente/i }).click()
    }
    await page.getByRole('button', { name: /terminar/i }).click()

    await expect(page).toHaveURL(/\/app(?!\/)/, { timeout: 10_000 })
    await expect(page.getByRole('button', { name: /reabrir tour/i })).toBeVisible()
  })
})
