import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Dev playground for scena itself. Run with `pnpm dev` from the repo root.
//
// `@softov/scena` is a workspace dependency, so it would normally resolve
// through the package exports to packages/scena/dist - which needs a build
// between every source edit. These aliases resolve to packages/scena/src
// instead, so edits in the library are live here with no build step.
const src = resolve(__dirname, '../scena/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Narrow boot entry - must precede '/react' so it matches first. Pulls
      // only the provider + hook, not the heavy renderers the barrel re-exports.
      '@softov/scena/react/core': resolve(src, 'react/core.ts'),
      '@softov/scena/react': resolve(src, 'react/index.ts'),
      '@softov/scena/types': resolve(src, 'types/index.ts'),
      // Barrel-free boot entry - must precede the '/ui' alias so it matches
      // first. Pulls only the dynamic-import catalog + lazy layouts.
      '@softov/scena/ui/builtins': resolve(src, 'ui/register.ts'),
      // Per-section UI entries - import a single section instead of the whole
      // '@softov/scena/ui' barrel (which loads every component in dev).
      '@softov/scena/ui/forms': resolve(src, 'ui/forms/index.ts'),
      '@softov/scena/ui/layout': resolve(src, 'ui/layout/index.ts'),
      '@softov/scena/ui/display': resolve(src, 'ui/display/index.ts'),
      '@softov/scena/ui/control': resolve(src, 'ui/control/index.ts'),
      '@softov/scena/ui/data': resolve(src, 'ui/data/index.ts'),
      '@softov/scena/ui/navigation': resolve(src, 'ui/navigation/index.ts'),
      '@softov/scena/ui/media': resolve(src, 'ui/media/index.ts'),
      '@softov/scena/ui/overlay': resolve(src, 'ui/overlay/index.ts'),
      '@softov/scena/ui/chart': resolve(src, 'ui/chart/index.ts'),
      '@softov/scena/ui/menu': resolve(src, 'ui/menu/index.ts'),
      '@softov/scena/ui/campus': resolve(src, 'ui/campus/index.ts'),
      '@softov/scena/ui': resolve(src, 'ui/index.ts'),
      '@softov/scena/styles': resolve(src, 'styles'),
      '@softov/scena/porta/examples': resolve(src, 'porta/providers/examples/index.ts'),
      '@softov/scena/porta': resolve(src, 'porta/index.ts'),
      '@softov/scena': resolve(src, 'core/index.ts'),
    },
  },
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dev-dist',
    emptyOutDir: true,
  },
});
