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
    // It is the React-Compiler-era ruleset and flags ~20 pre-existing patterns,
    // including CampusView's imperative viewport refs, which are intentional.
    // `exhaustive-deps` below is enabled on its own; the rest are not.
    rules: {
      // `no-console` and `react/no-danger` are on because the source already
      // carries `eslint-disable-next-line` comments for them - it was written
      // expecting them. Left off, each of those comments becomes an "unused
      // disable directive" warning.
      //
      // warn/error are allowed: a library legitimately reports diagnostics that
      // way (see runtime/in-memory-socket.ts). Only `console.log` is flagged.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/no-danger': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
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

  {
    // The playground is a demo app, not shipped code. Its console output is
    // deliberate instrumentation (persisted-store counters, locale switching)
    // that the panels document inline.
    files: ['packages/playground/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },

  {
    // Stub auth providers. Their console.info only fires on the demo path,
    // when the consumer has NOT supplied a real sendLink/sendCode - saying
    // "nothing was actually sent" is the point of the stub.
    files: ['packages/scena/src/porta/providers/examples/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]);
