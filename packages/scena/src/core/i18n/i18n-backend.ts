import type { BindingPath } from '../../sdk/component-graph.js';
import type { ScopeBackend } from '../../sdk/scope-backend.js';
import { resolveMessage, subscribeI18n } from './registry.js';

// A ScopeBackend that makes `$/t/<key>` resolve to the active locale's message
// from the i18n registry — your `$translate -> $i18n/<locale>` alias, realized
// through the backend seam. Read-only (translations are registered via
// registerMessages, not store writes). No dictionary is copied into the store
// tree; values resolve on read.
//
// On any registry change (locale switch OR new messages), the backend re-emits
// the keys that have actually been READ (bound somewhere) so their store
// subscribers refresh — bounded to live keys, not the whole dictionary.
export function createI18nBackend(scope = 't'): ScopeBackend {
  const accessed = new Set<string>();
  const keyOf = (segs: string[]) => segs.join('/');

  return {
    get(segs) {
      const key = keyOf(segs);
      accessed.add(key);
      const v = resolveMessage(key);
      return v === undefined ? { hasValue: false, value: undefined } : { hasValue: true, value: v };
    },
    set() {
      /* translations are read-only via the store; use registerMessages */
    },
    delete() {},
    clear() {},
    attach(emit) {
      const unsub = subscribeI18n(() => {
        for (const key of accessed) {
          emit(`$/${scope}/${key}` as BindingPath, resolveMessage(key));
        }
      });
      return { dispose: unsub };
    },
  };
}
