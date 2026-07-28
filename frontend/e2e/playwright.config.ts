import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 15_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // Fail the build if no tests are found.
  testMatch: '*.spec.ts',
});
