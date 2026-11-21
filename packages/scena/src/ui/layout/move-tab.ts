// Moves a tab dragged from another surface onto this one.
//
// The order matters. `surfaces.move` comes first: a `tab-panel` layout prunes
// every key its surface does not mount, so a tree written before the move
// would lose the tab on the next render. Then both surfaces' states are
// written in the same tick, before React renders either of them.

import type { Scena } from '../../sdk/scena.js';
import type { SurfaceLayoutState } from '../../sdk/layout.js';
import type { SurfaceName } from '../../sdk/mount-surface.js';
import { canMoveTo, type TabDragPayload } from '../../sdk/tab-drag.js';
import { makeLeaf, removeTab } from '../../sdk/tab-panel.js';
import { endTabDrag } from './tab-drag.js';

// Whether the drag in `payload` may land on `toSurface`. False for a mount
// that is gone, or one whose policy keeps it where it is.
export function canTakeTab(scena: Scena, payload: TabDragPayload, toSurface: SurfaceName): boolean {
  const mount = scena.surfaces.listAt(payload.surface).find((m) => m.key === payload.key);
  return mount !== undefined && canMoveTo(mount, toSurface);
}

// `place` gives the target surface's new state with the key in it, from the
// state the target layout drew. Returns whether the tab moved.
export function moveTabHere(
  scena: Scena,
  payload: TabDragPayload,
  toSurface: SurfaceName,
  place: () => Partial<SurfaceLayoutState> | null,
): boolean {
  endTabDrag();
  if (payload.surface === toSurface || !canTakeTab(scena, payload, toSurface)) return false;
  const patch = place();
  if (!patch) return false;

  scena.surfaces.move({ key: payload.key, toSurface, fromSurface: payload.surface });

  // A source with a tab-panel tree loses the key from it, so an emptied group
  // closes. A `tab` source needs no write: its order skips a key it does not
  // mount.
  const sourceTree = scena.layout.get().surfaces[payload.surface]?.tabPanel?.tree;
  if (sourceTree) {
    const left = removeTab(sourceTree, payload.key) ?? makeLeaf([]);
    scena.layout.setSurface(payload.surface, { tabPanel: { tree: left } });
  }
  scena.layout.setSurface(toSurface, patch);
  scena.surfaces.focus(payload.key);
  return true;
}
