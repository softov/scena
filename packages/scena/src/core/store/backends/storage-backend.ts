import type { BindingPath } from '../../../sdk/component-graph.js';
import type { ScopeBackend } from '../../../sdk/scope-backend.js';

// Persistence adapter for a storage-backed ScopeBackend. The snapshot is a flat
// record keyed by the segment-joined sub-path (below the scope root).
export interface BackendStorage {
  load(): Record<string, unknown> | null;
  save(data: Record<string, unknown>): void;
}

// localStorage-backed adapter (browser / dev). No-op outside a window.
export function createLocalStorageStorage(key: string): BackendStorage {
  return {
    load() {
      if (typeof window === 'undefined') return null;
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return null;
      }
    },
    save(data) {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, JSON.stringify(data));
    },
  };
}

// A ScopeBackend that persists its scope's values through a BackendStorage.
// Values live in an in-memory snapshot keyed by the segment-joined sub-path;
// writes are coalesced to one save per microtask. attach() hydrates from
// storage and emits each loaded path so live subscribers refresh.
export function createStorageBackend(scope: string, storage: BackendStorage): ScopeBackend {
  const data: Record<string, unknown> = {};
  let saveScheduled = false;

  const key = (segs: string[]) => segs.join('/');
  const abs = (subKey: string) => `$/${scope}/${subKey}` as BindingPath;

  function scheduleSave(): void {
    if (saveScheduled) return;
    saveScheduled = true;
    queueMicrotask(() => {
      saveScheduled = false;
      storage.save({ ...data });
    });
  }

  return {
    get(segs) {
      const k = key(segs);
      return Object.prototype.hasOwnProperty.call(data, k)
        ? { hasValue: true, value: data[k] }
        : { hasValue: false, value: undefined };
    },
    set(segs, value) {
      data[key(segs)] = value;
      scheduleSave();
    },
    delete(segs) {
      delete data[key(segs)];
      scheduleSave();
    },
    clear() {
      for (const k of Object.keys(data)) delete data[k];
      scheduleSave();
    },
    attach(emit) {
      const loaded = storage.load();
      if (loaded) {
        for (const [k, v] of Object.entries(loaded)) {
          data[k] = v;
          emit(abs(k), v);
        }
      }
      return { dispose() {} };
    },
  };
}
