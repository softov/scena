// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, createEvent, cleanup, act } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { useLayout } from '../../src/react/hooks/useLayout.js';
import { useMounts } from '../../src/react/hooks/useMounts.js';
import { TabPanelLayout } from '../../src/ui/layout/TabPanelLayout.js';
import { collectLeaves } from '../../src/sdk/tab-panel.js';
import { TAB_DRAG_MIME, type TabDragPayload } from '../../src/sdk/tab-drag.js';
import { endTabDrag, startOpenDrag, startTabDrag } from '../../src/react/surface-drop.js';
import type { TabPanelLeaf, TabPanelNode } from '../../src/sdk/layout.js';
import type { SurfaceName } from '../../src/sdk/mount-surface.js';

afterEach(() => {
  cleanup();
  endTabDrag();
});
beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

type TestScena = ReturnType<typeof createScena>;

// The layout as SurfaceArea draws it: mounts and state from scena, and its
// writes back through layout.setSurface.
function Surface({ surface }: { surface: SurfaceName }) {
  const layout = useLayout();
  const mounts = useMounts(surface);
  const scena = useScenaFromTest();
  return (
    <div data-testid={surface}>
      <TabPanelLayout
        surface={surface}
        mounts={mounts}
        state={layout.surfaces[surface] ?? { visible: true }}
        setState={(patch) => scena.layout.setSurface(surface, patch)}
        renderMount={(m) => <div>{`page ${m.key}`}</div>}
        onActivate={(key) => scena.surfaces.focus(key)}
        onClose={(key) => scena.surfaces.close(key)}
        onReorder={() => {}}
      />
    </div>
  );
}
let current: TestScena;
const useScenaFromTest = () => current;

function setup(): TestScena {
  const scena = createScena();
  current = scena;
  for (const key of ['a', 'b']) {
    scena.surfaces.open({ surface: 'main', key, resource: { component: 'Page' }, props: { title: key } });
  }
  scena.surfaces.open({ surface: 'sidebar:right', key: 'x', resource: { component: 'Page' }, props: { title: 'x' } });
  scena.surfaces.open({
    surface: 'sidebar:right',
    key: 'fixed',
    resource: { component: 'Page' },
    props: { title: 'fixed' },
    policy: { movable: false },
  });
  scena.layout.setSurface('main', { visible: true, layout: 'tab-panel' });
  scena.layout.setSurface('sidebar:right', { visible: true, layout: 'tab-panel' });
  render(
    <ScenaProvider scena={scena}>
      <Surface surface="main" />
      <Surface surface="sidebar:right" />
    </ScenaProvider>,
  );
  return scena;
}

// A drag from another surface: the record a drag start leaves, and the data
// the browser hands the drop.
function dragFrom(payload: TabDragPayload) {
  startTabDrag(payload);
  const data = new Map<string, string>([[TAB_DRAG_MIME, JSON.stringify(payload)]]);
  return {
    types: [...data.keys()],
    getData: (t: string) => data.get(t) ?? '',
    setData: () => {},
    dropEffect: 'move',
    effectAllowed: 'move',
  };
}


// jsdom has no DragEvent, so a drop event loses `clientX` and `clientY`; set
// them on the event itself, where the layout reads them.
function dropAt(el: HTMLElement, clientX: number, clientY: number, dataTransfer: unknown) {
  const ev = createEvent.drop(el, { dataTransfer });
  Object.defineProperty(ev, 'clientX', { value: clientX });
  Object.defineProperty(ev, 'clientY', { value: clientY });
  fireEvent(el, ev);
}

const tree = (scena: TestScena, surface: SurfaceName): TabPanelNode | undefined =>
  scena.layout.get().surfaces[surface]?.tabPanel?.tree;
const leavesOf = (node: TabPanelNode | undefined): TabPanelLeaf[] => {
  const out: TabPanelLeaf[] = [];
  if (node) collectLeaves(node, out);
  return out;
};
const keysOn = (scena: TestScena, surface: SurfaceName) => scena.surfaces.listAt(surface).map((m) => m.key);

// The tab element of `title` inside one surface.
function tab(surface: SurfaceName, title: string): HTMLElement {
  const host = screen.getByTestId(surface);
  const el = Array.from(host.querySelectorAll('[draggable="true"]')).find((n) => n.textContent?.includes(title));
  if (!el) throw new Error(`no tab ${title} on ${surface}`);
  return el as HTMLElement;
}
// The body of the first group of a surface: the element that takes the five-zone drop.
function body(surface: SurfaceName): HTMLElement {
  const page = screen.getByTestId(surface).querySelector('div[style*="position: relative"]');
  if (!page) throw new Error(`no body on ${surface}`);
  return page as HTMLElement;
}

