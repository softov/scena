// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SurfaceArea } from '../../src/react/SurfaceArea.js';
import { registerBuiltinLayouts } from '../../src/ui/layout/register.js';
import { Tree } from '../../src/ui/data/Tree.js';
import { Listable } from '../../src/ui/data/Listable.js';

// jsdom has no ResizeObserver; Listable measures its width with one.
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Start() {
  return <p>Start here</p>;
}

function Page() {
  return <p>A page</p>;
}

function setup() {
  const scena = createScena();
  registerBuiltinLayouts(scena);
  scena.components.register({ component: 'Start', renderer: { kind: 'react', load: async () => ({ default: Start }) } });
  scena.components.register({ component: 'Page', renderer: { kind: 'react', load: async () => ({ default: Page }) } });
  return scena;
}

/**
 * What a surface shows with nothing open is the app's, never scena's.
 *
 * Every layout printed its own English ("Nothing open.", "Empty group. Drag a
 * tab here."), so an app had no way to show a start page in `main`, and an app
 * in another language showed English.
 */
describe('surfaces.setEmpty', () => {
  it('keeps the newest view and restores the one before on dispose', () => {
    const scena = createScena();
    const first = scena.surfaces.setEmpty('main', { component: 'A' });
    const second = scena.surfaces.setEmpty('main', { component: 'B' });
    expect(scena.surfaces.emptyAt('main')?.component).toBe('B');
    second.dispose();
    expect(scena.surfaces.emptyAt('main')?.component).toBe('A');
    first.dispose();
    expect(scena.surfaces.emptyAt('main')).toBeUndefined();
  });

  it.each(['tab-panel', 'tab', 'single', 'split', 'stack', 'spatial'])(
    'shows the view in an empty %s surface, and nothing of its own without one',
    async (layout) => {
      const scena = setup();
      const { container } = render(
        <ScenaProvider scena={scena}>
          <SurfaceArea surface="main" layout={layout} />
        </ScenaProvider>,
      );
      await act(async () => {});
      expect(container.textContent).not.toMatch(/Nothing open|Empty group/);

      act(() => void scena.surfaces.setEmpty('main', { component: 'Start' }));
      expect(await screen.findByText('Start here')).toBeTruthy();
    },
  );

  it('gives way to the first mount, and comes back when it closes', async () => {
    const scena = setup();
    scena.surfaces.setEmpty('main', { component: 'Start' });
    render(
      <ScenaProvider scena={scena}>
        <SurfaceArea surface="main" layout="tab-panel" />
      </ScenaProvider>,
    );
    expect(await screen.findByText('Start here')).toBeTruthy();

    act(() => void scena.surfaces.open({ surface: 'main', key: 'page', resource: { component: 'Page' } }));
    expect(await screen.findByText('A page')).toBeTruthy();
    expect(screen.queryByText('Start here')).toBeNull();

    act(() => scena.surfaces.close('page'));
    expect(await screen.findByText('Start here')).toBeTruthy();
  });
});

describe('an empty Tree or Listable', () => {
  it('shows nothing of its own', () => {
    const { container } = render(
      <>
        <Tree nodes={[]} />
        <Listable items={[]} columns={[]} getKey={() => ''} />
      </>,
    );
    expect(container.textContent).toBe('');
  });

  it("shows the app's empty state", () => {
    render(<Tree nodes={[]} emptyState="No files" />);
    expect(screen.getByText('No files')).toBeTruthy();
  });
});
