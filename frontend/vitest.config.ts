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
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
