// Which windows a scena has open, and which one has focus.
//
// SurfaceWindows opens a browser window for each window surface. It notes
// each one here, and the one the person works in: the overlay surface (a
// palette, a quick open, a dialog) draws there, not in the main page. Null
// means the main page has focus.

import type { Scena } from '../sdk/scena.js';
import type { SurfaceName } from '../sdk/mount-surface.js';
import type { BindingPath } from '../sdk/component-graph.js';
import { useScena } from './ScenaProvider.js';
import { useStore } from './hooks/useStore.js';

// The surface of the window that has focus, or null for the main page.
export const FOCUSED_WINDOW_PATH = '$/focus/window';

const openByScena = new WeakMap<Scena, Map<SurfaceName, Window>>();

// The windows open now: an app that starts listening after a window opened
// (keys, after a reload) reads them here, then follows the events.
export function listSurfaceWindows(scena: Scena): { surface: SurfaceName; window: Window }[] {
  return [...(openByScena.get(scena) ?? new Map<SurfaceName, Window>()).entries()].map(([surface, window]) => ({ surface, window }));
}

// Notes a window open (`win`) or closed (null). A closed window that had the
// focus gives it back to the main page.
export function noteWindow(scena: Scena, surface: SurfaceName, win: Window | null): void {
  let map = openByScena.get(scena);
  if (!map) {
    map = new Map();
    openByScena.set(scena, map);
  }
  if (win) {
    map.set(surface, win);
    return;
  }
  map.delete(surface);
  if (scena.store.get(FOCUSED_WINDOW_PATH as BindingPath) === surface) noteFocus(scena, null);
}

// Notes which window has focus: a window surface, or null for the main page.
export function noteFocus(scena: Scena, surface: SurfaceName | null): void {
  if (scena.store.get(FOCUSED_WINDOW_PATH as BindingPath) === surface) return;
  scena.store.set(FOCUSED_WINDOW_PATH as BindingPath, surface);
}

// The window that has focus, or null while the main page has it.
export function useFocusedWindow(): Window | null {
  const scena = useScena();
  const surface = useStore<string | null>(FOCUSED_WINDOW_PATH as BindingPath);
  if (!surface) return null;
  return openByScena.get(scena)?.get(surface) ?? null;
}
