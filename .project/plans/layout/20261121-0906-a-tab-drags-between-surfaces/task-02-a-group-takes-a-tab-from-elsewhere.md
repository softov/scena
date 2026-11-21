---
title: A tab group takes a tab from another surface
status: done
depends: [task-01-the-tab-drag-names-its-surface.md]
layer: "scena ui/layout"
refs:
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L334-L396](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L334-L396) - the strip and body drag over and drop, which read the layout's own type only"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L791-L840](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L791-L840) - `TabPanelLayout`, where the context gets the surface name"
  - "[code://packages/scena/src/core/graph/mount-surface.ts#L323-L338](../../../../packages/scena/src/core/graph/mount-surface.ts#L323-L338) - `move`, called before the trees are written"
  - "[code://packages/scena/test/ui/TabLayout.test.tsx](../../../../packages/scena/test/ui/TabLayout.test.tsx) - the setup to copy for a layout test"
---

## Objective

A `tab-panel` layout takes a tab from another surface on its strip and on its body.
The tab lands where it fell, and the source surface no longer shows it.
A mount that cannot move shows no drop zone.

## Files

- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx:250-258` - add the surface name to `TabPanelContext`.
- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx:334-396` - accept `TAB_DRAG_MIME` on the strip and the body, and move a tab from another surface.
- `CREATE: packages/scena/src/ui/layout/move-tab.ts` - `moveTabHere`, which moves the mount and writes both trees.
- `CREATE: packages/scena/test/ui/TabPanelLayout.test.tsx` - the drops from another surface.

## Steps

1. Add `surface` to `TabPanelContext`, from the layout's props.
2. In each drag over, accept `TAB_DRAG_MIME`, and read the drag in progress with `currentTabDrag`.
3. When the drag comes from another surface and `canMoveTo` is `false`, set `dropEffect` to `none` and show no zone.
4. Write `moveTabHere(scena, payload, toSurface, place)`, where `place` maps the target tree to a new tree.
5. In `moveTabHere`, call `surfaces.move` first, then write the target tree and the source tree with `layout.setSurface`.
6. Remove the key from the source tree with `removeTab` only when the source layout is `tab-panel`.
7. In each drop, call `moveTabHere` when the payload's surface is another surface, and the existing move otherwise.
8. Focus the moved tab with `surfaces.focus` after the move.

## Validation

- `test/ui/TabPanelLayout.test.tsx`: a drop on the strip from `sidebar:right` puts the key at that index and moves the mount to `main`.
- The same test: a drop on a body edge splits the group; a drop on the centre joins it.
- The same test: the source `tab-panel` tree no longer holds the key, and its emptied leaf is gone.
- The same test: a mount with `movable: false` does not move, and the drag over sets `dropEffect` to `none`.
- `pnpm test` passes.

## Resume

- Done 2026-11-21: steps 1 to 8. Step 1 was already true at `95c7574`.
- `moveTabHere` and `canTakeTab` are in `ui/layout/move-tab.ts`. It removes the key from any source surface that has a tab-panel tree, whatever its layout id.
- `moveTabHere` also clears the drag in progress, because the source tab leaves the page and may get no `dragend`.
- jsdom has no `DragEvent`, so the test sets `clientX` and `clientY` on the drop event itself.
- `pnpm test` (389 tests, 6 new), `pnpm typecheck` and `pnpm lint` pass.
