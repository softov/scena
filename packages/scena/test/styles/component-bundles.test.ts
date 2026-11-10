import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');

/** Every file under `dir` whose name passes `keep`, as paths relative to `src`. */
function filesIn(dir: string, keep: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesIn(full, keep));
    else if (keep(entry)) out.push(relative(src, full));
  }
  return out.sort();
}

/** The folders whose components have stylesheets: each folder of `ui`, and `porta`. */
const folders = [
  ...readdirSync(join(src, 'ui')).map((one) => `ui/${one}`).filter((one) => statSync(join(src, one)).isDirectory()),
  'porta',
].filter((folder) => filesIn(join(src, folder), (name) => name.endsWith('.css')).length > 0);

describe('component stylesheets', () => {
  it('are imported by no component', () => {
    const importing = ['ui', 'porta']
      .flatMap((dir) => filesIn(join(src, dir), (name) => /\.tsx?$/.test(name)))
      .filter((file) => /^import\s+['"][^'"]+\.css['"]/m.test(readFileSync(join(src, file), 'utf8')));
    expect(importing).toEqual([]);
  });

  it.each(folders)('of %s are each in its bundle', (folder) => {
    const bundle = readFileSync(join(src, 'styles', `${basename(folder)}.css`), 'utf8');
    const imported = [...bundle.matchAll(/@import '\.\.\/([^']+)';/g)].map((match) => match[1]).sort();
    expect(imported).toEqual(filesIn(join(src, folder), (name) => name.endsWith('.css')));
  });
});
