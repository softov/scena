import { describe, it, expect, vi } from 'vitest';
import { createReactiveStore } from '../../src/core/store/reactive-store.js';
import { createEventBus } from '../../src/core/controls/events.js';
import type { BindingPath } from '../../src/sdk/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
function mk() {
  return createReactiveStore({ events: createEventBus() });
}

describe('wildcard subscriptions', () => {
  it('$/a/* fires for one segment, not deeper, not other scope', async () => {
    const store = mk();
    const sub = vi.fn();
    store.subscribe(p('$/a/*'), sub);
    store.set(p('$/a/x'), 1);
    store.set(p('$/a/y'), 2);
    await tick();
    expect(sub).toHaveBeenCalledTimes(2);
    sub.mockClear();
    store.set(p('$/a/x/deep'), 3);
    store.set(p('$/b/x'), 4);
    await tick();
    expect(sub).not.toHaveBeenCalled();
  });

  it('$/a/*/status matches only that field', async () => {
    const store = mk();
    const sub = vi.fn();
    store.subscribe(p('$/a/*/status'), sub);
    store.set(p('$/a/u1/status'), 'on');
    store.set(p('$/a/u1/other'), 'x');
    await tick();
    expect(sub).toHaveBeenCalledTimes(1);
    expect(sub).toHaveBeenCalledWith('on', '$/a/u1/status');
  });

  it('wildcard callback receives (value, path); exact receives (value)', async () => {
    const store = mk();
    const wild = vi.fn();
    const exact = vi.fn();
    store.subscribe(p('$/w/*'), wild as unknown as (v: unknown) => void);
    store.subscribe(p('$/w/k'), exact);
    store.set(p('$/w/k'), 9);
    await tick();
    expect(wild).toHaveBeenCalledWith(9, '$/w/k');
    expect(exact).toHaveBeenCalledWith(9);
  });

  it('dispose removes the wildcard subscription', async () => {
    const store = mk();
    const sub = vi.fn();
    const d = store.subscribe(p('$/z/*'), sub);
    d.dispose();
    expect(store.subscriberCount('z')).toBe(0);
    store.set(p('$/z/a'), 1);
    await tick();
    expect(sub).not.toHaveBeenCalled();
  });
});
