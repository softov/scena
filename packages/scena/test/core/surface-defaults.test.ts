import { describe, it, expect } from 'vitest';
import { createScena } from '../../src/core/scena.js';
import { DEFAULT_SURFACE_LAYOUTS } from '../../src/core/controls/layout.js';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Which surfaces an app has, versus what state to restore.
 *
 * `initialLayout` answers the second and merges, which is right for restoring a
 * session. It was answering the first too, and merging is wrong for that: an
 * app with no sidebar could change `sidebar:left` but never be rid of it, so it
 * carried the entry in layout state, wrote `$/layout/surfaces/sidebar:left/*`
 * into the store, and persisted it through LayoutStorage forever.
 *
 * `surfaceDefaults` answers the first, and REPLACES.
 */
describe('surfaceDefaults', () => {
  it('defaults to the nine when omitted', () => {
    const scena = createScena();
    expect(Object.keys(scena.layout.get().surfaces).sort()).toEqual(
      Object.keys(DEFAULT_SURFACE_LAYOUTS).sort(),
    );
  });

  it('replaces the nine rather than merging over them', () => {
    const scena = createScena({
      surfaceDefaults: {
        'alert:top': { visible: true, layout: 'bar' },
        main: { visible: true, layout: 'tab' },
      },
    });

    expect(Object.keys(scena.layout.get().surfaces).sort()).toEqual(['alert:top', 'main']);
    // The regression: an app that declined a sidebar must not have one.
    expect(scena.layout.get().surfaces['sidebar:left']).toBeUndefined();
  });

  it('keeps a declined surface out of the store', async () => {
    const scena = createScena({
      surfaceDefaults: { 'alert:top': { visible: true, layout: 'bar' } },
    });
    await tick();

    expect(scena.store.get('$/layout/surfaces/alert:top/visible')).toBe(true);
    expect(scena.store.get('$/layout/surfaces/sidebar:left/size')).toBeUndefined();
  });

  it('an empty set is a legitimate answer', () => {
    const scena = createScena({ surfaceDefaults: {} });
    expect(scena.layout.get().surfaces).toEqual({});
  });

  it('spreading the shipped defaults is how an app adds to them', () => {
    const scena = createScena({
      surfaceDefaults: {
        ...DEFAULT_SURFACE_LAYOUTS,
        'alert:top': { visible: false, layout: 'bar' },
      },
    });
    const surfaces = scena.layout.get().surfaces;

    expect(surfaces['sidebar:left']).toMatchObject({ size: 240 });
    expect(surfaces['alert:top']).toMatchObject({ visible: false, layout: 'bar' });
  });

  it('initialLayout still merges, over whichever defaults are in effect', () => {
    const scena = createScena({
      surfaceDefaults: { 'alert:top': { visible: false, layout: 'bar' } },
      initialLayout: { surfaces: { 'alert:top': { visible: true } } },
    });
    // Restored `visible`, kept the declared `layout` -- a merge, not a replace.
    expect(scena.layout.get().surfaces['alert:top']).toMatchObject({
      visible: true,
      layout: 'bar',
    });
    // And restoring state does not resurrect a surface the app declined.
    expect(scena.layout.get().surfaces['sidebar:left']).toBeUndefined();
  });

  it('a surface the defaults never named still works once written', async () => {
    const scena = createScena({ surfaceDefaults: {} });
    scena.layout.setSurface('alert:bottom', { visible: true, size: 44, layout: 'bar' });
    await tick();

    expect(scena.layout.get().surfaces['alert:bottom']).toMatchObject({ size: 44 });
    expect(scena.store.get('$/layout/surfaces/alert:bottom/size')).toBe(44);
  });
});
