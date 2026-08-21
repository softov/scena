// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReactiveStore } from '../../src/core/store/reactive-store.js';
import { createEventBus } from '../../src/core/controls/events.js';
import { createModusBackend } from '../../src/core/store/backends/modus-backend.js';
import type { ScopeBackendFactory } from '../../src/sdk/scope-backend.js';
import type { BindingPath } from '../../src/sdk/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

// jsdom implements neither matchMedia nor rAF timing we can rely on, so both
// are stubbed. `coarse` drives the pointer query; listeners are captured so a
// test can fire a pointer change without a real device.
let coarse = false;
let pointerListeners: Array<() => void> = [];

function stubEnv(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

function factory(): ScopeBackendFactory {
  return { scope: 'modus', create: () => createModusBackend() };
}

beforeEach(() => {
  coarse = false;
  pointerListeners = [];
  window.matchMedia = ((q: string) => ({
    matches: q.includes('coarse') ? coarse : false,
    media: q,
    addEventListener: (_: string, fn: () => void) => void pointerListeners.push(fn),
    removeEventListener: (_: string, fn: () => void) => {
      pointerListeners = pointerListeners.filter((l) => l !== fn);
    },
  })) as unknown as typeof window.matchMedia;

  // Run rAF callbacks synchronously so a resize settles within the test.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  stubEnv(1280, 800);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('modus-backend', () => {
  it('classifies width into the four size classes', () => {
    const cases: Array<[number, string]> = [
      [360, 'xsmall'],
      [639, 'xsmall'],
      [640, 'small'],
      [1023, 'small'],
      [1024, 'medium'],
      [1439, 'medium'],
      [1440, 'large'],
    ];
    for (const [width, expected] of cases) {
      stubEnv(width, 800);
      const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory()] });
      expect(store.get(p('$/modus/class'))).toBe(expected);
    }
  });

  it('derives compact/large/portrait from the class and dimensions', () => {
    stubEnv(500, 900);
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory()] });
    expect(store.get(p('$/modus/compact'))).toBe(true);
    expect(store.get(p('$/modus/large'))).toBe(false);
    expect(store.get(p('$/modus/portrait'))).toBe(true);
    expect(store.get(p('$/modus/width'))).toBe(500);
    expect(store.get(p('$/modus/height'))).toBe(900);
  });

  it('reports pointer accuracy independently of width', () => {
    coarse = true;
    stubEnv(1600, 900);
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory()] });
    // A large touch screen is still coarse — width must not imply pointer type.
    expect(store.get(p('$/modus/class'))).toBe('large');
    expect(store.get(p('$/modus/coarse'))).toBe(true);
  });

  it('notifies a subscriber when a resize crosses a class boundary', async () => {
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory()] });
    const sub = vi.fn();
    store.subscribe(p('$/modus/class'), sub);
    expect(store.get(p('$/modus/class'))).toBe('medium');

    stubEnv(480, 800);
    window.dispatchEvent(new Event('resize'));
    await tick();

    expect(store.get(p('$/modus/class'))).toBe('xsmall');
    expect(sub).toHaveBeenCalled();
  });

  it('stays quiet when a resize does not change any accessed value', async () => {
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory()] });
    const sub = vi.fn();
    store.subscribe(p('$/modus/class'), sub);
    store.get(p('$/modus/class'));
    sub.mockClear();

    // Still 'medium' — width moved but the class did not, and `width` was
    // never read, so nothing should be emitted.
    stubEnv(1200, 800);
    window.dispatchEvent(new Event('resize'));
    await tick();

    expect(sub).not.toHaveBeenCalled();
  });

  it('is read-only: store writes do not change the reported environment', () => {
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory()] });
    store.set(p('$/modus/class'), 'xsmall');
    expect(store.get(p('$/modus/class'))).toBe('medium');
  });

  it('reports nothing for unknown keys', () => {
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory()] });
    expect(store.get(p('$/modus/nope'))).toBeUndefined();
    expect(store.get(p('$/modus/class/deep'))).toBeUndefined();
  });
});
