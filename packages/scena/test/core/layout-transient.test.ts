import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReactiveStore } from '../../src/core/store/reactive-store.js';
import { createEventBus } from '../../src/core/controls/events.js';
import { createLayoutAPI } from '../../src/core/controls/layout.js';
import type { BindingPath } from '../../src/sdk/component-graph.js';
import type { LayoutStorage, ScenaLayout } from '../../src/sdk/layout.js';

const SIZE = '$/layout/surfaces/sidebar:left/size' as BindingPath;

function recordingStorage(): LayoutStorage & { saves: ScenaLayout[] } {
  const saves: ScenaLayout[] = [];
  return {
    saves,
    async load() {
      return null;
    },
    async save(layout) {
      saves.push(layout);
    },
    async clear() {},
  };
}

function mk(storage?: LayoutStorage) {
  const events = createEventBus();
  const store = createReactiveStore({ events });
  const layout = createLayoutAPI({ events, store, ...(storage ? { storage } : {}) });
  return { events, store, layout };
}

describe('layout: transient surface writes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves the surface but does not mirror to the store mid-gesture', () => {
    const { store, layout } = mk();
    layout.setSurface('sidebar:left', { size: 240 });
    expect(store.get(SIZE)).toBe(240);

    layout.setSurface('sidebar:left', { size: 300 }, { transient: true });

    // The authoritative state moved, so a shell rendering from `layout.get()`
    // follows the pointer.
    expect(layout.get().surfaces['sidebar:left']?.size).toBe(300);
    // The store did not, so nothing bound to a layout path re-renders per frame.
    expect(store.get(SIZE)).toBe(240);
  });

  it('still notifies subscribers, because that is what paints the frame', () => {
    const { layout } = mk();
    const seen: number[] = [];
    layout.subscribe((next) => {
      seen.push(next.surfaces['sidebar:left']?.size ?? 0);
    });

    layout.setSurface('sidebar:left', { size: 260 }, { transient: true });
    layout.setSurface('sidebar:left', { size: 280 }, { transient: true });

    expect(seen).toEqual([260, 280]);
  });

  it('the settled write commits what the gesture ended on', () => {
    const { store, layout } = mk();
    layout.setSurface('sidebar:left', { size: 300 }, { transient: true });
    layout.setSurface('sidebar:left', { size: 360 }, { transient: true });
    layout.setSurface('sidebar:left', { size: 360 });

    expect(store.get(SIZE)).toBe(360);
  });

  it('does not persist during the gesture, and persists once after it', async () => {
    const storage = recordingStorage();
    const { layout } = mk(storage);
    storage.saves.length = 0;

    for (let size = 240; size <= 300; size += 5) {
      layout.setSurface('sidebar:left', { size }, { transient: true });
    }
    await vi.advanceTimersByTimeAsync(500);
    expect(storage.saves).toHaveLength(0);

    layout.setSurface('sidebar:left', { size: 300 });
    await vi.advanceTimersByTimeAsync(500);

    expect(storage.saves).toHaveLength(1);
    expect(storage.saves[0]?.surfaces['sidebar:left']?.size).toBe(300);
  });

  it('coalesces a burst of settled writes into one save', async () => {
    const storage = recordingStorage();
    const { layout } = mk(storage);
    storage.saves.length = 0;

    layout.setSurface('sidebar:left', { size: 250 });
    layout.setSurface('sidebar:left', { size: 260 });
    layout.setSurface('sidebar:left', { size: 270 });
    await vi.advanceTimersByTimeAsync(500);

    // The last value of the burst is the only one anybody wanted written.
    expect(storage.saves).toHaveLength(1);
    expect(storage.saves[0]?.surfaces['sidebar:left']?.size).toBe(270);
  });
});

// Real timers here: store change announcements are queued and flushed, so
// these have to be observed after a tick rather than synchronously.
describe('layout: store mirroring', () => {
  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  it('does not announce a path it is writing the same value to', async () => {
    const { store, layout } = mk();
    layout.setSurface('sidebar:left', { size: 240 });
    await tick();

    let announced = 0;
    store.subscribe(SIZE, () => {
      announced += 1;
    });

    // A different surface. Mirroring used to walk every surface and re-set every
    // path, so this woke subscribers on paths nothing had touched.
    layout.setSurface('panel:bottom', { size: 199 });
    layout.setSurface('sidebar:left', { size: 240 });
    await tick();

    expect(announced).toBe(0);
  });

  it('announces a path whose value actually changed', async () => {
    const { store, layout } = mk();
    layout.setSurface('sidebar:left', { size: 240 });
    await tick();

    let announced = 0;
    store.subscribe(SIZE, () => {
      announced += 1;
    });

    layout.setSurface('sidebar:left', { size: 241 });
    await tick();

    expect(announced).toBe(1);
    expect(store.get(SIZE)).toBe(241);
  });
});
