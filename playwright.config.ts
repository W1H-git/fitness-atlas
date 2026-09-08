import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: 'offline.spec.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  reporter: 'list',
  outputDir: 'work/test-results',
  use: {
    baseURL: 'http://127.0.0.1:5175',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    trace: 'retain-on-failure',
    timezoneId: 'Asia/Shanghai',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
  },
})
