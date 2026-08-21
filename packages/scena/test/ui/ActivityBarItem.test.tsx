// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { type ReactNode } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { ActivityBarItem } from '../../src/ui/navigation/ActivityBarItem.js';

const SECTION_PATH = '$/layout/surfaces/sidebar:left/section';

function mount(scena: ReturnType<typeof createScena>, node: ReactNode) {
  return render(<ScenaProvider scena={scena}>{node}</ScenaProvider>);
}

// No global setup file configures testing-library's auto-cleanup, so renders
// would otherwise stack up and every getByRole('button') would find several.
afterEach(cleanup);

describe('ActivityBarItem', () => {
  it('is active when its section is the one showing', () => {
    const scena = createScena();
    scena.layout.setSurface('sidebar:left', { section: 'notes', visible: true });

    mount(scena, <ActivityBarItem icon="N" label="Notes" section="notes" />);
    expect(screen.getByRole('button').getAttribute('data-active')).toBe('true');
    expect(screen.getByRole('button').getAttribute('aria-current')).toBe('true');
  });

  it('is not active for a different section', () => {
    const scena = createScena();
    scena.layout.setSurface('sidebar:left', { section: 'tags', visible: true });

    mount(scena, <ActivityBarItem icon="N" label="Notes" section="notes" />);
    expect(screen.getByRole('button').getAttribute('data-active')).toBe('false');
    expect(screen.getByRole('button').getAttribute('aria-current')).toBeNull();
  });

  it('activates its section by command, so independently-mounted entries agree', async () => {
    const scena = createScena();
    const run = vi.fn();
    scena.commands.register({ id: 'sidebar.activate', title: 'Activate', run });

    mount(scena, <ActivityBarItem icon="N" label="Notes" section="notes" />);
    fireEvent.click(screen.getByRole('button'));
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[1]).toMatchObject({ section: 'notes' });
  });

  it('runs `command` as well as activating, when both are given', async () => {
    const scena = createScena();
    const activate = vi.fn();
    const custom = vi.fn();
    scena.commands.register({ id: 'sidebar.activate', title: 'Activate', run: activate });
    scena.commands.register({ id: 'notes.refresh', title: 'Refresh', run: custom });

    mount(scena, <ActivityBarItem section="notes" command="notes.refresh" />);
    fireEvent.click(screen.getByRole('button'));
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(custom).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('onClick wins outright — no command runs behind it', async () => {
    const scena = createScena();
    const activate = vi.fn();
    const onClick = vi.fn();
    scena.commands.register({ id: 'sidebar.activate', title: 'Activate', run: activate });

    mount(scena, <ActivityBarItem section="notes" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(activate).not.toHaveBeenCalled();
  });

  describe('badge', () => {
    // 0 is the case every hand-rolled copy got wrong: a rail full of grey
    // zeroes reads as a fault when it means "nothing to do".
    it('is hidden for 0, undefined and empty string', () => {
      const scena = createScena();
      for (const badge of [0, undefined, ''] as const) {
        const { container, unmount } = mount(
          scena,
          <ActivityBarItem icon="N" badge={badge} />,
        );
        expect(container.querySelector('.oo-activity-item__badge')).toBeNull();
        unmount();
      }
    });

    it('shows a non-zero count, and a non-numeric string', () => {
      const scena = createScena();
      const { container, unmount } = mount(scena, <ActivityBarItem icon="N" badge={3} />);
      expect(container.querySelector('.oo-activity-item__badge')?.textContent).toBe('3');
      unmount();

      const second = mount(scena, <ActivityBarItem icon="N" badge="!" />);
      expect(second.container.querySelector('.oo-activity-item__badge')?.textContent).toBe('!');
    });

    it('names what the number counts, so it is not a bare digit to a screen reader', () => {
      const scena = createScena();
      mount(scena, <ActivityBarItem icon="N" label="Notes" badge={4} badgeLabel="unread" />);
      expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Notes — 4 unread');
    });

    it('carries the tone through to the badge', () => {
      const scena = createScena();
      const { container } = mount(
        scena,
        <ActivityBarItem icon="N" badge={2} badgeTone="danger" />,
      );
      expect(container.querySelector('.oo-activity-item__badge')?.getAttribute('data-tone')).toBe(
        'danger',
      );
    });
  });

  it('reads a different surface when told to', () => {
    const scena = createScena();
    scena.layout.setSurface('sidebar:right', { section: 'inspector', visible: true });

    mount(
      scena,
      <ActivityBarItem
        section="inspector"
        sectionPath={'$/layout/surfaces/sidebar:right/section' as never}
      />,
    );
    expect(screen.getByRole('button').getAttribute('data-active')).toBe('true');
  });

  it('does nothing but render when it has no section and no command', () => {
    const scena = createScena();
    mount(scena, <ActivityBarItem icon="N" label="Inert" />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
    expect(scena.store.get(SECTION_PATH as never)).toBeUndefined();
  });
});
