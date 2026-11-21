---
title: A list row drags in, and a surface takes a drop anywhere - implemented
date: 2026-11-21
refs:
  - git://a536663 - the last code commit before this record, the title actions fix
  - "[code://packages/scena/src/react/surface-drop.ts](../../../../packages/scena/src/react/surface-drop.ts) - the drag in progress, `judgeDrag`, `dropHere`, `startOpenDrag`"
  - "[code://packages/scena/src/react/SurfaceArea.tsx](../../../../packages/scena/src/react/SurfaceArea.tsx) - the surface takes a drop"
---

A surface takes a dropped tab anywhere on it, whatever its layout, and the tab lands at the end.
A tab layout that can place it where it fell handles the drop first.
A list row, such as a session in an explorer, drags onto any surface.
Its key opens there, or its tab moves there when it is open elsewhere.
A reopened tab keeps its title, icon and colour.
Only the strip or group whose active tab has focus draws the tab title actions.

## What was built

- [`code://packages/scena/src/react/surface-drop.ts`](../../../../packages/scena/src/react/surface-drop.ts) - the drop path for tabs and rows, moved from `ui/layout` so `SurfaceArea` can use it.
- [`code://packages/scena/src/react/SurfaceArea.tsx`](../../../../packages/scena/src/react/SurfaceArea.tsx) - takes a drop at the end; a bar, the rail and the overlay take none.
- [`code://packages/scena/src/sdk/tab-drag.ts`](../../../../packages/scena/src/sdk/tab-drag.ts) - `OPEN_DRAG_MIME`, `OpenDragPayload`, `writeOpenDrag`, `readOpenDrag`.
- [`code://packages/scena/src/core/controls/session.ts`](../../../../packages/scena/src/core/controls/session.ts) - the snapshot keeps props, and the restore passes them back.
- [`code://packages/scena/src/runtime/layout-commands.ts`](../../../../packages/scena/src/runtime/layout-commands.ts) - imports the tree helpers.
- [`code://packages/scena/src/core/scena.ts`](../../../../packages/scena/src/core/scena.ts) - keeps the focused mount at `$/focus/key`; the tab layouts draw `view/title` only for it.
- The playground's session rows drag, and its focus mirrors follow focus on every surface.
- [`code://docs/architecture.md`](../../../../docs/architecture.md) and [`code://docs/consuming.md`](../../../../docs/consuming.md) - the surface drop and the row drag.

## Verified

- `pnpm test`: 448 tests pass. New: `test/react/surface-drop.test.tsx`, `test/react/title-actions.test.tsx`, and cases in `test/sdk/tab-drag.test.ts`, `test/ui/TabPanelLayout.test.tsx` and `test/core/reopen.test.ts`.
- `pnpm typecheck` passes in the three workspaces, `pnpm lint` passes, and the playground builds.
- Softov checked the playground on 2026-11-21.

## Departures from the plan

- Softov said the surface takes the drop, not a tab layout. Task 01 moved the drop to `SurfaceArea`, and the drop helpers to `react/surface-drop.ts`.
- A drop writes `split.order` with the key at the end. With no saved order, a strip listed a moved tab by its open time.
- Step 2 of task 05 is not done: `Listable` has no row drag end. A cancelled row drag leaves its record, which only a drag with the open type reads.
- The check of task 05 found the tab title actions drawn on the wrong strip. `a536663` fixes it, as the *Answers* row says.

## Left for later

- A drop area an app marks, such as a composer that makes a dropped session a reference. Softov chose it on 2026-11-21 as the next plan.
- A row dropped outside the browser window opens no window.
- ahpw: its session rows call `startOpenDrag` once it takes this release, and its plan `sessions/20261028-0951-drag-a-session-into-a-tab-group` is rewritten to that.
