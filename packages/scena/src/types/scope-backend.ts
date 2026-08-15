import type { Disposable } from './disposable.js';
import type { BindingPath } from './component-graph.js';

// A ScopeBackend owns VALUE STORAGE for one scope's subtree (`$/<scope>/...`).
// The store routes value get/set/delete for that scope to the backend; the
// notification layer (subscribe / microtask flush / `scena:store:changed`)
// always stays in the store and is scope-agnostic.
//
// `segments` are the path segments BELOW the scope root (the scope name is
// already stripped). Default scopes use the store's in-memory tree; persistence
// (`$/layout`, `$/workspace`, `$/global`), collaboration (`$/page` via Yjs),
// and socket-fed scopes attach here later WITHOUT changing any caller.
//
// `registerDataProvider` providers are NOT backends — they call `store.set`,
// which routes to whatever backend owns the scope (in-memory by default).
export interface ScopeBackend {
  get(segments: string[]): { hasValue: boolean; value: unknown };
  set(segments: string[], value: unknown): void;
  delete(segments: string[]): void;
  clear(): void;
  // Backends whose values change from the outside (Yjs doc updates, socket
  // pushes) call `emit(absolutePath, value)` so the store can queue + notify.
  // The in-memory default never calls emit (writes flow through `set`).
  attach?(emit: (path: BindingPath, value: unknown) => void): Disposable;
}

export interface ScopeBackendFactory {
  scope: string;
  create(): ScopeBackend;
}
