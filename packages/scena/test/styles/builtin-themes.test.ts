import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { builtinThemes } from '../../src/themes/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../src');

/**
 * The channels a theme may leave alone by setting the resolved colour instead:
 * every `--oo-rgb-*` that `tokens.css` turns into an `--oo-color-*`. The
 * palette (`red`, `blue`, ...) is not themed, so reading it is fine.
 */
const tokensCss = readFileSync(join(src, 'styles/themes/tokens.css'), 'utf8');
const PALETTE = new Set(tokensCss.slice(0, tokensCss.indexOf('Base shell colors')).match(/--oo-rgb-[a-z]+(?=:)/g)!.map((name) => name.slice('--oo-rgb-'.length)));
const THEMED = new Set([...tokensCss.matchAll(/--oo-color-([a-z]+):\s*rgb\(var\(--oo-rgb-\1\)/g)].map((m) => m[1]!).filter((name) => !PALETTE.has(name)));

/** Where the channels are defined, which is the one place allowed to read them. */
const DEFINES = new Set(['styles/themes/tokens.css', 'styles/themes/dark.css']);

/**
 * Components whose tone variable carries an RGB triple, the `ResourceColor`
 * convention, so their default tone reads `--oo-rgb-muted`. Under a theme that
 * sets only `--oo-color-*`, that tone keeps scena's default grey.
 */
const CARRIES_CHANNELS = new Set(['ui/display/Badge.css', 'ui/display/StatusDot.css']);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return entry === 'themes' && dir === src ? [] : files(full);
    return /\.(css|ts|tsx)$/.test(entry) ? [full] : [];
  });
}

describe('built-in themes', () => {
  it('each has a light and a dark set of tokens, under its own id', () => {
    const ids = builtinThemes.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of builtinThemes) {
      for (const mode of ['light', 'dark'] as const) {
        const variant = theme.variants[mode];
        expect(variant?.kind, `${theme.id} ${mode}`).toBe('tokens');
        if (variant?.kind === 'tokens') expect(Object.keys(variant.tokens).length, `${theme.id} ${mode}`).toBeGreaterThan(10);
      }
    }
  });

  it('includes a theme that sets resolved colours and no channels', () => {
    const onlyColours = builtinThemes.filter((theme) => Object.values(theme.variants).every((variant) => variant?.kind === 'tokens' && !Object.keys(variant.tokens).some((key) => key.startsWith('--oo-rgb-'))));
    expect(onlyColours.map((theme) => theme.id)).toContain('sunset');
  });
});

describe('scena reads resolved colours, not themed channels', () => {
  it('knows which channels are themed', () => {
    expect(THEMED).toContain('primary');
    expect(THEMED).toContain('border');
    expect(PALETTE).toContain('red');
  });

  it('no stylesheet or component reads a themed channel', () => {
    const found: string[] = [];
    for (const file of files(src)) {
      const name = relative(src, file);
      if (DEFINES.has(name) || CARRIES_CHANNELS.has(name)) continue;
      const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of text.matchAll(/var\(--oo-rgb-([a-z]+)/g)) {
        if (THEMED.has(match[1]!)) found.push(`${name}: --oo-rgb-${match[1]}`);
      }
    }
    // A theme that sets only `--oo-color-*` leaves these at scena's default.
    expect(found).toEqual([]);
  });
});
