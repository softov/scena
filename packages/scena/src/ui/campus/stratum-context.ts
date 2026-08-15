import { createContext, useContext } from 'react';

// Per-stratum effective zoom, published by CampusStratum and read by
// CampusNodus. A node converts pointer-pixel drag deltas to world pixels by
// dividing by (viewport.scale × stratumZoom); without the stratum factor a
// node inside a statically-scaled layer would drift under the cursor.
// Default 1 means "no extra layer scaling" (the common single-layer case).
export const StratumContext = createContext<number>(1);

export function useStratumZoom(): number {
  return useContext(StratumContext);
}
