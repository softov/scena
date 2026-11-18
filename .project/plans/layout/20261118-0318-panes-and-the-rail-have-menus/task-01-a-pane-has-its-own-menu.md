---
title: A pane has its own menu
status: todo
depends: []
layer: "scena ui/layout"
refs:
  - "[code://packages/scena/src/ui/layout/StackLayout.tsx#L140-L166](../../../../packages/scena/src/ui/layout/StackLayout.tsx#L140-L166) - the pane header and background handlers"
  - "[code://packages/scena/src/ui/layout/StackHeader.tsx#L53-L62](../../../../packages/scena/src/ui/layout/StackHeader.tsx#L53-L62) - the tick toggle to share"
---

## Objective

A right-click on a pane header in a stack shows "Hide '<pane>'" and the pane ticks, then the `pane:context` slot.
A right-click on the stack background shows the pane ticks, then the `surface:context` slot.

## Files

- `CREATE: packages/scena/src/ui/layout/pane-ticks.ts` - `paneTicks`, the tick rows for every pane, and `hidePaneRow`, the "Hide '<pane>'" row.
- `UPDATE: packages/scena/src/ui/layout/StackHeader.tsx:53-140` - the `...` menu takes its rows from `paneTicks`.
- `UPDATE: packages/scena/src/ui/layout/StackLayout.tsx:140-330` - the header menu opens `pane:context` with the hide row and the ticks; the background menu puts the ticks ahead of `surface:context`.
- `UPDATE: packages/scena/test/ui/StackLayout.test.tsx` - tests for both menus.

## Steps

1. Move the tick rows of `StackHeader` into `paneTicks(scena, ordered, hidden, setHidden)` in `pane-ticks.ts`.
2. Make each tick row toggle its key in `stack.hidden` and close the menu, as the `...` menu does now.
3. Write `hidePaneRow(scena, mount, hidden, setHidden)`, titled with `translate('layout/hidePane', "Hide '{title}'")` and `resolveMountTitle`.
4. Make the `...` menu in `StackHeader` use `paneTicks`.
5. In `StackLayout`, open the pane header menu with `query: { slot: 'pane:context' }` and `extraItems: [hidePaneRow, ...paneTicks]`.
6. Put a separator between the hide row and the ticks, as `ActionList` parts groups.
7. Give the pane header menu a `$/pane/key` and a `$/pane/index` context, and remove the `$/tab/*` keys from it.
8. Make the background menu pass `extraItems: paneTicks` ahead of `surface:context`.
9. Keep the `e.target !== e.currentTarget` check on the background handler.

## Validation

- In `test/ui/StackLayout.test.tsx`, a header right-click shows the hide row and one tick for each pane.
- The header menu has no "Close tab" row.
- The hide row adds the pane to `stack.hidden`, and the pane leaves the stack.
- A background right-click shows the ticks and the "Close all" row.
- A right-click inside a pane body that has its own menu does not open the pane menu.
- `pnpm typecheck` passes.

## Resume

