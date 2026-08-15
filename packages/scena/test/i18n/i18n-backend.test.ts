import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReactiveStore } from '../../src/core/reactive-store.js';
import { createEventBus } from '../../src/controls/events.js';
import { createI18nBackend } from '../../src/i18n/i18n-backend.js';
import { registerMessages, setLocale, clearMessages } from '../../src/i18n/registry.js';
import type { BindingPath } from '../../src/types/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
beforeEach(() => clearMessages());

function mk() {
  return createReactiveStore({
    events: createEventBus(),
    backendFactories: [{ scope: 't', create: () => createI18nBackend() }],
  });
}

describe('i18n backend ($/t)', () => {
  it('$/t/<key> resolves the active locale message; missing → undefined', () => {
    registerMessages('en', { setup: { title: 'Set up' } });
    const store = mk();
    expect(store.get(p('$/t/setup/title'))).toBe('Set up');
    expect(store.get(p('$/t/missing'))).toBeUndefined();
  });

  it('locale switch re-emits accessed keys so store subscribers refresh', async () => {
    registerMessages('en', { greet: 'Hello' });
    registerMessages('pt', { greet: 'Olá' });
    const store = mk();
    const sub = vi.fn();
    store.subscribe(p('$/t/greet'), sub); // attaches the backend observer
    store.get(p('$/t/greet')); // marks the key "accessed" (as a render-read would)

    setLocale('pt');
    await tick();

    expect(store.get(p('$/t/greet'))).toBe('Olá');
    expect(sub).toHaveBeenCalledWith('Olá');
  });

  it('registering new messages later refreshes a bound, accessed key', async () => {
    const store = mk();
    const sub = vi.fn();
    store.subscribe(p('$/t/late'), sub);
    store.get(p('$/t/late')); // accessed, currently missing
    registerMessages('en', { late: 'Arrived' });
    await tick();
    expect(store.get(p('$/t/late'))).toBe('Arrived');
    expect(sub).toHaveBeenCalledWith('Arrived');
  });
});
