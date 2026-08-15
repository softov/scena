import { describe, it, expect, vi } from 'vitest';
import { createReactiveStore } from '../../src/core/reactive-store.js';
import { createEventBus } from '../../src/controls/events.js';
import type { ScopeBackend } from '../../src/types/scope-backend.js';
import type { BindingPath } from '../../src/types/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe('scope backends', () => {
  it('routes value get/set/delete to a registered backend; default scopes stay in-memory', async () => {
    const map = new Map<string, unknown>();
    const key = (s: string[]) => s.join('/');
    let emit: ((path: BindingPath, value: unknown) => void) | undefined;
    const backend: ScopeBackend = {
      get: (s) => (map.has(key(s)) ? { hasValue: true, value: map.get(key(s)) } : { hasValue: false, value: undefined }),
      set: (s, v) => void map.set(key(s), v),
      delete: (s) => void map.delete(key(s)),
      clear: () => map.clear(),
      attach: (e) => { emit = e; return { dispose() {} }; },
    };

    const store = createReactiveStore({
      events: createEventBus(),
      backendFactories: [{ scope: 'fake', create: () => backend }],
    });

    store.set(p('$/fake/x'), 7);
    expect(map.get('x')).toBe(7);
    expect(store.get(p('$/fake/x'))).toBe(7);

    // default scope still uses the in-memory tree
    store.set(p('$/mem/y'), 9);
    expect(store.get(p('$/mem/y'))).toBe(9);
    expect(map.has('y')).toBe(false);

    // external (backend-pushed) change notifies through the store
    const sub = vi.fn();
    store.subscribe(p('$/fake/z'), sub);
    map.set('z', 42);
    emit!(p('$/fake/z'), 42);
    await tick();
    expect(sub).toHaveBeenCalledWith(42);

    store.delete(p('$/fake/x'));
    expect(map.has('x')).toBe(false);
  });
});
