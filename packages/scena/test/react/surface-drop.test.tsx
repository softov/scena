// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SurfaceArea } from '../../src/react/SurfaceArea.js';
import { endTabDrag, startOpenDrag, startTabDrag } from '../../src/react/surface-drop.js';
import { registerBuiltinLayouts } from '../../src/ui/layout/register.js';
import { TAB_DRAG_MIME, type OpenDragPayload, type TabDragPayload } from '../../src/sdk/tab-drag.js';
import type { SurfaceName } from '../../src/sdk/mount-surface.js';

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  endTabDrag();
});

type TestScena = ReturnType<typeof createScena>;

function dragFrom(payload: TabDragPayload) {
  startTabDrag(payload);
  const data = new Map<string, string>([[TAB_DRAG_MIME, JSON.stringify(payload)]]);
  return { types: [...data.keys()], getData: (t: string) => data.get(t) ?? '', setData: () => {}, dropEffect: 'move', effectAllowed: 'move' };
}
const keysOn = (scena: TestScena, surface: SurfaceName) => scena.surfaces.listAt(surface).map((m) => m.key);

// Three surfaces as a shell draws them: main, the right sidebar with
// `layout`, and the title bar.
async function setup(layout: string): Promise<{ scena: TestScena; el: (surface: string) => HTMLElement }> {
  const scena = createScena();
  registerBuiltinLayouts(scena);
  scena.components.register({ component: 'Page', renderer: { kind: 'react', load: async () => ({ default: () => <div>a page</div> }) } });
  const open = (surface: SurfaceName, key: string, movable = true) =>
    scena.surfaces.open({ surface, key, resource: { component: 'Page' }, props: { title: key }, ...(movable ? {} : { policy: { movable: false } }) });
  open('main', 'm1');
  open('main', 'fixed', false);
  open('sidebar:right', 's1');
  scena.layout.setSurface('sidebar:right', { visible: true, layout });
  const { container } = render(
    <ScenaProvider scena={scena}>
      <SurfaceArea surface="titlebar" role="bar" layout="bar" />
      <SurfaceArea surface="main" role="main" layout="tab" />
      <SurfaceArea surface="sidebar:right" role="panel" />
    </ScenaProvider>,
  );
  await waitFor(() => expect(container.textContent).toContain('a page'));
  const el = (surface: string) => container.querySelector(`[data-surface="${surface}"]`) as HTMLElement;
  return { scena, el };
}

describe('a surface takes a tab dropped anywhere on it', () => {
  it.each(['tab', 'stack', 'single'])('on a %s surface, the page takes it', async (layout) => {
    const { scena, el } = await setup(layout);
    const page = el('sidebar:right').querySelector('.oo-layout__mount') ?? el('sidebar:right');
    act(() => {
      fireEvent.drop(page, { dataTransfer: dragFrom({ surface: 'main', key: 'm1' }) });
    });
    expect(keysOn(scena, 'sidebar:right')).toContain('m1');
    expect(keysOn(scena, 'main')).not.toContain('m1');
  });

  it('puts the tab at the end of a tab strip', async () => {
    const { scena, el } = await setup('tab');
    act(() => {
      fireEvent.drop(el('sidebar:right'), { dataTransfer: dragFrom({ surface: 'main', key: 'm1' }) });
    });
    expect(scena.layout.get().surfaces['sidebar:right']?.split?.order).toEqual(['s1', 'm1']);
  });

  it('takes no drop on a bar', async () => {
    const { scena, el } = await setup('tab');
    const dt = dragFrom({ surface: 'main', key: 'm1' });
    fireEvent.dragOver(el('titlebar'), { dataTransfer: dt });
    act(() => {
      fireEvent.drop(el('titlebar'), { dataTransfer: dt });
    });
    expect(keysOn(scena, 'main')).toContain('m1');
    expect(keysOn(scena, 'titlebar')).toEqual([]);
  });

  it('refuses a mount with movable false', async () => {
    const { scena, el } = await setup('stack');
    const dt = dragFrom({ surface: 'main', key: 'fixed' });
    fireEvent.dragOver(el('sidebar:right'), { dataTransfer: dt });
    expect(dt.dropEffect).toBe('none');
    act(() => {
      fireEvent.drop(el('sidebar:right'), { dataTransfer: dragFrom({ surface: 'main', key: 'fixed' }) });
    });
    expect(keysOn(scena, 'main')).toContain('fixed');
  });

  describe('a list row', () => {
    function rowDrag(payload: OpenDragPayload) {
      const data = new Map<string, string>();
      const dt = {
        types: [] as string[],
        setData: (t: string, v: string) => { data.set(t, v); dt.types = [...data.keys()]; },
        getData: (t: string) => data.get(t) ?? '',
        dropEffect: 'move',
        effectAllowed: 'all',
      };
      startOpenDrag(dt, payload);
      return dt;
    }
    const row = (key: string): OpenDragPayload => ({ key, resource: { component: 'Page' }, props: { title: `Row ${key}` } });

    it.each(['tab', 'stack', 'single'])('opens a key that is not open, on a %s surface, at the end', async (layout) => {
      const { scena, el } = await setup(layout);
      const dt = rowDrag(row('r1'));
      fireEvent.dragOver(el('sidebar:right'), { dataTransfer: dt });
      act(() => {
        fireEvent.drop(el('sidebar:right'), { dataTransfer: dt });
      });
      expect(keysOn(scena, 'sidebar:right')).toContain('r1');
      expect(scena.surfaces.listAt('sidebar:right').find((m) => m.key === 'r1')?.props?.title).toBe('Row r1');
      if (layout !== 'single') expect(scena.layout.get().surfaces['sidebar:right']?.split?.order).toEqual(['s1', 'r1']);
    });

    it('moves the tab of a key open on another surface to the drop', async () => {
      const { scena, el } = await setup('tab');
      act(() => {
        fireEvent.drop(el('sidebar:right'), { dataTransfer: rowDrag(row('m1')) });
      });
      expect(keysOn(scena, 'sidebar:right')).toContain('m1');
      expect(keysOn(scena, 'main')).not.toContain('m1');
    });

    it('refuses the row of an open key that cannot move', async () => {
      const { scena, el } = await setup('tab');
      const dt = rowDrag(row('fixed'));
      fireEvent.dragOver(el('sidebar:right'), { dataTransfer: dt });
      expect(dt.dropEffect).toBe('none');
      expect(keysOn(scena, 'main')).toContain('fixed');
    });

    it('takes no row on a bar', async () => {
      const { scena, el } = await setup('tab');
      act(() => {
        fireEvent.drop(el('titlebar'), { dataTransfer: rowDrag(row('r1')) });
      });
      expect(keysOn(scena, 'titlebar')).toEqual([]);
      expect(scena.surfaces.listSurfaces().some((s) => keysOn(scena, s).includes('r1'))).toBe(false);
    });
  });

  it('takes no drop on a surface whose state says drops: false', async () => {
    const { scena, el } = await setup('stack');
    act(() => scena.layout.setSurface('sidebar:right', { drops: false }));
    const dt = dragFrom({ surface: 'main', key: 'm1' });
    fireEvent.dragOver(el('sidebar:right'), { dataTransfer: dt });
    // Refused: the browser shows it cannot land there.
    expect(dt.dropEffect).toBe('none');
    act(() => {
      fireEvent.drop(el('sidebar:right'), { dataTransfer: dt });
    });
    expect(keysOn(scena, 'main')).toContain('m1');
    expect(keysOn(scena, 'sidebar:right')).not.toContain('m1');
  });
});
