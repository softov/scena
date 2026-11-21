// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SurfaceArea } from '../../src/react/SurfaceArea.js';
import { endTabDrag, startOpenDrag, startTabDrag, useDropArea } from '../../src/react/surface-drop.js';
import { registerBuiltinLayouts } from '../../src/ui/layout/register.js';
import { TAB_DRAG_MIME, type DroppedThing, type TabDragPayload } from '../../src/sdk/tab-drag.js';

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  endTabDrag();
});

const dropped = vi.fn<(thing: DroppedThing) => void>();

// A page with a composer that is a drop area, and room beside it.
function Page() {
  const area = useDropArea({ accepts: (thing) => thing.key !== 'refuse-me', onDrop: dropped });
  return (
    <div>
      <p>the page</p>
      <div data-testid="composer" data-over={area.over || undefined} {...area.props}>composer</div>
    </div>
  );
}

async function setup() {
  dropped.mockReset();
  const scena = createScena();
  registerBuiltinLayouts(scena);
  scena.components.register({ component: 'Page', renderer: { kind: 'react', load: async () => ({ default: Page }) } });
  scena.components.register({ component: 'Other', renderer: { kind: 'react', load: async () => ({ default: () => <div>other</div> }) } });
  scena.surfaces.open({ surface: 'main', key: 'page', resource: { component: 'Page' }, props: { title: 'The page' } });
  scena.surfaces.open({ surface: 'sidebar:right', key: 'user:1', resource: { component: 'Other', userId: '1' }, props: { title: 'Ada' } });
  scena.surfaces.open({ surface: 'sidebar:right', key: 'refuse-me', resource: { component: 'Other' }, props: { title: 'No' } });
  render(
    <ScenaProvider scena={scena}>
      <SurfaceArea surface="main" role="main" layout="tab" />
      <SurfaceArea surface="sidebar:right" role="panel" layout="tab" />
    </ScenaProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('composer')).toBeTruthy());
  return scena;
}

function tabDrag(payload: TabDragPayload) {
  startTabDrag(payload);
  const data = new Map<string, string>([[TAB_DRAG_MIME, JSON.stringify(payload)]]);
  return { types: [...data.keys()], getData: (t: string) => data.get(t) ?? '', setData: () => {}, dropEffect: 'move', effectAllowed: 'copyMove' };
}

describe('a drop area', () => {
  it('takes a tab, which stays on its surface', async () => {
    const scena = await setup();
    const composer = screen.getByTestId('composer');
    const dt = tabDrag({ surface: 'sidebar:right', key: 'user:1' });
    fireEvent.dragOver(composer, { dataTransfer: dt });
    expect(dt.dropEffect).toBe('copy');
    expect(composer.dataset.over).toBe('true');
    act(() => {
      fireEvent.drop(composer, { dataTransfer: dt });
    });
    expect(dropped).toHaveBeenCalledWith({ from: 'tab', key: 'user:1', resource: { component: 'Other', userId: '1' }, title: 'Ada', surface: 'sidebar:right' });
    expect(scena.surfaces.listAt('sidebar:right').map((m) => m.key)).toContain('user:1');
    expect(scena.surfaces.listAt('main').map((m) => m.key)).toEqual(['page']);
    expect(composer.dataset.over).toBeUndefined();
  });

  it('takes a row, with its payload', async () => {
    const scena = await setup();
    const data = new Map<string, string>();
    const dt = {
      types: [] as string[],
      setData: (t: string, v: string) => { data.set(t, v); dt.types = [...data.keys()]; },
      getData: (t: string) => data.get(t) ?? '',
      dropEffect: 'move',
      effectAllowed: 'all',
    };
    startOpenDrag(dt, { key: 'session:s_1', resource: { component: 'SessionView', sessionId: 's_1' }, props: { title: 'Refine' } });
    act(() => {
      fireEvent.drop(screen.getByTestId('composer'), { dataTransfer: dt });
    });
    expect(dropped).toHaveBeenCalledWith({ from: 'row', key: 'session:s_1', resource: { component: 'SessionView', sessionId: 's_1' }, title: 'Refine' });
    expect(scena.surfaces.listSurfaces().some((s) => scena.surfaces.listAt(s).some((m) => m.key === 'session:s_1'))).toBe(false);
  });

  it('lets the surface take what it does not accept', async () => {
    const scena = await setup();
    act(() => {
      fireEvent.drop(screen.getByTestId('composer'), { dataTransfer: tabDrag({ surface: 'sidebar:right', key: 'refuse-me' }) });
    });
    expect(dropped).not.toHaveBeenCalled();
    expect(scena.surfaces.listAt('main').map((m) => m.key)).toContain('refuse-me');
  });

  it('leaves a drop beside it to the surface', async () => {
    const scena = await setup();
    act(() => {
      fireEvent.drop(screen.getByText('the page'), { dataTransfer: tabDrag({ surface: 'sidebar:right', key: 'user:1' }) });
    });
    expect(dropped).not.toHaveBeenCalled();
    expect(scena.surfaces.listAt('main').map((m) => m.key)).toContain('user:1');
  });
});
