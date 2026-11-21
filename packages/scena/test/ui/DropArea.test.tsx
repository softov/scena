// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SurfaceArea } from '../../src/react/SurfaceArea.js';
import { endTabDrag, startTabDrag } from '../../src/react/surface-drop.js';
import { registerBuiltins } from '../../src/ui/register.js';
import { registerBuiltinLayouts } from '../../src/ui/layout/register.js';
import { TAB_DRAG_MIME, type DroppedThing, type TabDragPayload } from '../../src/sdk/tab-drag.js';

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  endTabDrag();
});

function tabDrag(payload: TabDragPayload) {
  startTabDrag(payload);
  const data = new Map<string, string>([[TAB_DRAG_MIME, JSON.stringify(payload)]]);
  return { types: [...data.keys()], getData: (t: string) => data.get(t) ?? '', setData: () => {}, dropEffect: 'move', effectAllowed: 'copyMove' };
}

// A JSON page: a DropArea that takes only `Other` tabs and runs `took`.
async function setup() {
  const scena = createScena();
  registerBuiltins(scena);
  registerBuiltinLayouts(scena);
  const took: unknown[] = [];
  scena.commands.register({ id: 'took', title: 'Took', run: (_ctx, args) => void took.push(args) });
  scena.components.register({ component: 'Other', renderer: { kind: 'react', load: async () => ({ default: () => <div>other</div> }) } });
  scena.components.register({ component: 'Third', renderer: { kind: 'react', load: async () => ({ default: () => <div>third</div> }) } });
  scena.surfaces.open({
    surface: 'main',
    key: 'page',
    resource: { component: 'DropArea', accepts: ['Other'], command: 'took', args: { into: 'page' }, label: 'Drop a tab here' },
  });
  scena.surfaces.open({ surface: 'sidebar:right', key: 'o', resource: { component: 'Other' }, props: { title: 'An other' } });
  scena.surfaces.open({ surface: 'sidebar:right', key: 't', resource: { component: 'Third' } });
  render(
    <ScenaProvider scena={scena}>
      <SurfaceArea surface="main" role="main" layout="tab" />
      <SurfaceArea surface="sidebar:right" role="panel" layout="tab" />
    </ScenaProvider>,
  );
  await waitFor(() => expect(screen.getByText('Drop a tab here')).toBeTruthy());
  const area = screen.getByText('Drop a tab here').closest('.oo-drop-area') as HTMLElement;
  return { scena, took, area };
}

describe('DropArea', () => {
  it('runs its command with its args and the dropped thing', async () => {
    const { scena, took, area } = await setup();
    act(() => {
      fireEvent.drop(area, { dataTransfer: tabDrag({ surface: 'sidebar:right', key: 'o' }) });
    });
    expect(took).toEqual([{ into: 'page', drop: { from: 'tab', key: 'o', resource: { component: 'Other' }, title: 'An other', surface: 'sidebar:right' } satisfies DroppedThing }]);
    expect(scena.surfaces.listAt('sidebar:right').map((m) => m.key)).toContain('o');
  });

  it('does not take a component that is not in accepts', async () => {
    const { scena, took, area } = await setup();
    act(() => {
      fireEvent.drop(area, { dataTransfer: tabDrag({ surface: 'sidebar:right', key: 't' }) });
    });
    expect(took).toEqual([]);
    expect(scena.surfaces.listAt('main').map((m) => m.key)).toContain('t');
  });
});
