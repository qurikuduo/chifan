import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    locale: 'zh-CN',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'echo "Dev servers should already be running"',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
