---
title: A tab drags between surfaces - implemented
date: 2026-11-21
refs:
  - git://9c17221 - the last code commit before this record, task 03
  - "[code://packages/scena/src/sdk/tab-drag.ts](../../../../packages/scena/src/sdk/tab-drag.ts) - the shared drag payload and `canMoveTo`"
  - "[code://packages/scena/src/sdk/tab-panel.ts](../../../../packages/scena/src/sdk/tab-panel.ts) - the pure tree moves"
  - "[code://packages/scena/src/ui/layout/move-tab.ts](../../../../packages/scena/src/ui/layout/move-tab.ts) - `moveTabHere` and `canTakeTab`"
---

A person drags a tab from one surface and drops it on another, and the tab moves there.
A `tab-panel` layout takes it on a strip, on a group's centre, or on an edge to split the group.
A `tab` strip takes it at the tab it falls on, or at the end.
A group that the tab leaves empty closes.
A mount with `policy.movable: false` stays, and the drag shows that it cannot land.

## What was built

- [`code://packages/scena/src/sdk/tab-drag.ts`](../../../../packages/scena/src/sdk/tab-drag.ts) - `TAB_DRAG_MIME`, `TabDragPayload`, `writeTabDrag`, `readTabDrag` and `canMoveTo`.
- [`code://packages/scena/src/sdk/tab-panel.ts`](../../../../packages/scena/src/sdk/tab-panel.ts) - the tree helpers that moved out of `TabPanelLayout.tsx`, with `placeTab` and `splitAt`.
- [`code://packages/scena/src/sdk/mount-surface.ts`](../../../../packages/scena/src/sdk/mount-surface.ts) - `MountPolicy.movable`.
- [`code://packages/scena/src/ui/layout/tab-drag.ts`](../../../../packages/scena/src/ui/layout/tab-drag.ts) - the drag in progress, for `dragover`.
- [`code://packages/scena/src/ui/layout/move-tab.ts`](../../../../packages/scena/src/ui/layout/move-tab.ts) - the move: `surfaces.move` first, then both states.
- [`code://packages/scena/src/ui/layout/TabPanelLayout.tsx`](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx) and [`code://packages/scena/src/ui/layout/TabLayout.tsx`](../../../../packages/scena/src/ui/layout/TabLayout.tsx) - write the shared payload and take a tab from another surface.
- [`code://packages/playground/src/drag-demo.ts`](../../../../packages/playground/src/drag-demo.ts) - two tabs on the right sidebar, one fixed.
- [`code://packages/playground/src/tab-storage.ts`](../../../../packages/playground/src/tab-storage.ts) - the playground reopens the tabs of `main` and `sidebar:right` after a reload.
- [`code://docs/architecture.md`](../../../../docs/architecture.md) and [`code://docs/consuming.md`](../../../../docs/consuming.md) - the move, `movable`, and the stale surface an app must not keep.

## Verified

- `pnpm test`: 394 tests pass. New: `test/sdk/tab-panel.test.ts`, `test/sdk/tab-drag.test.ts`, `test/ui/TabPanelLayout.test.tsx` (6), and 5 cases in `test/ui/TabLayout.test.tsx`.
- `pnpm typecheck` passes in the three workspaces, and `pnpm lint` passes.
- Softov checked the playground on 2026-11-21: the moves between `main` and the right sidebar, the refused fixed tab, and a reload.

## Departures from the plan

- The `tab` strip itself takes a drop at the end, so an empty strip and the space past the last tab take a tab. The plan named only the tabs.
- A drop reads the shared payload before the index. This also fixes a drag between two `tab` strips, which read as a reorder before.
- `moveTabHere` removes the key from any source with a tab-panel tree, whatever its layout id. The plan said a `tab-panel` source.

## Left for later

- `runtime/layout-commands.ts` keeps its own copies of `findLeaf`, `replaceLeaf`, `mapLeaves` and `newLeafId`. They can import from `sdk/tab-panel.ts`.
- A restored tab has no title until its page sets one, because a session snapshot keeps no props.
