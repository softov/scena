// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { isWindowSurface, newWindowSurface, removeSurface, windowSurface } from '../../src/sdk/window-surface.js';
import { createScena } from '../../src/core/scena.js';
import { createLocalStorageLayoutStorage } from '../../src/core/controls/storage/layout-local.js';
import type { ScenaLayout } from '../../src/sdk/layout.js';

const layoutWith = (...names: string[]): ScenaLayout => ({
  surfaces: Object.fromEntries(names.map((n) => [n, { visible: true }])),
});

describe('window surfaces', () => {
  it('names a window surface, and tells it from the others', () => {
    expect(windowSurface(3)).toBe('window:3');
    expect(isWindowSurface('window:3')).toBe(true);
    for (const name of ['main', 'detached', 'sidebar:right', 'window:']) expect(isWindowSurface(name)).toBe(false);
  });

  it('takes the first number the layout does not hold', () => {
    expect(newWindowSurface(layoutWith('main'))).toBe('window:1');
    expect(newWindowSurface(layoutWith('main', 'window:1', 'window:3'))).toBe('window:2');
  });

  it('removes one surface and keeps the others', () => {
    const next = removeSurface(layoutWith('main', 'window:1'), 'window:1');
    expect(Object.keys(next.surfaces)).toEqual(['main']);
    const same = layoutWith('main');
    expect(removeSurface(same, 'window:9')).toBe(same);
  });

  it('keeps a window surface, its place and its tabs, through the layout storage', async () => {
    localStorage.clear();
    const layoutStorage = createLocalStorageLayoutStorage({ key: 'test.window-surface' });
    const first = createScena({ layoutStorage });
    first.layout.setSurface('window:1', {
      visible: true,
      layout: 'tab-panel',
      window: { left: 40, top: 60, width: 800, height: 600 },
      tabPanel: { tree: { kind: 'leaf', id: 'g1', tabs: ['a'], activeKey: 'a' } },
    });
    await new Promise((r) => setTimeout(r, 200));

    const second = createScena({ layoutStorage });
    await new Promise((r) => setTimeout(r, 0));
    expect(second.layout.get().surfaces['window:1']).toMatchObject({
      layout: 'tab-panel',
      window: { left: 40, top: 60, width: 800, height: 600 },
      tabPanel: { tree: { tabs: ['a'] } },
    });
  });
});
