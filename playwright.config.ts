import { defineConfig } from '@playwright/test'

const PORT = process.env.PLAYWRIGHT_PORT ?? '3002'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  // Algunos specs (onboarding) mutan el accent_color / onboarded_at del admin
  // user compartido en el dev DB. Sin serializar, hay race conditions entre specs
  // que esperan admin "onboardeado" y otros que lo resetean a NULL.
  // Trade-off: la suite full pasa de ~26s a ~50s, pero es determinística.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      BETTER_AUTH_URL: BASE_URL,
      NEXT_PUBLIC_BETTER_AUTH_URL: BASE_URL,
    },
  },
})
