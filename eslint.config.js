import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// NOTE: no `unicorn/filename-case` rule here. scena's component files are
// PascalCase (DefaultShell.tsx, CustomShell.tsx); the kebab-case rule that
// opendoop applies to pood/src would fail on nearly every file under ui/.
export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/dev-dist/**',
    '**/coverage/**',
    '**/node_modules/**',
  ]),

  ...tseslint.configs.recommended,

  {
    files: ['packages/*/src/**/*.{ts,tsx}', 'packages/*/test/**/*.{ts,tsx}'],
    // react / react-hooks are registered so the inline `eslint-disable` comments
    // already in the source resolve. The source was written against these rules
    // in opendoop, where scena was never actually linted.
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    // NOTE: react-hooks' `recommended` ruleset is deliberately NOT enabled.
    // Turning it on flags ~20 pre-existing patterns, including CampusView's
    // imperative viewport refs, which are intentional. Adopting those rules is
    // a separate, deliberate piece of work - not a side effect of the move.
    rules: {
      // These three are enabled because the source already carries
      // `eslint-disable-next-line` comments for them - the code was written
      // expecting them on. Left off, every one of those comments becomes an
      // "unused disable directive" warning.
      // exhaustive-deps stays off: switching it on adds 6 warnings on
      // pre-existing hook code (CampusView, SpatialLayout, useChatPicker) that
      // wants a deliberate fix, not a drive-by one during a repo move.
      'no-console': 'warn',
      'react/no-danger': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
]);
