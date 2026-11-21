// The drag of a tab, as every tab layout reads it.
//
// Each layout also keeps its own drag type for a move inside itself (an index
// in a strip, a leaf in a tree). This one names the surface the tab comes
// from, so a layout on ANOTHER surface can take the tab: it calls
// `surfaces.move` and places the key in its own state.

import type { MountDisplay, MountPolicy, SurfaceName } from './mount-surface.js';
import type { ComponentNode } from './component-graph.js';

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

// The drag of something that may not be open yet: a row of a list, such as a
// session in an explorer. It carries what `surfaces.open` needs. A surface
// that takes it opens the key there; a key already open elsewhere moves
// there, as its tab would.
export const OPEN_DRAG_MIME = 'application/x-scena-open';

export interface OpenDragPayload {
  key: string;
  resource: ComponentNode;
  props?: MountDisplay;
  policy?: MountPolicy;
}

export function writeOpenDrag(to: TabDragWriter, payload: OpenDragPayload): void {
  to.setData(OPEN_DRAG_MIME, JSON.stringify(payload));
}

// Null for a drag with no payload of this type, or one that does not parse.
export function readOpenDrag(from: TabDragReader): OpenDragPayload | null {
  const raw = from.getData(OPEN_DRAG_MIME);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Partial<OpenDragPayload>;
    if (typeof obj.key !== 'string') return null;
    const resource = obj.resource as { component?: unknown } | undefined;
    if (!resource || typeof resource !== 'object' || typeof resource.component !== 'string') return null;
    return {
      key: obj.key,
      resource: obj.resource as ComponentNode,
      ...(obj.props && typeof obj.props === 'object' ? { props: obj.props } : {}),
      ...(obj.policy && typeof obj.policy === 'object' ? { policy: obj.policy } : {}),
    };
  } catch {
    return null;
  }
}

// What a drop area learns about a dragged tab or row: one shape for both.
// For a tab, the resource and the title are its mount's; for a row, the
// payload's. `surface` is where a tab is open; a row has none.
export interface DroppedThing {
  from: 'tab' | 'row';
  key: string;
  resource: ComponentNode;
  title?: MountDisplay['title'];
  surface?: SurfaceName;
}
