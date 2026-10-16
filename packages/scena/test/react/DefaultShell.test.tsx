// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { createModusBackend } from '../../src/core/store/backends/modus-backend.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { DefaultShell } from '../../src/react/DefaultShell.js';
import type { PresentationPolicy } from '../../src/core/graph/surface-presentation.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const surfaceCss = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../src/styles/surface.css'), 'utf8');

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

afterEach(cleanup);

const POLICY: PresentationPolicy = {
  'sidebar:left': { xsmall: 'sheet', small: 'floating' },
  'sidebar:right': { xsmall: 'sheet', small: 'floating' },
};

function mk(modus?: string) {
  const scena = createScena({
    // `$/modus/class` is what the policy resolves against. Supplied directly
    // rather than through the real backend so the size class is deterministic
    // instead of depending on jsdom's window size.
    backendFactories: modus === undefined ? [] : [],
  });
  if (modus !== undefined) scena.store.set('$/modus/class', modus);
  return scena;
}

function mount(scena: ReturnType<typeof createScena>, node: ReactNode) {
  return render(<ScenaProvider scena={scena}>{node}</ScenaProvider>);
}

const surfaceEl = (c: HTMLElement, name: string) =>
  c.querySelector<HTMLElement>(`[data-surface="${name}"]`);

