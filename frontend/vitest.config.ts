import { defineConfig, defaultExclude } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  // Next.js components rely on the automatic JSX runtime and do not import React.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    // jsdom supplies the DOM needed by React component tests
    // (@testing-library/react, hooks like useCountdown).
    environment: 'jsdom',
    // e2e specs are Playwright suites, not Vitest unit tests.
    exclude: [...defaultExclude, 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
