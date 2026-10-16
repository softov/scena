// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { StackLayout } from '../../src/ui/layout/StackLayout.js';

afterEach(cleanup);

describe('StackLayout pane header', () => {
  it("draws a pane's actions, and a press runs the command without folding the pane", () => {
    const scena = createScena();
    const run = vi.fn();
    scena.commands.register({ id: 'folders.reload', title: 'Refresh', run });
    const setState = vi.fn();
    const pane = {
      key: 'folders:explorer',
      surface: 'sidebar:left',
      component: { component: 'FolderExplorer' },
      props: { title: 'Folders', actions: [{ command: 'folders.reload', icon: 'R', label: 'Refresh' }] },
      policy: {},
      openedAt: 0,
    };

    render(
      <ScenaProvider scena={scena}>
        <StackLayout
          surface="sidebar:left"
          mounts={[pane] as never}
          state={{ visible: true }}
          setState={setState}
          renderMount={() => <p>tree</p>}
          onActivate={() => {}}
          onClose={() => {}}
          onReorder={() => {}}
        />
      </ScenaProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(run).toHaveBeenCalled();
    // A fold writes the collapsed set through setState; the press must not.
    expect(setState).not.toHaveBeenCalled();
    expect(screen.getByText('tree')).toBeTruthy();
  });

  it('draws no close for a pane whose policy says it is not closable', () => {
    const scena = createScena();
    const pane = (key: string, closable?: boolean) => ({
      key,
      surface: 'sidebar:left',
      component: { component: 'X' },
      props: { title: key },
      policy: closable === undefined ? {} : { closable },
      openedAt: 0,
    });
    const { container } = render(
      <ScenaProvider scena={scena}>
        <StackLayout
          surface="sidebar:left"
          mounts={[pane('kept', false), pane('page')] as never}
          state={{ visible: true }}
          setState={() => {}}
          renderMount={() => null}
          onActivate={() => {}}
          onClose={() => {}}
          onReorder={() => {}}
        />
      </ScenaProvider>,
    );
    const headers = Array.from(container.querySelectorAll<HTMLElement>('.oo-stack-header'));
    const closes = (header: HTMLElement) => header.querySelectorAll('[title="Close"]').length;
    expect(closes(headers[0]!)).toBe(0);
    expect(closes(headers[1]!)).toBe(1);
  });

  it('sizes a fitContent pane to its content until a divider is dragged', () => {
    const scena = createScena();
    const pane = (key: string, policy: object) => ({
      key,
      surface: 'sidebar:left',
      component: { component: 'X' },
      props: { title: key },
      policy,
      openedAt: 0,
    });
    const setState = vi.fn();
    const view = (state: object) => (
      <ScenaProvider scena={scena}>
        <StackLayout
          surface="sidebar:left"
          mounts={[pane('open', { fitContent: true }), pane('tree', {})] as never}
          state={{ visible: true, ...state }}
          setState={setState}
          renderMount={() => null}
          onActivate={() => {}}
          onClose={() => {}}
          onReorder={() => {}}
        />
      </ScenaProvider>
    );
    const { container, rerender } = render(view({}));
    const sections = () => Array.from(container.querySelectorAll<HTMLElement>('.oo-stack-section'));
    expect(sections()[0]!.style.flex).toBe('0 1 auto');
    expect(sections()[0]!.style.maxHeight).toBe('50%');
    expect(sections()[1]!.style.flex).toBe('1 1 0px');

    // The stack is 400px from y=0: the panes show 100px and 300px; a drop at 40% gives 160/240.
    const rect = (top: number, height: number) => ({ top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) });
    vi.spyOn(container.querySelector<HTMLElement>('.oo-layout--stack')!, 'getBoundingClientRect').mockReturnValue(rect(0, 400));
    vi.spyOn(sections()[0]!, 'getBoundingClientRect').mockReturnValue(rect(0, 100));
    vi.spyOn(sections()[1]!, 'getBoundingClientRect').mockReturnValue(rect(100, 300));
    const divisor = container.querySelector<HTMLElement>('.oo-divisor')!;
    divisor.setPointerCapture = () => {};
    divisor.releasePointerCapture = () => {};
    fireEvent.pointerDown(divisor, { pointerId: 1 });
    fireEvent.pointerMove(divisor, { pointerId: 1, clientY: 160 });
    fireEvent.pointerUp(divisor, { pointerId: 1 });
    expect(setState).toHaveBeenCalledWith({ stack: { sizes: { open: 160, tree: 240 } } });

    rerender(view({ stack: { sizes: { open: 160, tree: 240 } } }));
    expect(sections()[0]!.style.flex).toBe('160 1 0px');
    expect(sections()[0]!.style.maxHeight).toBe('');
    expect(sections()[1]!.style.flex).toBe('240 1 0px');
  });
});
