import type { LayoutStorage, ScenaLayout } from '../../../sdk/layout.js';

export interface LocalStorageLayoutStorageOptions {
  key?: string;
}

// Browser localStorage-backed LayoutStorage. Pass to createScena
// via opts.layoutStorage. Falls back to a no-op store on environments
// where localStorage is unavailable (e.g., SSR).
export function createLocalStorageLayoutStorage(
  opts: LocalStorageLayoutStorageOptions = {},
): LayoutStorage {
  const key = opts.key ?? 'scena.layout';
  const available = typeof localStorage !== 'undefined';

  return {
    async load() {
      if (!available) return null;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as ScenaLayout;
      } catch {
        return null;
      }
    },
    async save(layout) {
      if (!available) return;
      try {
        localStorage.setItem(key, JSON.stringify(layout));
      } catch {
        // Quota or permission error — silently drop. Step 5 doesn't surface this;
        // an alerter / metrics hook can be added later.
      }
    },
    async clear() {
      if (!available) return;
      localStorage.removeItem(key);
    },
  };
}

export function createNoopLayoutStorage(): LayoutStorage {
  return {
    async load() {
      return null;
    },
    async save() {},
    async clear() {},
  };
}
