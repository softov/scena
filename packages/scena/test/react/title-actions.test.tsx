// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SurfaceArea } from '../../src/react/SurfaceArea.js';
import { registerBuiltinLayouts } from '../../src/ui/layout/register.js';
import { FOCUSED_MOUNT_PATH } from '../../src/sdk/mount-surface.js';

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

// A tab title action decided by app state that follows focus, as the
// playground's "Open with" actions are.
async function setup() {
  const scena = createScena();
  registerBuiltinLayouts(scena);
  scena.components.register({ component: 'Page', renderer: { kind: 'react', load: async () => ({ default: () => <div>a page</div> }) } });
  scena.commands.register({ id: 'preview', title: 'Preview', slots: ['view/title'], when: '$/resource/kind == "file"', run: () => {} });
  scena.layout.setSurface('main', {
    visible: true,
    layout: 'tab-panel',
    tabPanel: {
      tree: {
        kind: 'split',
        direction: 'row',
        ratio: 0.5,
        first: { kind: 'leaf', id: 'g1', tabs: ['file:a'], activeKey: 'file:a' },
        second: { kind: 'leaf', id: 'g2', tabs: ['file:b'], activeKey: 'file:b' },
      },
    },
  });
  scena.layout.setSurface('sidebar:right', { visible: true, layout: 'tab' });
  for (const [surface, key] of [['main', 'file:a'], ['main', 'file:b'], ['sidebar:right', 'other']] as const) {
    scena.surfaces.open({ surface, key, resource: { component: 'Page' }, props: { title: key } });
  }
  scena.store.set('$/resource/kind', 'file');
  const { container } = render(
    <ScenaProvider scena={scena}>
      <SurfaceArea surface="main" role="main" />
      <SurfaceArea surface="sidebar:right" role="panel" />
    </ScenaProvider>,
  );
  await waitFor(() => expect(container.textContent).toContain('a page'));
  const inGroup = (leaf: string) => container.querySelector(`[data-leaf-id="${leaf}"]`)?.textContent ?? '';
  const inSurface = (surface: string) => container.querySelector(`[data-surface="${surface}"]`)?.textContent ?? '';
  return { scena, inGroup, inSurface, container };
}

describe('tab title actions follow focus', () => {
  it('records the focused mount, and forgets it when it closes', async () => {
    const { scena } = await setup();
    act(() => scena.surfaces.focus('other'));
    expect(scena.store.get(FOCUSED_MOUNT_PATH)).toBe('other');
    act(() => scena.surfaces.move({ key: 'other', toSurface: 'main' }));
    expect(scena.store.get(FOCUSED_MOUNT_PATH)).toBe('other');
    act(() => scena.surfaces.close('other'));
    expect(scena.store.get(FOCUSED_MOUNT_PATH)).toBeNull();
  });

  it('draws them only on the strip whose active tab has focus', async () => {
    const { scena, inGroup, inSurface } = await setup();
    act(() => scena.surfaces.focus('file:b'));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Preview/ })).toHaveLength(1));
    expect(inSurface('sidebar:right')).not.toContain('Preview');
    expect(inGroup('g2')).toContain('Preview');
    expect(inGroup('g1')).not.toContain('Preview');

    act(() => scena.surfaces.focus('other'));
    await waitFor(() => expect(inSurface('sidebar:right')).toContain('Preview'));
    expect(inSurface('main')).not.toContain('Preview');
  });
});
