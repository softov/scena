import { describe, it, expect } from 'vitest';
import { createScena } from '../../src/core/scena.js';
import { besideTab, besideWindow, droppedAt, endedOutside, openInWindow, openTabWindow } from '../../src/runtime/open-tab-window.js';

const BOUNDS = { left: 10, top: 20, width: 800, height: 600 };

function setup() {
  const scena = createScena();
  for (const key of ['a', 'b']) scena.surfaces.open({ surface: 'main', key, resource: { component: 'Page' } });
  scena.surfaces.open({ surface: 'main', key: 'fixed', resource: { component: 'Page' }, policy: { movable: false } });
  scena.layout.setSurface('main', {
    visible: true,
    layout: 'tab-panel',
    tabPanel: {
      tree: {
        kind: 'split',
        direction: 'row',
        ratio: 0.5,
        first: { kind: 'leaf', id: 'g1', tabs: ['a', 'fixed'], activeKey: 'a' },
        second: { kind: 'leaf', id: 'g2', tabs: ['b'], activeKey: 'b' },
      },
    },
  });
  return scena;
}

describe('openTabWindow', () => {
  it('moves the mount to a new window surface with the bounds and a tab tree', () => {
    const scena = setup();
    expect(openTabWindow(scena, 'a', BOUNDS)).toBe('window:1');
    expect(scena.surfaces.listAt('window:1').map((m) => m.key)).toEqual(['a']);
    expect(scena.layout.get().surfaces['window:1']).toMatchObject({
      visible: true,
      layout: 'tab-panel',
      window: BOUNDS,
      tabPanel: { tree: { kind: 'leaf', tabs: ['a'], activeKey: 'a' } },
    });
  });

  it('takes the key out of the source tree, and closes the group it empties', () => {
    const scena = setup();
    openTabWindow(scena, 'b', BOUNDS);
    expect(scena.layout.get().surfaces.main?.tabPanel?.tree).toMatchObject({ kind: 'leaf', id: 'g1', tabs: ['a', 'fixed'] });
  });

  it('makes window:2 for a second tab', () => {
    const scena = setup();
    openTabWindow(scena, 'a', BOUNDS);
    expect(openTabWindow(scena, 'b', BOUNDS)).toBe('window:2');
  });

  it('leaves a mount with movable false, and a key that is not mounted', () => {
    const scena = setup();
    expect(openTabWindow(scena, 'fixed', BOUNDS)).toBeNull();
    expect(openTabWindow(scena, 'gone', BOUNDS)).toBeNull();
    expect(scena.surfaces.listAt('main').map((m) => m.key)).toContain('fixed');
    expect(scena.layout.get().surfaces['window:1']).toBeUndefined();
  });
});

describe('where a window goes', () => {
  const win = { screenX: 100, screenY: 50, innerWidth: 1000, innerHeight: 700 } as Window;

  it('opens at the drop point', () => {
    expect(droppedAt(win, 1500, 300)).toEqual({ left: 1460, top: 280, width: 800, height: 600 });
  });

  it('opens beside the window when the browser gives no point', () => {
    expect(droppedAt(win, 0, 0)).toEqual(besideWindow(win));
    expect(besideWindow(win)).toEqual({ left: 140, top: 90, width: 800, height: 600 });
  });

  it('counts only a drag end that nothing took, outside the window', () => {
    const none = { dropEffect: 'none' };
    expect(endedOutside(win, { dataTransfer: none, clientX: -5, clientY: 10 })).toBe(true);
    expect(endedOutside(win, { dataTransfer: none, clientX: 10, clientY: 800 })).toBe(true);
    expect(endedOutside(win, { dataTransfer: none, clientX: 10, clientY: 10 })).toBe(false);
    expect(endedOutside(win, { dataTransfer: { dropEffect: 'move' }, clientX: -5, clientY: 10 })).toBe(false);
    expect(endedOutside(win, { dataTransfer: null, clientX: -5, clientY: 10 })).toBe(false);
  });
});

describe('openInWindow', () => {
  it('opens a key that is not open in a new window, with its props', () => {
    const scena = setup();
    expect(openInWindow(scena, { key: 'row', resource: { component: 'Page' }, props: { title: 'Row' } }, BOUNDS)).toBe('window:1');
    const mount = scena.surfaces.listAt('window:1')[0];
    expect(mount?.key).toBe('row');
    expect(mount?.props).toMatchObject({ title: 'Row' });
    expect(scena.layout.get().surfaces['window:1']).toMatchObject({ window: BOUNDS, tabPanel: { tree: { kind: 'leaf', tabs: ['row'] } } });
  });

  it('moves the tab of a key that is open, and leaves one that may not move', () => {
    const scena = setup();
    expect(openInWindow(scena, { key: 'a', resource: { component: 'Page' } }, BOUNDS)).toBe('window:1');
    expect(scena.surfaces.listAt('main').map((m) => m.key)).not.toContain('a');
    expect(openInWindow(scena, { key: 'fixed', resource: { component: 'Page' } }, BOUNDS)).toBeNull();
  });
});

describe('besideTab', () => {
  const main = { screenX: 100, screenY: 50 } as Window;

  it('places a new window beside the window the tab is in', () => {
    const scena = setup();
    openTabWindow(scena, 'a', BOUNDS);
    expect(besideTab(scena, 'a', main)).toEqual({ left: 50, top: 60, width: 800, height: 600 });
  });

  it('places it beside main for a tab on the main page', () => {
    const scena = setup();
    expect(besideTab(scena, 'b', main)).toEqual(besideWindow(main));
  });
});
