// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { TabLayout } from '../../src/ui/layout/TabLayout.js';

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

  it('scrolls the tab that becomes active into the strip\'s view', () => {
    const scena = createScena();
    const { rerender } = render(layout(scena, 'a'));
    expect(scrolled).toHaveBeenCalledTimes(1);
    expect((scrolled.mock.calls[0]?.[0] as HTMLElement).title).toBe('a');

    rerender(layout(scena, 'c'));
    expect(scrolled).toHaveBeenCalledTimes(2);
    expect((scrolled.mock.calls[1]?.[0] as HTMLElement).title).toBe('c');
    expect(scrolled.mock.calls[1]?.[1]).toEqual({ block: 'nearest', inline: 'nearest' });
  });

  it('leaves the strip alone when the active tab stays the same', () => {
    const scena = createScena();
    const { rerender } = render(layout(scena, 'b'));
    rerender(layout(scena, 'b'));
    expect(scrolled).toHaveBeenCalledTimes(1);
  });
});
