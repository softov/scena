// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
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
});
