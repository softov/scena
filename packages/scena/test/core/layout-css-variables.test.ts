// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createReactiveStore } from '../../src/core/store/reactive-store.js';
import { createEventBus } from '../../src/core/controls/events.js';
import { createLayoutAPI } from '../../src/core/controls/layout.js';

const size = () => document.documentElement.style.getPropertyValue('--oo-sidebar-left-size');

describe('layout: the CSS variables on <html>', () => {
  it('stay put through a drag, and take the size it ended on', () => {
    const events = createEventBus();
    const layout = createLayoutAPI({ events, store: createReactiveStore({ events }) });
    layout.setSurface('sidebar:left', { size: 240 });
    expect(size()).toBe('240px');

    // Each frame of a drag would restyle the whole page through them.
    layout.setSurface('sidebar:left', { size: 300 }, { transient: true });
    layout.setSurface('sidebar:left', { size: 320 }, { transient: true });
    expect(size()).toBe('240px');

    layout.setSurface('sidebar:left', { size: 320 });
    expect(size()).toBe('320px');
  });

  it('are not written again with the value they hold, as a tab click would', () => {
    const events = createEventBus();
    const layout = createLayoutAPI({ events, store: createReactiveStore({ events }) });
    layout.setSurface('sidebar:right', { visible: true, size: 280 });
    const set = vi.spyOn(document.documentElement.style, 'setProperty');

    layout.setSurface('sidebar:right', { activeContainerKey: 'a' });
    expect(set).not.toHaveBeenCalled();

    layout.setSurface('sidebar:right', { size: 300 });
    expect(set).toHaveBeenCalledWith('--oo-sidebar-right-size', '300px');
    set.mockRestore();
  });
});
