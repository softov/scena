import { describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import { createReactiveStore } from '../../src/core/reactive-store.js';
import { createEventBus } from '../../src/controls/events.js';
import { createYjsBackend } from '../../src/core/backends/yjs-backend.js';
import type { ScopeBackendFactory } from '../../src/types/scope-backend.js';
import type { BindingPath } from '../../src/types/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
function factory(scope: string, doc: Y.Doc): ScopeBackendFactory {
  return { scope, create: () => createYjsBackend(scope, doc) };
}

describe('yjs-backend', () => {
  it('stores values in the Y.Doc and reads them back', () => {
    const doc = new Y.Doc();
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory('page', doc)] });
    store.set(p('$/page/title'), 'Hello');
    expect(store.get(p('$/page/title'))).toBe('Hello');
    expect(doc.getMap('scena').get('title')).toBe('Hello');
  });

  it('syncs across two docs: a remote update notifies local subscribers', async () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    docA.on('update', (u: Uint8Array) => Y.applyUpdate(docB, u));
    docB.on('update', (u: Uint8Array) => Y.applyUpdate(docA, u));

    const storeA = createReactiveStore({ events: createEventBus(), backendFactories: [factory('page', docA)] });
    const storeB = createReactiveStore({ events: createEventBus(), backendFactories: [factory('page', docB)] });

    const subB = vi.fn();
    storeB.subscribe(p('$/page/title'), subB); // attaches B's observer on docB

    storeA.set(p('$/page/title'), 'from A'); // docA -> update -> docB -> observer -> emit
    await tick();

    expect(storeB.get(p('$/page/title'))).toBe('from A');
    expect(subB).toHaveBeenCalledWith('from A');
  });

  it('clearNamespace empties the map', () => {
    const doc = new Y.Doc();
    const store = createReactiveStore({ events: createEventBus(), backendFactories: [factory('page', doc)] });
    store.set(p('$/page/a'), 1);
    store.clearNamespace('page');
    expect(store.get(p('$/page/a'))).toBeUndefined();
    expect(doc.getMap('scena').size).toBe(0);
  });
});
