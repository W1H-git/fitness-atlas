import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'offline.spec.ts',
  workers: 1,
  timeout: 120_000,
  outputDir: 'work/pwa-test-results',
  use: {
    baseURL: 'http://127.0.0.1:4176',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
  },
})
