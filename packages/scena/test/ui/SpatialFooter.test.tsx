// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SpatialLayout } from '../../src/ui/layout/SpatialLayout.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function footer(props: Record<string, unknown> | undefined) {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  const mounts = [{ key: 'session:new', surface: 'main', component: { component: 'A' }, props, policy: {}, openedAt: 1 }];
  const { container } = render(
    <ScenaProvider scena={createScena()}>
      <SpatialLayout
        surface="main"
        mounts={mounts as never}
        state={{ visible: true, spatial: { selectedKey: 'session:new' } } as never}
        setState={() => {}}
        renderMount={() => null}
        onActivate={() => {}}
        onClose={() => {}}
        onReorder={() => {}}
      />
    </ScenaProvider>,
  );
  return container.querySelector('.oo-spatial-footer span')?.textContent;
}

describe('the spatial selection footer', () => {
  it("names the selected card by its title, as the card's header does", () => {
    expect(footer({ title: 'New session' })).toBe('New session');
  });

  it('falls back to the key when the card has no title', () => {
    expect(footer(undefined)).toBe('session:new');
  });
});
