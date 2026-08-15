import { describe, it, expect } from 'vitest';
import {
  createReactiveStore,
  localPath,
  rewriteLocal,
  clearMountLocal,
} from '../../src/core/reactive-store.js';
import { createEventBus } from '../../src/controls/events.js';
import type { BindingPath } from '../../src/types/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
function mk() {
  return createReactiveStore({ events: createEventBus() });
}

describe('mount-local helpers', () => {
  it('localPath builds the canonical mount-scoped path', () => {
    expect(localPath('m1', 'form/email')).toBe('$/local/m1/form/email');
    expect(localPath('m1', '/form/email')).toBe('$/local/m1/form/email');
  });

  it('rewriteLocal prepends mountKey only for bare $/local (idempotent, scoped)', () => {
    expect(rewriteLocal(p('$/local/form/x'), 'm1')).toBe('$/local/m1/form/x');
    expect(rewriteLocal(p('$/local/m1/form/x'), 'm1')).toBe('$/local/m1/form/x');
    expect(rewriteLocal(p('$/global/x'), 'm1')).toBe('$/global/x');
    expect(rewriteLocal(p('$/local/form/x'), null)).toBe('$/local/form/x');
  });

  it('clearMountLocal deletes only that mount subtree', async () => {
    const store = mk();
    store.set(localPath('m1', 'a'), 1);
    store.set(localPath('m1', 'b/c'), 2);
    store.set(localPath('m2', 'a'), 3);
    await tick();
    clearMountLocal(store, 'm1');
    await tick();
    expect(store.get(localPath('m1', 'a'))).toBeUndefined();
    expect(store.get(localPath('m1', 'b/c'))).toBeUndefined();
    expect(store.get(localPath('m2', 'a'))).toBe(3);
  });
});
