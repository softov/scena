// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { TabLayout } from '../../src/ui/layout/TabLayout.js';
import { TabPanelLayout } from '../../src/ui/layout/TabPanelLayout.js';
import { useLayout } from '../../src/react/hooks/useLayout.js';
import { useMounts } from '../../src/react/hooks/useMounts.js';
import { TAB_DRAG_MIME, type TabDragPayload } from '../../src/sdk/tab-drag.js';
import { endTabDrag, startTabDrag } from '../../src/react/surface-drop.js';
import type { SurfaceName } from '../../src/sdk/mount-surface.js';
import { act } from '@testing-library/react';

afterEach(cleanup);

// jsdom draws no layout, so it has no scrollIntoView; each test sees where the strip scrolls through this spy.
const scrolled = vi.fn();
beforeEach(() => {
  scrolled.mockReset();
  Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) { scrolled(this, options); };
});

function strip(scena: ReturnType<typeof createScena>, surface: string, mounts: unknown[] = []) {
  return render(
    <ScenaProvider scena={scena}>
      <TabLayout
        surface={surface}
        mounts={mounts as never}
        state={{ visible: true }}
        setState={() => {}}
        renderMount={() => null}
        onActivate={() => {}}
        onClose={() => {}}
        onReorder={() => {}}
      />
    </ScenaProvider>,
  );
}

describe('TabLayout surface/title', () => {
  it('shows a surface button on an empty strip, icon only, and runs it', () => {
    const scena = createScena();
    const run = vi.fn();
    scena.commands.register({ id: 'add', title: 'New terminal', icon: '+', slots: ['surface/title'], when: '$/surface/name == "panel:bottom"', run });

    strip(scena, 'panel:bottom');
    const button = screen.getByRole('button', { name: 'New terminal' });
    expect(button.textContent).toBe('+');
    fireEvent.click(button);
    expect(run).toHaveBeenCalled();
  });

  it('keeps a button off the surfaces its when excludes', () => {
    const scena = createScena();
    scena.commands.register({ id: 'add', title: 'New terminal', icon: '+', slots: ['surface/title'], when: '$/surface/name == "panel:bottom"', run: () => {} });

    strip(scena, 'main');
    expect(screen.queryByRole('button', { name: 'New terminal' })).toBeNull();
  });

  it('reads the active tab, and gives its key to the command', () => {
    const scena = createScena();
    let ran: unknown;
    scena.commands.register({
      id: 'kill',
      title: 'Kill terminal',
      slots: ['surface/title'],
      when: (ctx) => ctx['$/tab/component'] === 'TerminalPage',
      run: (ctx) => { ran = ctx.store.get('$/tab/key'); },
    });
    const mount = (key: string, component: string) => ({ key, surface: 'panel:bottom', component: { component }, props: {}, policy: {}, openedAt: 0 });

    strip(scena, 'panel:bottom', [mount('log', 'LogPage')]);
    expect(screen.queryByRole('button', { name: 'Kill terminal' })).toBeNull();
    cleanup();

    strip(scena, 'panel:bottom', [mount('log', 'LogPage'), mount('t1', 'TerminalPage')]);
    fireEvent.click(screen.getByRole('button', { name: 'Kill terminal' }));
    expect(ran).toBe('t1');
  });
});

