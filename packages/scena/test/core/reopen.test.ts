import { describe, it, expect } from 'vitest';
import { createScena } from '../../src/core/scena.js';
import type { SessionSnapshot } from '../../src/sdk/session.js';

// Where `surfaces.open` puts a mount, by the five cases:
// 1. a first open goes to the surface the open names (the default place);
// 2. a caller with another default (an "open on Y" button) names another surface;
// 3. a move does not outlive a close;
// 4. opening an open key focuses it where it is;
// 5. a closed key opens as the first time.
function setup() {
  const scena = createScena();
  const focused: { key: string; surface: string }[] = [];
  scena.events.on('scena:mount:focused', (ev) => void focused.push(ev as { key: string; surface: string }));
  const open = (surface: string) => scena.surfaces.open({ surface, key: 'user:1', resource: { component: 'UserDetail' } });
  const where = () => scena.surfaces.listSurfaces().find((s) => scena.surfaces.listAt(s).some((m) => m.key === 'user:1'));
  return { scena, focused, open, where };
}

describe('opening a mount again', () => {
  it('1 and 2: a first open goes to the surface it names', () => {
    const a = setup();
    a.open('main');
    expect(a.where()).toBe('main');
    const b = setup();
    b.open('sidebar:right');
    expect(b.where()).toBe('sidebar:right');
  });

  it('4: opening an open key focuses it where a person moved it', () => {
    const { scena, focused, open, where } = setup();
    open('main');
    scena.surfaces.move({ key: 'user:1', toSurface: 'sidebar:right' });
    const handle = open('main');
    expect(where()).toBe('sidebar:right');
    expect(handle.surface).toBe('sidebar:right');
    expect(focused.at(-1)).toEqual({ key: 'user:1', surface: 'sidebar:right' });
  });

  it('4: an "open on Y" button focuses the open key where it is, too', () => {
    const { open, where } = setup();
    open('main');
    open('sidebar:right');
    expect(where()).toBe('main');
  });

  it('3 and 5: after a close, the next open goes to the surface it names', () => {
    const { scena, open, where } = setup();
    open('main');
    scena.surfaces.move({ key: 'user:1', toSurface: 'sidebar:right' });
    scena.surfaces.close('user:1');
    open('main');
    expect(where()).toBe('main');
  });

  it('a restore puts an open mount back where the snapshot had it', async () => {
    const { scena, open, where } = setup();
    scena.components.register({ component: 'UserDetail', renderer: { kind: 'react', load: async () => ({ default: () => null }) } });
    open('main');
    const snap: SessionSnapshot = {
      version: 1,
      capturedAt: 0,
      surfaces: {},
      mounts: [{ key: 'user:1', surface: 'sidebar:right', component: { component: 'UserDetail' }, state: {}, openedAt: 0 }],
    };
    const { restored } = await scena.session.restore(snap);
    expect(where()).toBe('sidebar:right');
    expect(restored[0]?.surface).toBe('sidebar:right');
  });

  it('keeps the title, icon and colour through a snapshot and a restore', async () => {
    const first = createScena();
    first.surfaces.open({ surface: 'sidebar:right', key: 'user:1', resource: { component: 'UserDetail' }, props: { title: 'Ada', icon: 'A', color: 'blue' } });
    const snap = first.session.snapshot();
    expect(snap.mounts[0]?.props).toEqual({ title: 'Ada', icon: 'A', color: 'blue' });

    const second = createScena();
    second.components.register({ component: 'UserDetail', renderer: { kind: 'react', load: async () => ({ default: () => null }) } });
    await second.session.restore(JSON.parse(JSON.stringify(snap)) as SessionSnapshot);
    expect(second.surfaces.listAt('sidebar:right')[0]?.props).toEqual({ title: 'Ada', icon: 'A', color: 'blue' });
  });

  it('restores a snapshot saved with no props', async () => {
    const scena = createScena();
    scena.components.register({ component: 'UserDetail', renderer: { kind: 'react', load: async () => ({ default: () => null }) } });
    await scena.session.restore({ version: 1, capturedAt: 0, surfaces: {}, mounts: [{ key: 'user:1', surface: 'main', component: { component: 'UserDetail' }, state: {}, openedAt: 0 }] });
    expect(scena.surfaces.listAt('main').map((m) => m.key)).toEqual(['user:1']);
  });
});
