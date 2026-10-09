// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { TabLayout } from '../../src/ui/layout/TabLayout.js';

afterEach(cleanup);

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
