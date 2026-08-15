// tsc emits only .js/.d.ts, so stylesheets under src/styles never reached
// dist — while package.json's exports map points `./styles/*` at
// `./dist/styles/*` and `files` ships only `dist`. Consumers importing
// `@softov/scena/styles/theme.css` got nothing. This copies them after the
// type build. The playground never noticed because its vite alias resolves
// `@softov/scena/styles` straight to src.
import { cpSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = resolve(pkgRoot, 'src/styles');
const to = resolve(pkgRoot, 'dist/styles');

if (!existsSync(from)) {
  throw new Error(`copy-assets: expected stylesheet source at ${from}`);
}

cpSync(from, to, {
  recursive: true,
  filter: (src) => statSync(src).isDirectory() || src.endsWith('.css'),
});

console.log(`copy-assets: styles -> ${to}`);
