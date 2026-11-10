// tsc emits only .js/.d.ts, so every stylesheet under src/ is left behind —
// while package.json ships `dist` alone. Two kinds matter and BOTH are needed:
//
//   src/styles/*.css          imported by the app  (@softov/scena/styles/control.css)
//   src/ui/**/Foo.css         co-located with its component, imported by none
//
// A component imports no CSS. The app imports `styles/<folder>.css`, which
// `@import`s the co-located files by relative path, so those must sit in dist
// at the same place as in src.
import { cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = resolve(pkgRoot, 'src');
const distRoot = resolve(pkgRoot, 'dist');

function collectCss(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectCss(full));
    else if (entry.endsWith('.css')) out.push(full);
  }
  return out;
}

const files = collectCss(srcRoot);
if (files.length === 0) {
  throw new Error(`copy-assets: no stylesheets found under ${srcRoot}`);
}

for (const file of files) {
  const target = join(distRoot, relative(srcRoot, file));
  mkdirSync(dirname(target), { recursive: true });
  cpSync(file, target);
}

console.log(`copy-assets: ${files.length} stylesheets -> dist/`);