describe('DefaultShell', () => {
  describe('presentation policy', () => {
    it('keeps everything docked with no policy, whatever the size class', async () => {
      const scena = mk('xsmall');
      await tick();
      const { container } = mount(scena, <DefaultShell />);

      // No policy means no opinion, which is what this shell did before it read
      // one at all -- adopting the hook must not change behaviour by itself.
      expect(surfaceEl(container, 'sidebar:left')?.getAttribute('data-presentation')).toBe('docked');
      expect(container.querySelector('.oo-surface-scrim')).toBeNull();
    });

    it('lifts a surface over `main` once the policy says so', async () => {
      const scena = mk('small');
      await tick();
      const { container } = mount(scena, <DefaultShell presentation={POLICY} />);

      expect(surfaceEl(container, 'sidebar:left')?.getAttribute('data-presentation')).toBe(
        'floating',
      );
    });

    it('stops reserving width for a surface that no longer takes any', async () => {
      const scena = mk('small');
      await tick();
      const { container } = mount(scena, <DefaultShell presentation={POLICY} />);

      // The bug this guards: a floating drawer over a `main` that is still
      // short by the drawer's width, leaving a dead column beside it.
      expect(surfaceEl(container, 'sidebar:left')?.style.width).toBe('');
    });

    it('still reserves width while docked', async () => {
      const scena = mk('large');
      await tick();
      const { container } = mount(scena, <DefaultShell presentation={POLICY} />);

      expect(surfaceEl(container, 'sidebar:left')?.style.width).toBe('240px');
    });
  });

  describe('the scrim', () => {
    it('appears only when something is actually lifted', async () => {
      const wide = mk('large');
      await tick();
      const a = mount(wide, <DefaultShell presentation={POLICY} />);
      expect(a.container.querySelector('.oo-surface-scrim')).toBeNull();
      cleanup();

      const narrow = mk('small');
      await tick();
      const b = mount(narrow, <DefaultShell presentation={POLICY} />);
      expect(b.container.querySelector('.oo-surface-scrim')).not.toBeNull();
    });

    it('is a button, so "tap beside it to close" is true without a pointer', async () => {
      const scena = mk('small');
      await tick();
      const { container } = mount(scena, <DefaultShell presentation={POLICY} />);

      const scrim = container.querySelector('.oo-surface-scrim');
      expect(scrim?.tagName).toBe('BUTTON');
      expect(scrim?.getAttribute('aria-label')).toBe('Close');
    });

    it('closes one lifted surface per click, the top one first, and nothing else', async () => {
      const scena = mk('small');
      scena.layout.setSurface('sidebar:right', { visible: true });
      await tick();
      const { container } = mount(scena, <DefaultShell presentation={POLICY} />);

      // The right sidebar is drawn over the left one, so it goes first.
      fireEvent.click(container.querySelector('.oo-surface-scrim')!);
      await tick();
      expect(scena.layout.get().surfaces['sidebar:right']?.visible).toBe(false);
      expect(scena.layout.get().surfaces['sidebar:left']?.visible).not.toBe(false);

      fireEvent.click(container.querySelector('.oo-surface-scrim')!);
      await tick();
      expect(scena.layout.get().surfaces['sidebar:left']?.visible).toBe(false);
      expect(container.querySelector('.oo-surface-scrim')).toBeNull();
      // `main` and the bars are never lifted, so the scrim must not touch them.
      expect(scena.layout.get().surfaces.main?.visible).toBe(true);
      expect(scena.layout.get().surfaces.statusbar?.visible).toBe(true);
    });

    it('is inert and unfocusable when dismissOnScrim is false', async () => {
      const scena = mk('small');
      await tick();
      const { container } = mount(
        scena,
        <DefaultShell presentation={POLICY} dismissOnScrim={false} />,
      );

      const scrim = container.querySelector('.oo-surface-scrim');
      expect(scrim).not.toBeNull();
      // A focusable control that does nothing is worse than none.
      expect(scrim?.tagName).toBe('DIV');
    });
  });

  describe('a rail pinned to the bottom as a bar', () => {
    // jsdom does no layout, so the rule itself is what can be checked.
    it('takes its edge: the body leaves room, and overlaid surfaces end above it', () => {
      const room = /\.oo-shell__body:has\(> \.oo-surface\[data-presentation='bar'\]\) \{\s*padding-bottom: var\(--oo-surface-bar-size\);/;
      expect(surfaceCss).toMatch(room);
      expect(surfaceCss).toMatch(/\[data-presentation='sheet'\] \{\s*bottom: var\(--oo-surface-bar-size\);/);
      expect(surfaceCss).toMatch(/max-height: calc\(100% - var\(--oo-surface-bar-size\)\);/);
    });
  });

  describe('resize', () => {
    it('resizes by each surface own edge rather than by a splitter', async () => {
      const scena = mk('large');
      scena.layout.setSurface('panel:bottom', { visible: true });
      await tick();
      const { container } = mount(scena, <DefaultShell presentation={POLICY} />);

      // `data-resize` is emitted by the surface's own resize binding. A
      // ShellSplitter would instead be a separate element between surfaces.
      expect(surfaceEl(container, 'sidebar:left')?.getAttribute('data-resize')).toBe('right');
      expect(surfaceEl(container, 'sidebar:right')).toBeNull(); // hidden by default
      expect(surfaceEl(container, 'panel:bottom')?.getAttribute('data-resize')).toBe('top');
    });

    it('stands down when the surface is no longer docked', async () => {
      const scena = mk('small');
      await tick();
      const { container } = mount(scena, <DefaultShell presentation={POLICY} />);

      // Nothing to drag against once it floats, so the binding disables itself.
      expect(surfaceEl(container, 'sidebar:left')?.hasAttribute('data-resize')).toBe(false);
    });
  });
});

// Kept out of the describe blocks: this is about the modus backend being
// optional, not about the shell's own behaviour.
describe('DefaultShell without a modus backend', () => {
  it('treats the missing size class as `large` and stays docked', async () => {
    const scena = createScena();
    await tick();
    const { container } = mount(scena, <DefaultShell presentation={POLICY} />);

    expect(surfaceEl(container, 'sidebar:left')?.getAttribute('data-presentation')).toBe('docked');
  });

  it('resolves against the real backend when one is registered', async () => {
    const scena = createScena({
      backendFactories: [{ scope: 'modus', create: () => createModusBackend() }],
    });
    await tick();
    // jsdom's default window is 1024x768, so this only asserts the wiring
    // produces *a* class, not which one.
    expect(typeof scena.store.get('$/modus/class')).toBe('string');
  });
});