describe('TabLayout active tab', () => {
  const mount = (key: string) => ({ key, surface: 'main', component: { component: 'Page' }, props: { title: key }, policy: {}, openedAt: 0 });
  const layout = (scena: ReturnType<typeof createScena>, active: string) => (
    <ScenaProvider scena={scena}>
      <TabLayout
        surface="main"
        mounts={[mount('a'), mount('b'), mount('c')] as never}
        state={{ visible: true, activeContainerKey: active }}
        setState={() => {}}
        renderMount={() => null}
        onActivate={() => {}}
        onClose={() => {}}
        onReorder={() => {}}
      />
    </ScenaProvider>
  );

  // jsdom has no IntersectionObserver: this one hands each test the tab it watches and lets the test say what the browser saw.
  const watched: { target: Element; root: Element; report: (ratio: number, box: Partial<DOMRect>, view: Partial<DOMRect>) => void }[] = [];
  beforeEach(() => {
    watched.length = 0;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private readonly cb: IntersectionObserverCallback, private readonly options: IntersectionObserverInit) {}
      observe(target: Element) {
        watched.push({
          target,
          root: this.options.root as Element,
          report: (ratio, box, view) => this.cb([{ target, intersectionRatio: ratio, boundingClientRect: box, rootBounds: view } as IntersectionObserverEntry], this as never),
        });
      }
      disconnect() {}
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  const strip = { left: 0, right: 100, top: 0, bottom: 30 };

  it('watches the tab that becomes active, in its strip', () => {
    const scena = createScena();
    const { rerender } = render(layout(scena, 'a'));
    expect(watched.map((one) => (one.target as HTMLElement).title)).toEqual(['a']);
    expect(watched[0]?.root.className).toBe('tab-bar__strip');

    rerender(layout(scena, 'c'));
    expect(watched.map((one) => (one.target as HTMLElement).title)).toEqual(['a', 'c']);
    rerender(layout(scena, 'c'));
    expect(watched).toHaveLength(2);
  });

  it('scrolls the strip by the part of the tab cut off, and not at all for a tab in view', () => {
    const scena = createScena();
    render(layout(scena, 'a'));
    const one = watched[0]!;
    const scrollBy = vi.fn();
    (one.root as HTMLElement).scrollBy = scrollBy as never;

    one.report(1, { left: 10, right: 60, top: 0, bottom: 30 }, strip);
    expect(scrollBy).not.toHaveBeenCalled();

    one.report(0.5, { left: 80, right: 130, top: 0, bottom: 30 }, strip);
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 30, top: 0 });

    one.report(0.5, { left: -20, right: 30, top: 0, bottom: 30 }, strip);
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -20, top: 0 });
    expect(scrolled).not.toHaveBeenCalled();
  });
});

