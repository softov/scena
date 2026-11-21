// The drag of a tab, as every tab layout reads it.
//
// Each layout also keeps its own drag type for a move inside itself (an index
// in a strip, a leaf in a tree). This one names the surface the tab comes
// from, so a layout on ANOTHER surface can take the tab: it calls
// `surfaces.move` and places the key in its own state.

import type { MountPolicy, SurfaceName } from './mount-surface.js';

export const TAB_DRAG_MIME = 'application/x-scena-tab';

export interface TabDragPayload {
  // The surface the tab is on when the drag starts.
  surface: SurfaceName;
  // The mount key, which is also the tab key.
  key: string;
  // The `tab-panel` leaf that holds the tab, when the source has one.
  leafId?: string;
}

// The two halves of `DataTransfer` this needs, so the sdk names no DOM type.
export interface TabDragWriter {
  setData(format: string, data: string): void;
}
export interface TabDragReader {
  getData(format: string): string;
}

export function writeTabDrag(to: TabDragWriter, payload: TabDragPayload): void {
  to.setData(TAB_DRAG_MIME, JSON.stringify(payload));
}

// Null for a drag with no payload of this type, or one that does not parse.
// A browser hides the data until the drop, so during `dragover` this is null
// too; a layout reads the drag in progress there instead.
export function readTabDrag(from: TabDragReader): TabDragPayload | null {
  const raw = from.getData(TAB_DRAG_MIME);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Partial<TabDragPayload>;
    if (typeof obj.surface !== 'string' || typeof obj.key !== 'string') return null;
    if (obj.leafId !== undefined && typeof obj.leafId !== 'string') return null;
    return {
      surface: obj.surface,
      key: obj.key,
      ...(obj.leafId === undefined ? {} : { leafId: obj.leafId }),
    };
  } catch {
    return null;
  }
}

// Whether a mount may go to `toSurface`. Its own surface is always fine: that
// is a move inside one layout. Another surface is refused only by
// `policy.movable: false`.
export function canMoveTo(
  mount: { surface: SurfaceName; policy?: MountPolicy },
  toSurface: SurfaceName,
): boolean {
  if (mount.surface === toSurface) return true;
  return mount.policy?.movable !== false;
}
