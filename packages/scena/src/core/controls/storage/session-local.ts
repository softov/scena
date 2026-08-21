import type { SessionStorage, SessionSnapshot } from '../../../sdk/session.js';

export interface LocalStorageSessionStorageOptions {
  key?: string;
}

// Browser localStorage-backed SessionStorage. Pass to createScena via
// opts.sessionStorage, then drive restore()/enableAutoPersist() from the app
// once components are registered. Falls back to a no-op on environments where
// localStorage is unavailable (e.g., SSR).
export function createLocalStorageSessionStorage(
  opts: LocalStorageSessionStorageOptions = {},
): SessionStorage {
  const key = opts.key ?? 'scena.session';
  const available = typeof localStorage !== 'undefined';

  return {
    async load() {
      if (!available) return null;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as SessionSnapshot;
      } catch {
        return null;
      }
    },
    async save(snapshot) {
      if (!available) return;
      try {
        localStorage.setItem(key, JSON.stringify(snapshot));
      } catch {
        // Quota or permission error — silently drop, matching the layout store.
      }
    },
    async clear() {
      if (!available) return;
      localStorage.removeItem(key);
    },
  };
}
