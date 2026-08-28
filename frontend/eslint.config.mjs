// ESLint flat config for the Quittance frontend.
//
// Uses the `@eslint/eslintrc` FlatCompat bridge so we can reuse the
// recommended Next.js config (`next/core-web-vitals`) without rewriting
// every rule inline.  This file is intentionally additive: it does NOT
// mass-autofix or reformat existing source files (see `.prettierignore`
// for conflict-sensitive exclusions).
//
// Dependencies required (already in `package.json`):
//   eslint ^8.57.0
//   eslint-config-next ^14.2.3
//   @eslint/eslintrc (added as devDependency)

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore build artefacts and dependency trees
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'dist/',
      'build/',
      '.vercel/',
      '*.tsbuildinfo',
      'next-env.d.ts',
    ],
  },

  // Extend the recommended Next.js ESLint config
  ...compat.extends('next/core-web-vitals'),

  // Project-specific rules
  {
    rules: {
      // Warn on unused variables (allow underscore-prefixed)
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Prefer `const` over `let` when binding is never reassigned
      'prefer-const': 'warn',

      // Disallow console.log in committed code (warn, not error)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

export default eslintConfig;
