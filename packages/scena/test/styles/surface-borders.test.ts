// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const surfaceCss = readFileSync(resolve(here, '../../src/styles/surface.css'), 'utf8');

/**
 * Surfaces draw no separator until a theme asks for one, and the way that is
 * expressed is fragile in a specific way worth pinning down.
 *
 * A theme sets `--oo-surface-border-width` on the root. `surface.css` consumes
 * it as `var(--oo-surface-border-width, 0px)`. If it instead *declared* a
 * default on `.oo-surface`, that declaration would sit on the element itself
 * and beat the inherited value — every theme that turned borders on would be
 * silently ignored, with no error anywhere.
 *
 * jsdom does not substitute custom properties into shorthands, so this asserts
 * on the property's own computed value, which is the axis the bug lives on.
 */
function mountSurface(themeCss: string): HTMLElement {
  const style = document.createElement('style');
  style.textContent = `${surfaceCss}\n${themeCss}`;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.className = 'oo-surface oo-surface--sidebar-left';
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('surface separators', () => {
  it('a theme that opts in reaches the surface', () => {
    const el = mountSurface(':root { --oo-surface-border-width: 1px; }');
    expect(getComputedStyle(el).getPropertyValue('--oo-surface-border-width').trim()).toBe('1px');
  });

  it('a theme that says nothing leaves it unset, so the 0px fallback applies', () => {
    const el = mountSurface('');
    expect(getComputedStyle(el).getPropertyValue('--oo-surface-border-width').trim()).toBe('');
  });

  it('the colour override reaches the surface too', () => {
    const el = mountSurface(
      ':root { --oo-surface-border-width: 1px; --oo-surface-border: rgb(43 43 43); }',
    );
    expect(getComputedStyle(el).getPropertyValue('--oo-surface-border').trim()).toBe('rgb(43 43 43)');
  });

  // The regression itself, asserted against the source rather than the DOM,
  // because this is the edit that would break it.
  it('surface.css never declares the tokens on .oo-surface', () => {
    const baseBlock = /\.oo-surface\s*\{([^}]*)\}/.exec(surfaceCss)?.[1] ?? '';
    expect(baseBlock).not.toMatch(/--oo-surface-border-width\s*:/);
    expect(baseBlock).not.toMatch(/--oo-surface-border\s*:/);
    expect(surfaceCss).toMatch(/var\(--oo-surface-border-width,\s*0px\)/);
  });

  // Keyed on the edge the shell stamped rather than on the surface's name, so
  // an app-defined surface gets a separator too. See surface-stamping.test.tsx.
  it('draws on whichever edge was stamped', () => {
    expect(surfaceCss).toMatch(
      /\[data-surface-edge='inline-end'\]\s*\{\s*\n?\s*border-inline-end/,
    );
    expect(surfaceCss).toMatch(
      /\[data-surface-edge='block-start'\]\s*\{\s*\n?\s*border-block-start/,
    );
  });

  it('overlaid surfaces draw none', () => {
    // Lifted out of the flow with a shadow, so a border on the edge they no
    // longer touch would be a line in open space.
    expect(surfaceCss).toMatch(/data-presentation='(floating|sheet)'\][\s\S]{0,80}\{\s*border: 0;/);
  });
});
