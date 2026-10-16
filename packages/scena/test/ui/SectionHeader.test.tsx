// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SectionHeader } from '../../src/ui/layout/SectionHeader.js';
import type { BindingPath } from '../../src/sdk/component-graph.js';
import type { MountAction } from '../../src/sdk/mount-surface.js';

const ARCHIVED = '$/test/archived' as BindingPath;
const RELOADING = '$/test/reloading' as BindingPath;
const CAN_CREATE = '$/test/canCreate' as BindingPath;

afterEach(cleanup);

/** Store changes reach subscribers on a later tick. */
const set = async (scena: ReturnType<typeof createScena>, path: BindingPath, value: unknown): Promise<void> => {
  await act(async () => {
    scena.store.set(path, value);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

function mount(actions: MountAction[]) {
  const scena = createScena();
  const ran: string[] = [];
  scena.commands.register({ id: 'x.new', title: 'New', run: () => void ran.push('x.new') });
  scena.commands.register({ id: 'x.archived', title: 'Archived', run: () => void ran.push('x.archived') });
  scena.commands.register({ id: 'x.reload', title: 'Reload', run: () => void ran.push('x.reload') });
  const view = render(
    <ScenaProvider scena={scena}>
      <SectionHeader title="Sessions" actions={actions} />
    </ScenaProvider>,
  );
  const button = (label: string) => view.container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  return { scena, ran, button };
}

describe('SectionHeader actions', () => {
  it('a button with a when comes and goes with the store', async () => {
    const { scena, button } = mount([{ command: 'x.new', label: 'New', icon: '+', when: `${CAN_CREATE} == true` }]);
    expect(button('New')).toBeNull();
    await set(scena, CAN_CREATE, true);
    expect(button('New')).not.toBeNull();
    await set(scena, CAN_CREATE, false);
    expect(button('New')).toBeNull();
  });

  it('a button with active is pressed while its path holds', async () => {
    const { scena, button } = mount([{ command: 'x.archived', label: 'Archived', icon: 'A', active: `${ARCHIVED} == true` }]);
    expect(button('Archived')!.getAttribute('aria-pressed')).toBe('false');
    await set(scena, ARCHIVED, true);
    expect(button('Archived')!.getAttribute('aria-pressed')).toBe('true');
    expect(button('Archived')!.dataset.active).toBe('true');
  });

  it('a button with busy waits while its path holds, and runs its command otherwise', async () => {
    const { scena, ran, button } = mount([{ command: 'x.reload', label: 'Reload', icon: 'R', busy: `${RELOADING} == true` }]);
    fireEvent.click(button('Reload')!);
    expect(ran).toEqual(['x.reload']);
    await set(scena, RELOADING, true);
    expect(button('Reload')!.disabled).toBe(true);
    expect(button('Reload')!.dataset.busy).toBe('true');
  });

  it('a plain button has no pressed state', () => {
    const { button } = mount([{ command: 'x.new', label: 'New', icon: '+' }]);
    expect(button('New')!.hasAttribute('aria-pressed')).toBe(false);
  });

  it('a button with a menu opens its slot under itself, and runs no command', async () => {
    const { scena, ran, button } = mount([{ command: 'x.new', label: 'Group', icon: 'G', menu: 'x:group' }]);
    scena.commands.register({ id: 'x.byFolder', title: 'By folder', slots: ['x:group'], run: () => void ran.push('x.byFolder') });
    expect(button('Group')!.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button('Group')!);
    expect(button('Group')!.getAttribute('aria-expanded')).toBe('true');
    expect(ran).toEqual([]);
    fireEvent.click(await screen.findByText('By folder'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(ran).toEqual(['x.byFolder']);
    expect(button('Group')!.getAttribute('aria-expanded')).toBe('false');
  });
});

