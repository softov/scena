// Opens a tab in a new browser window.
//
// The window is a new `window:<n>` surface with the `tab-panel` layout and
// the place and size in `bounds`; SurfaceWindows opens the browser window for
// it. The mount moves there first, then the source loses the key from its
// tab-panel tree, then the new surface's state is written: the order of
// ui/layout/move-tab.ts, for the same reason.

import type { Scena } from '../sdk/scena.js';
import type { ResolvedMount, SurfaceName } from '../sdk/mount-surface.js';
import { canMoveTo } from '../sdk/tab-drag.js';
import { makeLeaf, removeTab } from '../sdk/tab-panel.js';
import { newWindowSurface, type WindowBounds } from '../sdk/window-surface.js';

export const NEW_WINDOW_SIZE = { width: 800, height: 600 } as const;

function findMount(scena: Scena, key: string): ResolvedMount | undefined {
  for (const surface of scena.surfaces.listSurfaces()) {
    const found = scena.surfaces.listAt(surface).find((m) => m.key === key);
    if (found) return found;
  }
  return undefined;
}

// The new surface's name, or null when the mount is gone or may not move.
export function openTabWindow(scena: Scena, key: string, bounds: WindowBounds): SurfaceName | null {
  const mount = findMount(scena, key);
  if (!mount) return null;
  const surface = newWindowSurface(scena.layout.get());
  if (!canMoveTo(mount, surface)) return null;

  const from = mount.surface;
  scena.surfaces.move({ key, toSurface: surface, fromSurface: from });
  const sourceTree = scena.layout.get().surfaces[from]?.tabPanel?.tree;
  if (sourceTree) {
    scena.layout.setSurface(from, { tabPanel: { tree: removeTab(sourceTree, key) ?? makeLeaf([]) } });
  }
  scena.layout.setSurface(surface, {
    visible: true,
    layout: 'tab-panel',
    window: bounds,
    tabPanel: { tree: makeLeaf([key], key) },
  });
  scena.surfaces.focus(key);
  return surface;
}

// Where a new window goes when nothing better is known: over `win`, offset a
// little so the two do not cover each other, as VS Code does.
export function besideWindow(win: Window): WindowBounds {
  return { left: win.screenX + 40, top: win.screenY + 40, ...NEW_WINDOW_SIZE };
}

// Where a tab dropped outside `win` opens: at the drop point. A browser that
// reports no point for a drag end (Firefox gives 0, 0) gets `besideWindow`.
export function droppedAt(win: Window, screenX: number, screenY: number): WindowBounds {
  if (screenX === 0 && screenY === 0) return besideWindow(win);
  return { left: screenX - 40, top: screenY - 20, ...NEW_WINDOW_SIZE };
}

// A drag end that no surface took, outside the window: a tab dragged out.
export function endedOutside(
  win: Window,
  e: { dataTransfer: { dropEffect: string } | null; clientX: number; clientY: number },
): boolean {
  if (!e.dataTransfer || e.dataTransfer.dropEffect !== 'none') return false;
  return e.clientX < 0 || e.clientY < 0 || e.clientX > win.innerWidth || e.clientY > win.innerHeight;
}
