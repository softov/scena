import { describe, it, expect, vi } from 'vitest';
import { createReactiveStore } from '../../src/core/reactive-store.js';
import { createEventBus } from '../../src/controls/events.js';
import type { ReactiveStore } from '../../src/types/reactive-store.js';
import type { BindingPath } from '../../src/types/component-graph.js';

const p = (s: string) => s as BindingPath;
function mk() {
  return createReactiveStore({ events: createEventBus() });
}

describe('data providers', () => {
  it('lazy: load runs on first get, exactly once', () => {
    const store = mk();
    const load = vi.fn((s: ReactiveStore) => { s.set(p('$/things/a'), 1); });
    store.registerDataProvider({ namespace: 'things', provider: { load } });
    expect(load).not.toHaveBeenCalled();
    store.get(p('$/things/a'));
    expect(load).toHaveBeenCalledTimes(1);
    store.get(p('$/things/b'));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('lazy: load runs on first subscribe', () => {
    const store = mk();
    const load = vi.fn();
    store.registerDataProvider({ namespace: 'subs', provider: { load } });
    store.subscribe(p('$/subs/a'), () => {});
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('eager: load runs at register', () => {
    const store = mk();
    const load = vi.fn();
    store.registerDataProvider({ namespace: 'eager', load: 'eager', provider: { load } });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('dispose calls unload when loaded and removes the provider', () => {
    const store = mk();
    const unload = vi.fn();
    const d = store.registerDataProvider({
      namespace: 'u',
      load: 'eager',
      provider: { load: () => {}, unload },
    });
    expect(store.listDataProviders()).toHaveLength(1);
    d.dispose();
    expect(unload).toHaveBeenCalledTimes(1);
    expect(store.listDataProviders()).toHaveLength(0);
  });
});
