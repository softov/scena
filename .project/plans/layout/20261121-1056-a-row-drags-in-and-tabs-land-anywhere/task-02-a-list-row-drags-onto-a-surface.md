---
title: A list row drags onto a surface
status: todo
depends: [task-01-the-page-area-takes-a-tab.md]
layer: "scena sdk and ui/layout"
refs:
  - "[code://packages/scena/src/sdk/tab-drag.ts](../../../../packages/scena/src/sdk/tab-drag.ts) - the tab payload, the pattern"
  - "[code://packages/scena/src/ui/layout/move-tab.ts](../../../../packages/scena/src/ui/layout/move-tab.ts) - `moveTabHere`, which an open key reuses"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx) - `takesDrag` and `foreignDrop`"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx](../../../../packages/scena/src/ui/layout/TabLayout.tsx) - `takesDrag` and `takeForeign`"
---

## Objective

An app's list row drags onto a tab surface, and the thing it names opens where it fell.
A key that is open elsewhere moves there.

## Files

- `UPDATE: packages/scena/src/sdk/tab-drag.ts` - `OPEN_DRAG_MIME`, `OpenDragPayload`, `writeOpenDrag` and `readOpenDrag`.
- `UPDATE: packages/scena/src/ui/layout/tab-drag.ts` - `startOpenDrag(dataTransfer, payload)` and `endOpenDrag()`, and the open drag in progress.
- `UPDATE: packages/scena/src/ui/layout/move-tab.ts` - `dropHere`, which opens a new key or moves an open one, then places it.
- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx` - take an open drag on the strip and the body.
- `UPDATE: packages/scena/src/ui/layout/TabLayout.tsx` - take an open drag on the strip and the page area.
- `UPDATE: packages/scena/src/ui/index.ts` - export `startOpenDrag` and `endOpenDrag`.
- `UPDATE: packages/scena/test/sdk/tab-drag.test.ts` - the open payload.
- `UPDATE: packages/scena/test/ui/TabPanelLayout.test.tsx` - a row drop on the strip, the centre and an edge.
- `UPDATE: packages/scena/test/ui/TabLayout.test.tsx` - a row drop, and a row of an open key.

## Steps

1. Define `OPEN_DRAG_MIME` as `application/x-scena-open`, and `OpenDragPayload` as `{ key, resource, props?, policy? }`.
2. Write `writeOpenDrag` and `readOpenDrag`, as the tab payload's pair.
3. Write `startOpenDrag`, which writes the payload, sets `effectAllowed` to `copyMove`, and records the drag in progress.
4. Write `dropHere(scena, drop, toSurface, place)`, where `drop` is a tab payload or an open payload.
5. In `dropHere`, move an open key with `moveTabHere`, and open a new key with `surfaces.open` on `toSurface`.
6. Make `takesDrag` in both layouts accept `OPEN_DRAG_MIME`, and refuse a row of an open key that cannot move.
7. In each drop, read the open payload after the tab payload, and call `dropHere`.

## Validation

- `test/sdk/tab-drag.test.ts`: an open payload reads back; a malformed one reads as `null`.
- `test/ui/TabPanelLayout.test.tsx`: a row drop opens the key at the strip index, at the centre, and in a split.
- `test/ui/TabLayout.test.tsx`: a row drop opens the key on the sidebar; a row of a key open on `main` moves it.
- `pnpm test` passes.

## Resume
