---
title: The tab drag names its surface
status: todo
depends: []
layer: "scena sdk and ui/layout"
refs:
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L37-L216](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L37-L216) - the pure tree helpers and `reconcile` that move to the sdk"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L612-L722](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L612-L722) - `removeTab`, `insertTab`, `splitLeafOnDrop` and `collectLeavesById`, the moves that become pure"
  - "[code://packages/scena/src/sdk/mount-surface.ts#L48-L60](../../../../packages/scena/src/sdk/mount-surface.ts#L48-L60) - `MountPolicy`, which gets `movable`"
  - "[code://packages/scena/src/sdk/layout.ts](../../../../packages/scena/src/sdk/layout.ts) - `TabPanelNode`, the shape the moves work on"
---

## Objective

A tab drag carries one payload that every layout reads: the source surface, the mount key and the leaf id.
The tree moves are pure functions in the sdk, so a layout can edit the tree of another surface.
A mount with `policy.movable: false` stays on its surface.

## Files

- `CREATE: packages/scena/src/sdk/tab-panel.ts` - the pure tree functions: `makeLeaf`, `collectTabs`, `collectLeaves`, `pruneTree`, `mapLeaves`, `replaceLeaf`, `reconcile`, `removeTab`, `placeTab`, `splitAt`.
- `CREATE: packages/scena/src/sdk/tab-drag.ts` - `TAB_DRAG_MIME`, `TabDragPayload`, `writeTabDrag`, `readTabDrag` and `canMoveTo`.
- `CREATE: packages/scena/src/ui/layout/tab-drag.ts` - the payload of the drag in progress, set on `dragstart` and cleared on `dragend`, for `dragover`.
- `CREATE: packages/scena/test/sdk/tab-panel.test.ts` - the tree moves.
- `CREATE: packages/scena/test/sdk/tab-drag.test.ts` - the payload and `canMoveTo`.
- `UPDATE: packages/scena/src/sdk/mount-surface.ts:48-60` - add `movable?: boolean` to `MountPolicy`, after `closable`.
- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx:37-216` - remove the helpers that moved, and import them from `sdk/tab-panel.ts`.
- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx:612-722` - make `insertTab` and `splitLeafOnDrop` call the pure moves and commit the result.
- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx:326-330` - write the shared payload beside the layout's own payload, and set the drag in progress.
- `UPDATE: packages/scena/src/ui/layout/TabLayout.tsx:126-130` - write the shared payload beside the index, and set the drag in progress.
- `UPDATE: packages/scena/src/sdk/index.ts` - export the two new sdk modules.

## Steps

1. Move the pure tree helpers from `TabPanelLayout.tsx` to `sdk/tab-panel.ts`, with each body unchanged.
2. Write `removeTab(tree, key)`, `placeTab(tree, key, leafId, index)` and `splitAt(tree, key, leafId, zone)` as pure functions that return the new tree.
3. Make `insertTab` and `splitLeafOnDrop` in the layout call `placeTab` and `splitAt` and commit the result.
4. Define `TAB_DRAG_MIME` as `application/x-scena-tab` and `TabDragPayload` as `{ surface, key, leafId? }`.
5. Write `writeTabDrag(dataTransfer, payload)` and `readTabDrag(dataTransfer)`, which returns `null` for a missing or malformed payload.
6. Write `canMoveTo(mount, toSurface)`, which is `false` when `policy.movable` is `false` and `true` otherwise.
7. Add `movable?: boolean` to `MountPolicy`, with a comment that says `false` keeps the mount on its surface.
8. Create `ui/layout/tab-drag.ts` with `startTabDrag(payload)`, `currentTabDrag()` and `endTabDrag()`.
9. In both layouts, call `writeTabDrag` and `startTabDrag` on drag start, and `endTabDrag` on drag end.
10. Export the sdk modules from `sdk/index.ts`.

## Validation

- `test/sdk/tab-panel.test.ts`: `removeTab` drops an emptied leaf, and `placeTab` clamps the index.
- The same test: `splitAt` makes a split for each of the four zones.
- The same test: `reconcile` keeps its current cases.
- `test/sdk/tab-drag.test.ts`: a written payload reads back; a malformed payload reads as `null`; `canMoveTo` is `false` only for `movable: false`.
- `pnpm test`, `pnpm typecheck` and `pnpm lint` pass.
- In the playground `tab-panel` mode, a tab still reorders, joins a group and splits a group.

## Resume
