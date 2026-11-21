---
title: A tab strip takes a tab from another surface
status: done
depends: [task-01-the-tab-drag-names-its-surface.md]
layer: "scena ui/layout"
refs:
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L41-L47](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L41-L47) - the order appends a mount it does not know, so a source `tab` layout needs no write"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L126-L147](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L126-L147) - the drag over and drop, a reorder by index"
  - "[code://packages/scena/test/ui/TabLayout.test.tsx](../../../../packages/scena/test/ui/TabLayout.test.tsx) - the test that gets the drop cases"
---

## Objective

A `tab` layout takes a tab from another surface on its strip, at the index where it fell.
In ahpw, this is the layout of `sidebar:right`.

## Files

- `UPDATE: packages/scena/src/ui/layout/TabLayout.tsx:126-147` - accept `TAB_DRAG_MIME`, and move a tab from another surface with `moveTabHere`.
- `UPDATE: packages/scena/test/ui/TabLayout.test.tsx` - the drops from another surface.

## Steps

1. In the drag over, accept `TAB_DRAG_MIME`, and read the drag in progress with `currentTabDrag`.
2. When the drag comes from another surface and `canMoveTo` is `false`, set `dropEffect` to `none`.
3. In the drop, call `moveTabHere` when the payload's surface is another surface.
4. Write the target order with the key at the drop index, in the `place` function of `moveTabHere`.
5. Keep the index reorder for a drag from the same strip.

## Validation

- `test/ui/TabLayout.test.tsx`: a drop from `main` puts the key at the drop index and moves the mount.
- The same test: a reorder inside the strip works as before.
- The same test: a mount with `movable: false` does not move.
- `pnpm test` passes.

## Resume

- Done 2026-11-21: steps 1 to 5.
- The strip itself also takes a drop, at the end, so an empty strip and the space past the last tab take a tab. A tab stops its own drag events first.
- A drop reads the shared payload before the index. Before this, a drag between two `tab` layouts read the other strip's index as a reorder.
- `pnpm test` (394 tests, 5 new), `pnpm typecheck` and `pnpm lint` pass.
