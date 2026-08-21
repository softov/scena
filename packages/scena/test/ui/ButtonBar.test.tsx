// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { type ReactNode } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { ButtonBar } from '../../src/ui/control/ButtonBar.js';
import type { BindingPath } from '../../src/sdk/component-graph.js';

function mount(scena: ReturnType<typeof createScena>, node: ReactNode) {
  return render(<ScenaProvider scena={scena}>{node}</ScenaProvider>);
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

afterEach(cleanup);

describe('ButtonBar', () => {
  it('renders icon, label and value', () => {
    const scena = createScena();
    const { container } = mount(scena, <ButtonBar icon="N" label="Notes" value={4} />);
    expect(container.querySelector('.oo-button-bar__icon')?.textContent).toBe('N');
    expect(container.querySelector('.oo-button-bar__label')?.textContent).toBe('Notes');
    expect(container.querySelector('.oo-button-bar__value')?.textContent).toBe('4');
  });

  // An empty button is a dead patch of bar that still takes a click.
  it('renders nothing when there is nothing to show', () => {
    const scena = createScena();
    const { container } = mount(scena, <ButtonBar command="noop" />);
    expect(container.querySelector('.oo-button-bar')).toBeNull();
  });

  it('renders for a value of 0, which is a real value', () => {
    const scena = createScena();
    const { container } = mount(scena, <ButtonBar value={0} />);
    expect(container.querySelector('.oo-button-bar__value')?.textContent).toBe('0');
  });

  it('runs its command with args', async () => {
    const scena = createScena();
    const run = vi.fn();
    scena.commands.register({ id: 'sidebar.activate', title: 'Activate', run });

    mount(scena, <ButtonBar label="Notes" command="sidebar.activate" args={{ section: 'notes' }} />);
    fireEvent.click(screen.getByRole('button'));
    await tick();

    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[1]).toMatchObject({ section: 'notes' });
  });

  it('prefers onClick over command', async () => {
    const scena = createScena();
    const run = vi.fn();
    const onClick = vi.fn();
    scena.commands.register({ id: 'x', title: 'X', run });

    mount(scena, <ButtonBar label="Go" command="x" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    await tick();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
  });

  it('does not act when disabled', async () => {
    const scena = createScena();
    const onClick = vi.fn();
    mount(scena, <ButtonBar label="Go" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button'));
    await tick();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('marks itself non-interactive when it has no action, so CSS can drop the pointer', () => {
    const scena = createScena();
    mount(scena, <ButtonBar label="Just text" />);
    expect(screen.getByRole('button').getAttribute('data-interactive')).toBe('false');
  });

  it('tracks a bound value path reactively', async () => {
    const scena = createScena();
    const path = '$/summary/notes/total' as BindingPath;
    scena.store.set(path, 2);

    const { container } = mount(scena, <ButtonBar label="Notes" valuePath={path} />);
    expect(container.querySelector('.oo-button-bar__value')?.textContent).toBe('2');

    scena.store.set(path, 7);
    await tick();
    expect(container.querySelector('.oo-button-bar__value')?.textContent).toBe('7');
  });

  it('falls back through title → label for the accessible name', () => {
    const scena = createScena();
    const { unmount } = mount(scena, <ButtonBar icon="X" label="Close" />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Close');
    unmount();

    mount(scena, <ButtonBar icon="X" title="Close panel" label="Close" />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Close panel');
  });

  it('reports pressed state', () => {
    const scena = createScena();
    mount(scena, <ButtonBar label="Pinned" active />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('data-active')).toBe('true');
  });
});
