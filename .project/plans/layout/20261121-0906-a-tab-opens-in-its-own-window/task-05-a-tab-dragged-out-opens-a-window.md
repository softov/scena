---
title: A tab dragged out opens a window
status: done
depends: [task-03-a-window-surface-is-drawn.md]
layer: "scena ui/layout and runtime"
refs:
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L326-L330](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L326-L330) - the tab drag start, which gets a drag end"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L126-L130](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L126-L130) - the `tab` layout's drag start, which gets the same drag end"
  - "[code://packages/scena/src/runtime/layout-commands.ts#L140-L230](../../../../packages/scena/src/runtime/layout-commands.ts#L140-L230) - the `tab:context` commands, the pattern for *Move into new window*"
---

## Objective

A tab dropped outside the browser window opens a new window at the drop point, with that tab in it.
The tab menu has *Move into new window*, which does the same at a place near the main window.
A mount with `movable: false` does neither.

## Files

- `CREATE: packages/scena/src/runtime/open-tab-window.ts` - `openTabWindow(scena, key, bounds)`, which adds a window surface and moves the mount into it.
- `CREATE: packages/scena/test/runtime/open-tab-window.test.ts` - the new surface and the move.
- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx:326-330` - add a drag end on the tab that opens a window for a drop outside.
- `UPDATE: packages/scena/src/ui/layout/TabLayout.tsx:126-130` - add the same drag end.
- `UPDATE: packages/scena/src/runtime/layout-commands.ts:140-230` - add `tab.moveToNewWindow` in the `tab:context` slot.

## Steps

1. Write `openTabWindow`, which takes a name from `newWindowSurface`, writes its state with `window`, `layout: 'tab-panel'` and `visible: true`, then calls `surfaces.move`.
2. In `openTabWindow`, remove the key from a `tab-panel` source tree with `removeTab`, as plan 1's `moveTabHere` does.
3. In each layout, on the tab's drag end, check `dropEffect` is `none` and the point is outside the viewport.
4. Skip the window when `canMoveTo` is `false` for the mount.
5. Take the bounds from `screenX` and `screenY` of the event, with a default size of 800 by 600.
6. When `screenX` and `screenY` are both `0`, take the main window's place with an offset of 40 pixels.
7. Add `tab.moveToNewWindow` to the `tab:context` slot, with a `when` that the mount can move.
8. Write the command's title with `translate('tabs/moveToNewWindow', 'Move into new window')`.

## Validation

- `test/runtime/open-tab-window.test.ts`: the mount moves to `window:1`, the state has the bounds, and a second call makes `window:2`.
- The same test: a `tab-panel` source no longer holds the key.
- The same test: a mount with `movable: false` stays.
- `pnpm test` passes.

## Resume

- Done 2026-11-21: steps 1 to 8. `droppedAt`, `besideWindow` and `endedOutside` are in `runtime/open-tab-window.ts` beside `openTabWindow`.
- The tab layouts set `$/tab/movable` in the tab menu, and the command's `when` reads it. Other layouts leave it unset, so they do not offer the command.
- The command places the window beside the main window, even when its menu opened in a second window.
- The browser opens the window from `SurfaceWindows` after the layout change. A drag that lasts longer than the browser lets a click count may be blocked; the notice of task 04 then opens it.
- `pnpm test` (419 tests, 8 new), `pnpm typecheck` and `pnpm lint` pass.
