import type { CSSProperties } from 'react';

// How a tab layout keeps a mount that is not shown.
//
// `display: none` throws a subtree's layout away, so showing the tab again
// lays all of it out anew: about 13,000 objects and 140 ms for a long chat in
// ahpw, at each tab switch, in a trace of 2026-11-21. `content-visibility:
// hidden` skips drawing the subtree but keeps its layout, as Chrome advises for
// tabs, and keeps its scroll position too, which `display: none` loses. The
// hidden mount lies over the shown one, takes no pointer, and is `inert`, so
// it takes no focus and assistive tech skips it, as with `display: none`.
export function mountStyle(shown: boolean, base: CSSProperties): CSSProperties {
  if (shown) return { ...base, display: 'block' };
  return { ...base, position: 'absolute', inset: 0, display: 'block', contentVisibility: 'hidden', pointerEvents: 'none' };
}
