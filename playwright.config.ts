import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  use: { channel: 'chrome', baseURL: 'http://127.0.0.1:3182' },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3182',
    url: 'http://127.0.0.1:3182',
  },
})
