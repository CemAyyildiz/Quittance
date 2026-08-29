import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'node',
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  // Next.js components rely on the automatic JSX runtime and do not import React.
  esbuild: {
    jsx: 'automatic',
  },
});
