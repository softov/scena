import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deliberately NO aliases to ../scena/src.
//
// The playground aliases every subpath to source, which is right for iterating
// on the library but means it never exercises the thing consumers actually
// resolve: the `exports` map, the emitted .d.ts, the co-located CSS in dist.
// This app resolves `@softov/scena` the way Advisor does — through the
// workspace link and the package's own exports — so a broken export map or a
// stylesheet tsc left behind fails here instead of after a publish.
//
// The cost is that `pnpm --filter @softov/scena build` has to have run first.
export default defineConfig({
  plugins: [react()],
  server: { port: 5175 },
});
