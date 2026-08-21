import { useMemo, useSyncExternalStore } from 'react';
import type { BindingPath } from '../../sdk/component-graph.js';
import { useScena } from '../ScenaProvider.js';
import { useCurrentMountKey, useDataContext } from '../mount-context.js';
import { rewriteLocal } from '../../core/store/reactive-store.js';
import { joinAbsolute, readPath } from '../../core/resolve/path-resolver.js';

function resolveForRead(
  path: BindingPath,
  mountKey: string | null,
  dataContext: BindingPath | undefined,
): BindingPath {
  if (path.startsWith('/') && !path.startsWith('$/')) {
    return joinAbsolute(dataContext, path);
  }
  return rewriteLocal(path, mountKey);
}

export function useStore<T = unknown>(
  path: BindingPath | undefined,
  // Override the data context for resolving relative (`/…`) paths. Used by
  // layouts that render a mount's title outside its ViewMount provider (the tab
  // strip), passing the mount's own dataContext so `/name` resolves correctly.
  dataContextOverride?: BindingPath,
): T | undefined {
  const scena = useScena();
  const mountKey = useCurrentMountKey();
  const providerContext = useDataContext();
  const dataContext = dataContextOverride ?? providerContext;

  // Resolve to `null` when the caller passes no path. Hooks below must still
  // run (rules of hooks) — they just become no-ops via the null guard so
  // consumers can do `useStore(cond ? path : undefined)` safely.
  const resolved = useMemo<BindingPath | null>(
    () => (path === undefined ? null : resolveForRead(path, mountKey, dataContext)),
    [path, mountKey, dataContext],
  );

  return useSyncExternalStore<T | undefined>(
    (onChange) => {
      if (resolved === null) return () => undefined;
      const sub = scena.store.subscribe(resolved, () => onChange());
      return () => sub.dispose();
    },
    () => (resolved === null ? undefined : (readPath(scena.store, undefined, resolved) as T | undefined)),
    () => undefined,
  );
}

export function useStoreSetter(): (path: BindingPath, value: unknown) => void {
  const scena = useScena();
  const mountKey = useCurrentMountKey();
  const dataContext = useDataContext();
  return (path, value) => {
    const resolved = resolveForRead(path, mountKey, dataContext);
    scena.store.set(resolved, value);
  };
}
