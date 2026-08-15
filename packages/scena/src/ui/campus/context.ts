import { createContext, useContext } from 'react';
import type { MutableRefObject } from 'react';
import type { CampusViewport } from './types.js';

// Shared state CampusView publishes to its descendants.
//
// The live viewport is NOT a reactive value here — it's a stable ref plus a
// subscribe function (a tiny external store). This is deliberate: pan/zoom
// fires every animation frame, and if the viewport were reactive context,
// every CampusNodus would re-render (and re-run its node body) on every
// frame. Instead:
//   - CampusNodus reads `viewportRef.current.scale` only inside its pointer
//     handlers (drag math), so it never re-renders on pan/zoom.
//   - CampusMappa / CampusGrid, which must redraw as the viewport moves,
//     subscribe via `subscribeViewport` (useSyncExternalStore) so ONLY they
//     re-render — not the node subtree.
export interface CampusContextValue {
  // Live viewport. Identity-stable; `.current` is replaced on each commit.
  viewportRef: MutableRefObject<CampusViewport>;
  // Subscribe to viewport commits. Returns an unsubscribe fn. Stable identity
  // (safe as a useSyncExternalStore `subscribe` argument).
  subscribeViewport(listener: () => void): () => void;
  // Live container size in screen pixels. Updated via ResizeObserver in
  // CampusView so descendants don't each have to remeasure.
  container: { w: number; h: number };
  // World extent. ±maxDepth on both axes; Infinity means unbounded.
  maxDepth: number;
}

export const CampusContext = createContext<CampusContextValue | null>(null);

// Throws if used outside <CampusView>. Components that absolutely depend on
// CampusContext (CampusNodus, CampusMappa) should call this so misuse fails
// loud at mount instead of silently picking up defaults.
export function useCampus(): CampusContextValue {
  const ctx = useContext(CampusContext);
  if (!ctx) {
    throw new Error('useCampus() must be used inside <CampusView>');
  }
  return ctx;
}
