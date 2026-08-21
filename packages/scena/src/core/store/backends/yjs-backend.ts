import type * as Y from 'yjs';
import type { BindingPath } from '../../../sdk/component-graph.js';
import type { Disposable } from '../../../sdk/disposable.js';
import type { ScopeBackend } from '../../../sdk/scope-backend.js';

// ScopeBackend backed by a Yjs Y.Map (flat sub-path key -> value). Stores that
// share a Y.Doc (or synced docs) converge; external Yjs updates push through
// attach()'s observer into the store's notification layer. Intended for $/page
// (Tela collaboration) and node tests.
//
// `yjs` is imported TYPE-ONLY here, so the scena core carries no runtime
// dependency on it — only callers that actually construct a backend (passing a
// Y.Doc) need `yjs` installed.
export function createYjsBackend(
  scope: string,
  doc: Y.Doc,
  mapName = 'scena',
): ScopeBackend {
  const map = doc.getMap(mapName) as Y.Map<unknown>;
  const key = (segs: string[]) => segs.join('/');
  const abs = (k: string) => `$/${scope}/${k}` as BindingPath;

  return {
    get(segs) {
      const k = key(segs);
      return map.has(k)
        ? { hasValue: true, value: map.get(k) }
        : { hasValue: false, value: undefined };
    },
    set(segs, value) {
      map.set(key(segs), value);
    },
    delete(segs) {
      map.delete(key(segs));
    },
    clear() {
      map.clear();
    },
    attach(emit) {
      const observer = (event: Y.YMapEvent<unknown>) => {
        event.changes.keys.forEach((_change, k) => {
          emit(abs(k), map.has(k) ? map.get(k) : undefined);
        });
      };
      map.observe(observer);
      const disposable: Disposable = {
        dispose() {
          map.unobserve(observer);
        },
      };
      return disposable;
    },
  };
}
