import { describe, it, expect, vi } from 'vitest';
import { createReactiveStore } from '../../src/core/store/reactive-store.js';
import { createEventBus } from '../../src/core/controls/events.js';
import type { BindingPath } from '../../src/sdk/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
function mk() {
  const events = createEventBus();
  const store = createReactiveStore({ events });
  return { events, store };
}

describe('reactive-store basics', () => {
  it('set/get round-trip', () => {
    const { store } = mk();
    store.set(p('$/a/b'), 1);
    expect(store.get(p('$/a/b'))).toBe(1);
    expect(store.get(p('$/a/c'))).toBeUndefined();
  });

  it('get is flat — does NOT descend into stored objects', () => {
    const { store } = mk();
    store.set(p('$/a'), { b: 2 });
    expect(store.get(p('$/a/b'))).toBeUndefined();
    expect(store.get(p('$/a'))).toEqual({ b: 2 });
  });

  it('batches N writes to one path into one notification + one event', async () => {
    const { store, events } = mk();
    const sub = vi.fn();
    const evt = vi.fn();
    store.subscribe(p('$/a/x'), sub);
    events.on('scena:store:changed', evt);
    store.set(p('$/a/x'), 1);
    store.set(p('$/a/x'), 2);
    store.set(p('$/a/x'), 3);
    await tick();
    expect(sub).toHaveBeenCalledTimes(1);
    expect(sub).toHaveBeenCalledWith(3);
    expect(evt).toHaveBeenCalledTimes(1);
    expect(evt).toHaveBeenCalledWith({ path: '$/a/x', value: 3, previous: undefined });
  });

  it('Object.is dedupe: identical value → no emission; NaN dedupes', async () => {
    const { store } = mk();
    store.set(p('$/d/x'), 5);
    await tick();
    const sub = vi.fn();
    store.subscribe(p('$/d/x'), sub);
    store.set(p('$/d/x'), 5);
    await tick();
    expect(sub).not.toHaveBeenCalled();

    store.set(p('$/d/nan'), NaN);
    await tick();
    const nanSub = vi.fn();
    store.subscribe(p('$/d/nan'), nanSub);
    store.set(p('$/d/nan'), NaN);
    await tick();
    expect(nanSub).not.toHaveBeenCalled();
  });

  it('subscriber error is caught + logged; other subscribers still fire', async () => {
    const { store } = mk();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const good = vi.fn();
    store.subscribe(p('$/e/x'), () => { throw new Error('boom'); });
    store.subscribe(p('$/e/x'), good);
    store.set(p('$/e/x'), 1);
    await tick();
    expect(good).toHaveBeenCalledWith(1);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('patch merges shallow', () => {
    const { store } = mk();
    store.set(p('$/f/o'), { a: 1 });
    store.patch(p('$/f/o'), { b: 2 });
    expect(store.get(p('$/f/o'))).toEqual({ a: 1, b: 2 });
  });

  it('patchMany sets many in one flush', async () => {
    const { store, events } = mk();
    const evt = vi.fn();
    events.on('scena:store:changed', evt);
    store.patchMany({ '$/m/a': 1, '$/m/b': 2 });
    await tick();
    expect(store.get(p('$/m/a'))).toBe(1);
    expect(store.get(p('$/m/b'))).toBe(2);
    expect(evt).toHaveBeenCalledTimes(2);
  });

  it('delete removes value and notifies with undefined', async () => {
    const { store } = mk();
    store.set(p('$/g/x'), 1);
    await tick();
    const sub = vi.fn();
    store.subscribe(p('$/g/x'), sub);
    store.delete(p('$/g/x'));
    await tick();
    expect(store.get(p('$/g/x'))).toBeUndefined();
    expect(sub).toHaveBeenCalledWith(undefined);
  });

  it('clearNamespace clears only that scope, notifies per cleared key, resets provider load', async () => {
    const { store } = mk();
    store.set(p('$/users/a'), 1);
    store.set(p('$/users/b'), 2);
    store.set(p('$/teams/a'), 3);
    await tick();
    const ua = vi.fn();
    store.subscribe(p('$/users/a'), ua);
    store.clearNamespace('users');
    await tick();
    expect(store.get(p('$/users/a'))).toBeUndefined();
    expect(store.get(p('$/users/b'))).toBeUndefined();
    expect(store.get(p('$/teams/a'))).toBe(3);
    expect(ua).toHaveBeenCalledWith(undefined);
  });

  it('exact-path-only: writing ancestor/child does not fire a path subscriber', async () => {
    const { store } = mk();
    const sub = vi.fn();
    store.subscribe(p('$/a/b'), sub);
    store.set(p('$/a'), 1);
    store.set(p('$/a/b/c'), 2);
    await tick();
    expect(sub).not.toHaveBeenCalled();
  });

  it('container write fires sub-path subscribers (readPath bindings stay reactive)', async () => {
    const { store } = mk();
    const name = vi.fn();
    // A sub-path binding (e.g. a tab title at `$/s/x/name`, resolved via readPath
    // by descending into the object stored at `$/s/x`).
    store.subscribe(p('$/s/x/name'), name);
    store.set(p('$/s/x'), { name: 'A' });
    await tick();
    expect(name).toHaveBeenCalledTimes(1); // object replaced → descendant re-fires
    store.set(p('$/s/x'), { name: 'B' });
    await tick();
    expect(name).toHaveBeenCalledTimes(2);
  });

  it('primitive write does NOT fan out to sub-path subscribers', async () => {
    const { store } = mk();
    const name = vi.fn();
    store.subscribe(p('$/s/x/name'), name);
    store.set(p('$/s/x'), 7); // primitive — no descendant can resolve into it
    await tick();
    expect(name).not.toHaveBeenCalled();
  });

  it('subscriberCount counts exact subs under a scope; dispose decrements', () => {
    const { store } = mk();
    const d1 = store.subscribe(p('$/s/a'), () => {});
    store.subscribe(p('$/s/b/c'), () => {});
    store.subscribe(p('$/other/a'), () => {});
    expect(store.subscriberCount('s')).toBe(2);
    d1.dispose();
    expect(store.subscriberCount('s')).toBe(1);
  });
});