describe('TabPanelLayout takes a tab from another surface', () => {
  it('puts a tab dropped on the strip at that index, and moves the mount', () => {
    const scena = setup();
    act(() => {
      fireEvent.drop(tab('main', 'a'), { dataTransfer: dragFrom({ surface: 'sidebar:right', key: 'x' }) });
    });
    expect(keysOn(scena, 'main')).toContain('x');
    expect(keysOn(scena, 'sidebar:right')).not.toContain('x');
    expect(leavesOf(tree(scena, 'main'))[0]).toMatchObject({ tabs: ['x', 'a', 'b'], activeKey: 'x' });
    expect(leavesOf(tree(scena, 'sidebar:right')).flatMap((l) => l.tabs)).toEqual(['fixed']);
  });

  it('joins the group on a drop on the centre of the body', () => {
    const scena = setup();
    const el = body('main');
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    act(() => {
      dropAt(el, 50, 50, dragFrom({ surface: 'sidebar:right', key: 'x' }));
    });
    expect(leavesOf(tree(scena, 'main'))).toHaveLength(1);
    expect(leavesOf(tree(scena, 'main'))[0]?.tabs).toEqual(['a', 'b', 'x']);
  });

  it('splits the group on a drop on an edge of the body', () => {
    const scena = setup();
    const el = body('main');
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    act(() => {
      dropAt(el, 95, 50, dragFrom({ surface: 'sidebar:right', key: 'x' }));
    });
    expect(tree(scena, 'main')).toMatchObject({ kind: 'split', direction: 'row' });
    expect(leavesOf(tree(scena, 'main')).map((l) => l.tabs)).toEqual([['a', 'b'], ['x']]);
    expect(keysOn(scena, 'main')).toContain('x');
  });

  it('closes the source group the tab leaves empty', () => {
    const scena = setup();
    act(() => {
      scena.layout.setSurface('main', {
        tabPanel: {
          tree: {
            kind: 'split',
            direction: 'row',
            ratio: 0.5,
            first: { kind: 'leaf', id: 'g1', tabs: ['a'], activeKey: 'a' },
            second: { kind: 'leaf', id: 'g2', tabs: ['b'], activeKey: 'b' },
          },
        },
      });
    });
    act(() => {
      fireEvent.drop(tab('sidebar:right', 'x'), { dataTransfer: dragFrom({ surface: 'main', key: 'a' }) });
    });
    expect(tree(scena, 'main')).toMatchObject({ kind: 'leaf', id: 'g2', tabs: ['b'] });
    expect(leavesOf(tree(scena, 'sidebar:right'))[0]?.tabs).toEqual(['a', 'x', 'fixed']);
  });

  it('refuses a mount with movable false, on drag over and on drop', () => {
    const scena = setup();
    const dt = dragFrom({ surface: 'sidebar:right', key: 'fixed' });
    fireEvent.dragOver(tab('main', 'a'), { dataTransfer: dt });
    expect(dt.dropEffect).toBe('none');
    act(() => {
      fireEvent.drop(tab('main', 'a'), { dataTransfer: dragFrom({ surface: 'sidebar:right', key: 'fixed' }) });
    });
    expect(keysOn(scena, 'sidebar:right')).toContain('fixed');
    expect(keysOn(scena, 'main')).not.toContain('fixed');
  });

  it('still reorders a tab inside its own strip', () => {
    const scena = setup();
    const data = new Map<string, string>();
    const dt = {
      types: [] as string[],
      setData: (t: string, v: string) => { data.set(t, v); dt.types = [...data.keys()]; },
      getData: (t: string) => data.get(t) ?? '',
      dropEffect: 'move',
      effectAllowed: 'move',
    };
    act(() => {
      fireEvent.dragStart(tab('main', 'a'), { dataTransfer: dt });
      fireEvent.drop(tab('main', 'b'), { dataTransfer: dt });
    });
    expect(keysOn(scena, 'main')).toEqual(['a', 'b']);
    expect(leavesOf(tree(scena, 'main'))[0]?.tabs).toEqual(['a', 'b']);
  });

  it('opens a tab dropped outside the browser window in a window surface', () => {
    const scena = setup();
    const el = tab('main', 'a');
    const ev = createEvent.dragEnd(el, { dataTransfer: { dropEffect: 'none', types: [], getData: () => '', setData: () => {} } });
    for (const [k, v] of Object.entries({ clientX: -20, clientY: 40, screenX: 900, screenY: 300 })) Object.defineProperty(ev, k, { value: v });
    act(() => {
      fireEvent(el, ev);
    });
    expect(keysOn(scena, 'window:1')).toEqual(['a']);
    expect(scena.layout.get().surfaces['window:1']?.window).toEqual({ left: 860, top: 280, width: 800, height: 600 });
  });

  describe('a list row', () => {
    function rowDrag(key: string) {
      const data = new Map<string, string>();
      const dt = {
        types: [] as string[],
        setData: (t: string, v: string) => { data.set(t, v); dt.types = [...data.keys()]; },
        getData: (t: string) => data.get(t) ?? '',
        dropEffect: 'move',
        effectAllowed: 'all',
      };
      startOpenDrag(dt, { key, resource: { component: 'Page' }, props: { title: key } });
      return dt;
    }
    const rect = (el: HTMLElement) => {
      el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    };

    it('opens at the strip index', () => {
      const scena = setup();
      act(() => {
        fireEvent.drop(tab('main', 'b'), { dataTransfer: rowDrag('r1') });
      });
      expect(keysOn(scena, 'main')).toContain('r1');
      expect(leavesOf(tree(scena, 'main'))[0]).toMatchObject({ tabs: ['a', 'r1', 'b'], activeKey: 'r1' });
    });

    it('opens in a new group on an edge', () => {
      const scena = setup();
      const el = body('main');
      rect(el);
      act(() => {
        dropAt(el, 50, 95, rowDrag('r1'));
      });
      expect(tree(scena, 'main')).toMatchObject({ kind: 'split', direction: 'column' });
      expect(leavesOf(tree(scena, 'main')).map((l) => l.tabs)).toEqual([['a', 'b'], ['r1']]);
    });

    it('moves the tab of a key open on another surface into the group', () => {
      const scena = setup();
      const el = body('main');
      rect(el);
      act(() => {
        dropAt(el, 50, 50, rowDrag('x'));
      });
      expect(keysOn(scena, 'main')).toContain('x');
      expect(keysOn(scena, 'sidebar:right')).not.toContain('x');
      expect(leavesOf(tree(scena, 'main'))[0]?.tabs).toEqual(['a', 'b', 'x']);
    });
  });
});
