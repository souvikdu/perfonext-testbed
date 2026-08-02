// ESLint flat config for perfonext-testbed (npm workspaces monorepo)
// Handles plain ESM (.mjs) packages + Next.js TS apps.
// Docs: https://eslint.org/docs/latest/use/configure/configuration-files-new
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/out/**',
      '**/.git/**',
      'artifacts/**',
      'harness/reports/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // Harness runs in Node but uses Playwright page.evaluate callbacks that
      // execute in the browser context (window.* refs are legitimate there).
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // The baseline and regressed apps are synthetic fixtures and use `any`
      // pervasively by design; strict typing here would fight the fixtures.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
);
