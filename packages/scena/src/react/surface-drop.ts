// What a drop on a surface needs: the drag in progress, and the move.
//
// It sits in react/, below ui/: SurfaceArea takes a drop on every surface,
// at the end, and a tab layout in ui/ places one where it fell.

import type { Scena } from '../sdk/scena.js';
import type { SurfaceLayoutState } from '../sdk/layout.js';
import type { SurfaceName } from '../sdk/mount-surface.js';
import {
  canMoveTo,
  OPEN_DRAG_MIME,
  readOpenDrag,
  readTabDrag,
  TAB_DRAG_MIME,
  writeOpenDrag,
  type DroppedThing,
  type OpenDragPayload,
  type TabDragPayload,
  type TabDragReader,
} from '../sdk/tab-drag.js';
import { useCallback, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { useScena as useScenaForDrop } from './ScenaProvider.js';
import { makeLeaf, removeTab } from '../sdk/tab-panel.js';

// The tab drag in progress.
//
// A browser hides `dataTransfer` data until the drop, so a layout cannot read
// the payload during `dragover` -- and that is where it must decide whether to
// show a drop zone. The layout that starts the drag records the payload here,
// and clears it on `dragend`. A second browser window drawn from this page
// runs in the same JavaScript realm, so it reads the same record.

let current: TabDragPayload | null = null;
let currentOpen: OpenDragPayload | null = null;

export function startTabDrag(payload: TabDragPayload): void {
  current = payload;
}

export function currentTabDrag(): TabDragPayload | null {
  return current;
}

export function endTabDrag(): void {
  current = null;
  currentOpen = null;
}

// A list row's drag: what it opens. Call from the row's `dragstart`, and
// `endOpenDrag` from its `dragend`.
export function startOpenDrag(
  to: { setData(format: string, data: string): void; effectAllowed: string },
  payload: OpenDragPayload,
): void {
  writeOpenDrag(to, payload);
  to.effectAllowed = 'copyMove';
  currentOpen = payload;
}

export function currentOpenDrag(): OpenDragPayload | null {
  return currentOpen;
}

export const endOpenDrag = endTabDrag;

// Moves a tab dragged from another surface onto this one.
//
// The order matters. `surfaces.move` comes first: a `tab-panel` layout prunes
// every key its surface does not mount, so a tree written before the move
// would lose the tab on the next render. Then both surfaces' states are
// written in the same tick, before React renders either of them.

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

// A surface whose state says `drops: false` takes no tab or row.
function refusesDrops(scena: Scena, surface: SurfaceName): boolean {
  return scena.layout.get().surfaces[surface]?.drops === false;
}

// The surface that has `key` open, if any.
export function surfaceOf(scena: Scena, key: string): SurfaceName | undefined {
  return scena.surfaces.listSurfaces().find((s) => scena.surfaces.listAt(s).some((m) => m.key === key));
}

// What a drag over `surface` means, from the drag in progress:
// - 'take': a tab from another surface, or a row, that may land here;
// - 'refuse': one that may not (its mount does not move);
// - 'pass': none of these, such as a layout's own drag inside the surface.
export function judgeDrag(
  scena: Scena,
  types: readonly string[],
  surface: SurfaceName,
): 'take' | 'refuse' | 'pass' {
  if (refusesDrops(scena, surface)) {
    // A tab from another surface or a row: refused, so a layout does not read
    // it as its own drag. A drag inside the surface passes, as before.
    const foreign = (types.includes(TAB_DRAG_MIME) && current && current.surface !== surface)
      || (types.includes(OPEN_DRAG_MIME) && currentOpen);
    return foreign ? 'refuse' : 'pass';
  }
  if (types.includes(TAB_DRAG_MIME) && current && current.surface !== surface) {
    return canTakeTab(scena, current, surface) ? 'take' : 'refuse';
  }
  if (types.includes(OPEN_DRAG_MIME) && currentOpen) {
    const at = surfaceOf(scena, currentOpen.key);
    if (at === undefined || at === surface) return 'take';
    return canTakeTab(scena, { surface: at, key: currentOpen.key }, surface) ? 'take' : 'refuse';
  }
  return 'pass';
}

// Lands a drop from elsewhere on `surface`: a tab from another surface moves
// here; a row opens its key here, or moves its tab here when the key is open
// on another surface, or focuses it when it is open here. `place` gives the
// surface's state with the key placed. False when the drop is none of these,
// so the caller handles it as its own.
export function dropHere(
  scena: Scena,
  data: TabDragReader,
  surface: SurfaceName,
  place: (key: string) => Partial<SurfaceLayoutState> | null,
): boolean {
  if (refusesDrops(scena, surface)) return false;
  const tab = readTabDrag(data);
  if (tab) {
    if (tab.surface === surface) return false;
    moveTabHere(scena, tab, surface, () => place(tab.key));
    return true;
  }
  const row = readOpenDrag(data);
  if (!row) return false;
  endTabDrag();
  const at = surfaceOf(scena, row.key);
  if (at === surface) {
    scena.surfaces.focus(row.key);
    return true;
  }
  if (at !== undefined) {
    moveTabHere(scena, { surface: at, key: row.key }, surface, () => place(row.key));
    return true;
  }
  const patch = place(row.key);
  scena.surfaces.open({
    surface,
    key: row.key,
    resource: row.resource as never,
    ...(row.props ? { props: row.props } : {}),
    ...(row.policy ? { policy: row.policy } : {}),
  });
  if (patch) scena.layout.setSurface(surface, patch);
  scena.surfaces.focus(row.key);
  return true;
}

// A tab, as a drop area sees it: its mount's resource and title.
function describeTab(scena: Scena, tab: TabDragPayload): DroppedThing | null {
  const mount = scena.surfaces.listAt(tab.surface).find((m) => m.key === tab.key);
  if (!mount) return null;
  return {
    from: 'tab',
    key: tab.key,
    resource: mount.component,
    surface: tab.surface,
    ...(mount.props?.title !== undefined ? { title: mount.props.title } : {}),
  };
}

function describeRow(row: OpenDragPayload): DroppedThing {
  return {
    from: 'row',
    key: row.key,
    resource: row.resource,
    ...(row.props?.title !== undefined ? { title: row.props.title } : {}),
  };
}

// The dropped thing, from the drop's data.
export function describeDrop(scena: Scena, data: TabDragReader): DroppedThing | null {
  const tab = readTabDrag(data);
  if (tab) return describeTab(scena, tab);
  const row = readOpenDrag(data);
  return row ? describeRow(row) : null;
}

// The dragged thing, from the drag in progress: the data is hidden until the
// drop, and `dragover` is where an area decides.
export function describeDragInProgress(scena: Scena, types: readonly string[]): DroppedThing | null {
  if (types.includes(TAB_DRAG_MIME) && current) return describeTab(scena, current);
  if (types.includes(OPEN_DRAG_MIME) && currentOpen) return describeRow(currentOpen);
  return null;
}

export interface DropAreaOptions {
  // Whether the area takes this thing. Unset: it takes any tab or row.
  accepts?: (thing: DroppedThing) => boolean;
  onDrop: (thing: DroppedThing) => void;
}

export interface DropArea {
  // True while a drag the area takes is over it.
  over: boolean;
  // Spread on the area's element.
  props: {
    onDragOver: (e: ReactDragEvent<HTMLElement>) => void;
    onDragLeave: (e: ReactDragEvent<HTMLElement>) => void;
    onDrop: (e: ReactDragEvent<HTMLElement>) => void;
    // Marks the element, so a tab group around it drops its own drop preview
    // while a drag is over the area.
    'data-scena-drop-area': true;
  };
}

// Marks an element inside a page as a drop area. A tab or a row dropped on it
// goes to `onDrop`, and the event stops there, so the tab layout and the
// surface do not take it: the tab stays where it was. A thing the area does
// not accept passes through to the surface.
export function useDropArea(options: DropAreaOptions): DropArea {
  const scena = useScenaForDrop();
  const [over, setOver] = useState(false);
  const opts = useRef(options);
  opts.current = options;

  const takes = useCallback(
    (thing: DroppedThing | null): thing is DroppedThing =>
      thing !== null && (opts.current.accepts === undefined || opts.current.accepts(thing)),
    [],
  );

  const onDragOver = useCallback((e: ReactDragEvent<HTMLElement>) => {
    if (!takes(describeDragInProgress(scena, e.dataTransfer.types))) return;
    e.preventDefault();
    e.stopPropagation();
    // Copy, unless the person holds Shift, which a browser reads as asking to
    // move: an answer that differs from the ask cancels the drop. The tab stays
    // where it was either way; an area links.
    const allowed = e.dataTransfer.effectAllowed;
    e.dataTransfer.dropEffect = e.shiftKey && (allowed === 'move' || allowed === 'copyMove' || allowed === 'linkMove' || allowed === 'all') ? 'move' : 'copy';
    setOver(true);
  }, [scena, takes]);

  const onDragLeave = useCallback((e: ReactDragEvent<HTMLElement>) => {
    const next = e.relatedTarget as Node | null;
    if (!next || !(e.currentTarget as Node).contains(next)) setOver(false);
  }, []);

  const onDrop = useCallback((e: ReactDragEvent<HTMLElement>) => {
    const thing = describeDrop(scena, e.dataTransfer);
    if (!takes(thing)) return;
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    endTabDrag();
    opts.current.onDrop(thing);
  }, [scena, takes]);

  return { over, props: { onDragOver, onDragLeave, onDrop, 'data-scena-drop-area': true } };
}
