// The tab drag in progress.
//
// A browser hides `dataTransfer` data until the drop, so a layout cannot read
// the payload during `dragover` -- and that is where it must decide whether to
// show a drop zone. The layout that starts the drag records the payload here,
// and clears it on `dragend`. A second browser window drawn from this page
// runs in the same JavaScript realm, so it reads the same record.

import type { TabDragPayload } from '../../sdk/tab-drag.js';

let current: TabDragPayload | null = null;

export function startTabDrag(payload: TabDragPayload): void {
  current = payload;
}

export function currentTabDrag(): TabDragPayload | null {
  return current;
}

export function endTabDrag(): void {
  current = null;
}
