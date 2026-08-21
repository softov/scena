import { describe, it, expect } from 'vitest';
import { createScena } from '../../src/core/scena.js';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * A surface is whatever an app mounts to.
 *
 * The nine names in `SurfaceName` are what scena's own DefaultShell draws and
 * what `layout` seeds defaults for. They are a convention, not the set — an app
 * shell renders whatever regions it has, and the runtime is keyed by string
 * throughout, so it never needed to know the list.
 *
 * These tests pin that, because the type used to say otherwise and one place in
 * `core` did too: the session snapshot swept a hardcoded array of the nine, so
 * mounts on an app-defined surface were dropped silently and came back missing
 * after a restore.
 *
 * The cases here are the ones that would have caught it — a second bar of a
 * kind that already exists, and a kind that does not exist at all.
 */
describe('app-defined surfaces', () => {
  it('mounts to a surface name scena has never heard of', async () => {
    const scena = createScena();
    scena.surfaces.mount({
      surface: 'alert:top',
      key: 'alert:maintenance',
      resource: { component: 'Alert' },
    });
    await tick();

    expect(scena.surfaces.listAt('alert:top').map((m) => m.key)).toEqual(['alert:maintenance']);
  });

  it('carries layout state, through the store, for an unknown surface', async () => {
    const scena = createScena();
    scena.surfaces.mount({ surface: 'alert:bottom', key: 'a:1', resource: { component: 'A' } });
    await tick();

    scena.layout.setSurface('alert:bottom', { visible: true, size: 44, layout: 'bar' });

    expect(scena.layout.get().surfaces['alert:bottom']).toMatchObject({
      visible: true,
      size: 44,
      layout: 'bar',
    });
    // The store path is derived from the name, so it works for any name.
    expect(scena.store.get('$/layout/surfaces/alert:bottom/size')).toBe(44);
  });

  it('supports a second bar of a kind that already exists', async () => {
    const scena = createScena();
    scena.surfaces.mount({ surface: 'statusbar', key: 's:1', resource: { component: 'A' } });
    scena.surfaces.mount({ surface: 'statusbar:secondary', key: 's:2', resource: { component: 'A' } });
    await tick();

    expect(scena.surfaces.listAt('statusbar').map((m) => m.key)).toEqual(['s:1']);
    expect(scena.surfaces.listAt('statusbar:secondary').map((m) => m.key)).toEqual(['s:2']);
  });

  it('supports four sidebars, independently', async () => {
    const scena = createScena();
    const bars = ['sidebar:left', 'sidebar:inner', 'sidebar:outer', 'sidebar:right'];
    for (const [i, surface] of bars.entries()) {
      scena.surfaces.mount({ surface, key: `bar:${i}`, resource: { component: 'A' } });
    }
    await tick();

    expect(bars.map((s) => scena.surfaces.listAt(s).length)).toEqual([1, 1, 1, 1]);
  });

  describe('listSurfaces', () => {
    it('reports what is occupied, in first-mount order', async () => {
      const scena = createScena();
      scena.surfaces.mount({ surface: 'main', key: 'm:1', resource: { component: 'A' } });
      scena.surfaces.mount({ surface: 'alert:top', key: 'a:1', resource: { component: 'A' } });
      scena.surfaces.mount({ surface: 'alert:top', key: 'a:2', resource: { component: 'A' } });
      await tick();

      // Deduplicated: two mounts on one surface name it once.
      expect(scena.surfaces.listSurfaces()).toEqual(['main', 'alert:top']);
    });

    it('is empty before anything mounts', () => {
      expect(createScena().surfaces.listSurfaces()).toEqual([]);
    });
  });

  // The regression itself.
  it('keeps app-defined surfaces in the session snapshot', async () => {
    const scena = createScena();
    scena.surfaces.mount({ surface: 'main', key: 'std:1', resource: { component: 'A' } });
    scena.surfaces.mount({ surface: 'alert:top', key: 'custom:1', resource: { component: 'A' } });
    scena.surfaces.mount({ surface: 'alert:bottom', key: 'custom:2', resource: { component: 'A' } });
    await tick();

    const snapshot = scena.session.snapshot() as { mounts: { key: string }[] };
    const keys = snapshot.mounts.map((m) => m.key).sort();

    // Before listSurfaces this was ['std:1'] — the two custom mounts were swept
    // past by a hardcoded list of names and lost on restore, with no error.
    expect(keys).toEqual(['custom:1', 'custom:2', 'std:1']);
  });
});
