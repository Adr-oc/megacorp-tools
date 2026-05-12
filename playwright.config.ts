import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev --port 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      BETTER_AUTH_URL: 'http://localhost:3002',
      NEXT_PUBLIC_BETTER_AUTH_URL: 'http://localhost:3002',
    },
  },
})
