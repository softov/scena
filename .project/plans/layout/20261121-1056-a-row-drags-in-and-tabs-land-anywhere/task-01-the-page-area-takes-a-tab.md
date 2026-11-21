---
title: The surface takes a drop
status: done
depends: []
layer: "scena react and ui/layout"
refs:
  - "[code://packages/scena/src/react/SurfaceArea.tsx#L101-L200](../../../../packages/scena/src/react/SurfaceArea.tsx#L101-L200) - the element of every surface"
  - "[code://packages/scena/src/ui/layout/move-tab.ts](../../../../packages/scena/src/ui/layout/move-tab.ts) - `moveTabHere` and `canTakeTab`, which move to a layer `SurfaceArea` can import"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx](../../../../packages/scena/src/ui/layout/TabLayout.tsx) - the end drop, which moves to `SurfaceArea`"
  - "[code://packages/scena/test/ui/TabLayout.test.tsx](../../../../packages/scena/test/ui/TabLayout.test.tsx) - the test that gets the page case"
---

## Objective

A tab from another surface dropped anywhere on a surface lands there, at the end, whatever the surface's layout.
A layout that places the tab where it fell handles the drop first.
A bar, a rail and the overlay take no drop.

## Files

- `CREATE: packages/scena/src/react/surface-drop.ts` - `canTakeTab`, `moveTabHere` and the drag in progress, moved from `ui/layout`, because `react` sits below `ui`.
- `DELETE: packages/scena/src/ui/layout/move-tab.ts` - moved to `react/surface-drop.ts`.
- `DELETE: packages/scena/src/ui/layout/tab-drag.ts` - moved to `react/surface-drop.ts`.
- `UPDATE: packages/scena/src/react/SurfaceArea.tsx` - take a drop at the end on a surface whose role is not `bar`, `rail` or `overlay`.
- `UPDATE: packages/scena/src/ui/layout/TabLayout.tsx` - remove the end drop; import from `react/surface-drop.ts`.
- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx` - stop a drop it places; import from `react/surface-drop.ts`.
- `UPDATE: packages/scena/test/ui/TabLayout.test.tsx` - a drop on the page area.
- `CREATE: packages/scena/test/react/surface-drop.test.tsx` - a drop on a `stack` surface and on a bar.

## Steps

1. Move `canTakeTab`, `moveTabHere` and the drag in progress to `react/surface-drop.ts`, and update the imports.
2. In `SurfaceArea`, on drag over, accept a tab from another surface that `canTakeTab` allows.
3. In `SurfaceArea`, on drop, call `moveTabHere` with no state patch, so the layout puts the key at the end.
4. Skip both when the surface's role is `bar`, `rail` or `overlay`.
5. Remove the end drop from `TabLayout`.
6. In both tab layouts, stop the event of a drop they place.

## Validation

- `test/ui/TabLayout.test.tsx`: a drop on the page area puts the key at the end.
- `test/react/surface-drop.test.tsx`: a drop on a `stack` surface moves the mount there; a drop on a bar does nothing.
- `pnpm test` passes.

## Resume

- Done 2026-11-21: steps 1 to 6.
- With no saved order, a `tab` strip and a stack list mounts by the time they first opened. The surface's drop writes `split.order` with the key at the end, so the tab shows last.
- `test/react/surface-drop.test.tsx` drops on `tab`, `stack` and `single` surfaces, at the end of a strip, on a bar, and a fixed mount.
- `pnpm test` (429 tests), `pnpm typecheck` and `pnpm lint` pass.