describe('TabLayout takes a tab from another surface', () => {
  afterEach(endTabDrag);
  type TestScena = ReturnType<typeof createScena>;

  // `sidebar:right` draws with the `tab` layout, `main` with `tab-panel`, as ahpw does.
  function Surfaces({ scena }: { scena: TestScena }) {
    const layout = useLayout();
    const side = useMounts('sidebar:right');
    const main = useMounts('main');
    const common = (surface: SurfaceName) => ({
      surface,
      state: layout.surfaces[surface] ?? { visible: true },
      setState: (patch: object) => scena.layout.setSurface(surface, patch),
      renderMount: () => null,
      onActivate: (key: string) => scena.surfaces.focus(key),
      onClose: (key: string) => scena.surfaces.close(key),
      onReorder: () => {},
    });
    return (
      <>
        <div data-testid="sidebar:right"><TabLayout {...common('sidebar:right')} mounts={side} /></div>
        <div data-testid="main"><TabPanelLayout {...common('main')} mounts={main} /></div>
      </>
    );
  }

  function setup(): TestScena {
    const scena = createScena();
    const open = (surface: SurfaceName, key: string, movable = true) =>
      scena.surfaces.open({ surface, key, resource: { component: 'Page' }, props: { title: key }, ...(movable ? {} : { policy: { movable: false } }) });
    open('sidebar:right', 's1');
    open('sidebar:right', 's2');
    open('main', 'm1');
    open('main', 'fixed', false);
    scena.layout.setSurface('main', { visible: true, layout: 'tab-panel' });
    render(<ScenaProvider scena={scena}><Surfaces scena={scena} /></ScenaProvider>);
    return scena;
  }

  function dragFrom(payload: TabDragPayload) {
    startTabDrag(payload);
    const data = new Map<string, string>([[TAB_DRAG_MIME, JSON.stringify(payload)]]);
    return { types: [...data.keys()], getData: (t: string) => data.get(t) ?? '', setData: () => {}, dropEffect: 'move', effectAllowed: 'move' };
  }
  const tabOn = (surface: SurfaceName, title: string) => {
    const el = Array.from(screen.getByTestId(surface).querySelectorAll('[draggable="true"]')).find((n) => n.textContent?.includes(title));
    if (!el) throw new Error(`no tab ${title} on ${surface}`);
    return el as HTMLElement;
  };
  const order = (scena: TestScena) => scena.layout.get().surfaces['sidebar:right']?.split?.order;
  const keysOn = (scena: TestScena, surface: SurfaceName) => scena.surfaces.listAt(surface).map((m) => m.key);

  it('puts a tab from main at the index it fell on, and moves the mount', () => {
    const scena = setup();
    act(() => {
      fireEvent.drop(tabOn('sidebar:right', 's2'), { dataTransfer: dragFrom({ surface: 'main', key: 'm1', leafId: 'any' }) });
    });
    expect(order(scena)).toEqual(['s1', 'm1', 's2']);
    expect(keysOn(scena, 'sidebar:right')).toContain('m1');
    expect(keysOn(scena, 'main')).not.toContain('m1');
  });

  it('gives a tab back to main, on a tab-panel strip', () => {
    const scena = setup();
    act(() => {
      fireEvent.drop(tabOn('main', 'm1'), { dataTransfer: dragFrom({ surface: 'sidebar:right', key: 's1' }) });
    });
    expect(keysOn(scena, 'main')).toContain('s1');
    expect(keysOn(scena, 'sidebar:right')).toEqual(['s2']);
  });

  const pageOf = (surface: SurfaceName) => screen.getByTestId(surface).querySelector('.oo-layout--tab > div[style*="position: relative"]') as HTMLElement;
  const box = (surface: SurfaceName) => screen.getByTestId(surface).querySelector('.oo-tab-panel-drop-preview');

  it('shows a drop box over its page, and puts a tab dropped there at the end', () => {
    const scena = setup();
    const dt = dragFrom({ surface: 'main', key: 'm1', leafId: 'any' });
    act(() => {
      fireEvent.dragOver(pageOf('sidebar:right'), { dataTransfer: dt });
    });
    expect(box('sidebar:right')).not.toBeNull();
    act(() => {
      fireEvent.drop(pageOf('sidebar:right'), { dataTransfer: dt });
    });
    expect(box('sidebar:right')).toBeNull();
    expect(order(scena)).toEqual(['s1', 's2', 'm1']);
    expect(keysOn(scena, 'main')).not.toContain('m1');
  });

  it('shows no drop box for a mount with movable false', () => {
    setup();
    act(() => {
      fireEvent.dragOver(pageOf('sidebar:right'), { dataTransfer: dragFrom({ surface: 'main', key: 'fixed' }) });
    });
    expect(box('sidebar:right')).toBeNull();
  });

  it('refuses a mount with movable false', () => {
    const scena = setup();
    const dt = dragFrom({ surface: 'main', key: 'fixed' });
    fireEvent.dragOver(tabOn('sidebar:right', 's1'), { dataTransfer: dt });
    expect(dt.dropEffect).toBe('none');
    act(() => {
      fireEvent.drop(tabOn('sidebar:right', 's1'), { dataTransfer: dragFrom({ surface: 'main', key: 'fixed' }) });
    });
    expect(keysOn(scena, 'main')).toContain('fixed');
  });

  it('still reorders inside its own strip', () => {
    const reorders: [number, number][] = [];
    const scena = createScena();
    const mounts = ['a', 'b'].map((key) => ({ key, surface: 'main', component: { component: 'Page' }, props: { title: key }, policy: {}, openedAt: 0 }));
    render(
      <ScenaProvider scena={scena}>
        <TabLayout surface="main" mounts={mounts as never} state={{ visible: true }} setState={() => {}} renderMount={() => null}
          onActivate={() => {}} onClose={() => {}} onReorder={(from, to) => reorders.push([from, to])} />
      </ScenaProvider>,
    );
    const data = new Map<string, string>();
    const dt = {
      types: [] as string[],
      setData: (t: string, v: string) => { data.set(t, v); dt.types = [...data.keys()]; },
      getData: (t: string) => data.get(t) ?? '',
      dropEffect: 'move',
      effectAllowed: 'move',
    };
    const tabs = Array.from(document.querySelectorAll('[draggable="true"]')) as HTMLElement[];
    fireEvent.dragStart(tabs[0]!, { dataTransfer: dt });
    fireEvent.drop(tabs[1]!, { dataTransfer: dt });
    expect(reorders).toEqual([[0, 1]]);
  });
});
