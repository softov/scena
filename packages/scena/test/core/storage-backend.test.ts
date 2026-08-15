import { describe, it, expect, vi } from 'vitest';
import { createReactiveStore } from '../../src/core/reactive-store.js';
import { createEventBus } from '../../src/controls/events.js';
import { createStorageBackend, type BackendStorage } from '../../src/core/backends/storage-backend.js';
import type { ScopeBackendFactory } from '../../src/types/scope-backend.js';
import type { BindingPath } from '../../src/types/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function memStorage(seed: Record<string, unknown> | null = null) {
  let data = seed;
  const storage: BackendStorage = { load: () => data, save: (d) => { data = d; } };
  return { storage, peek: () => data };
}
function factory(scope: string, storage: BackendStorage): ScopeBackendFactory {
  return { scope, create: () => createStorageBackend(scope, storage) };
}

describe('storage-backend', () => {
  it('persists scope values through the adapter (one save per microtask)', async () => {
    const m = memStorage();
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory('ws', m.storage)] });
    store.set(p('$/ws/a'), 1);
    store.set(p('$/ws/b/c'), 2);
    await tick();
    expect(m.peek()).toEqual({ a: 1, 'b/c': 2 });
    expect(store.get(p('$/ws/a'))).toBe(1);
    expect(store.get(p('$/ws/b/c'))).toBe(2);
    // default scope unaffected
    store.set(p('$/mem/x'), 9);
    expect(m.peek()).toEqual({ a: 1, 'b/c': 2 });
  });

  it('hydrates a fresh store from storage on first access', () => {
    const m = memStorage({ a: 1, 'b/c': 2 });
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory('ws', m.storage)] });
    expect(store.get(p('$/ws/a'))).toBe(1);
    expect(store.get(p('$/ws/b/c'))).toBe(2);
  });

  it('hydration emits so a live subscriber refreshes', async () => {
    const m = memStorage({ a: 7 });
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory('ws', m.storage)] });
    const sub = vi.fn();
    store.subscribe(p('$/ws/a'), sub); // ensureBackend -> attach -> hydrate -> emit
    await tick();
    expect(sub).toHaveBeenCalledWith(7);
  });

  it('clearNamespace empties the scope and persists', async () => {
    const m = memStorage();
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory('ws', m.storage)] });
    store.set(p('$/ws/a'), 1);
    await tick();
    store.clearNamespace('ws');
    await tick();
    expect(store.get(p('$/ws/a'))).toBeUndefined();
    expect(m.peek()).toEqual({});
  });
});
