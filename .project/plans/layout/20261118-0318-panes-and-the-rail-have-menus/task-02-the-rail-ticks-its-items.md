---
title: The rail ticks its items
status: todo
depends: []
layer: "scena ui/layout, sdk"
refs:
  - "[code://packages/scena/src/ui/layout/RailLayout.tsx#L27-L75](../../../../packages/scena/src/ui/layout/RailLayout.tsx#L27-L75) - the rail, which draws every mount"
  - "[code://packages/scena/src/sdk/layout.ts#L136-L155](../../../../packages/scena/src/sdk/layout.ts#L136-L155) - `stack`, the state shape to copy"
---

## Objective

A right-click on the activity bar shows a tick for each activity item, then the `rail:context` slot.
An unticked item leaves the bar, and stays hidden after a reload.

## Files

- `UPDATE: packages/scena/src/sdk/layout.ts:136-155` - `SurfaceLayoutState` gains `rail?: { hidden?: string[] }`.
- `UPDATE: packages/scena/src/ui/layout/RailLayout.tsx:27-75` - the rail leaves hidden mounts out and opens its menu on a right-click.
- `CREATE: packages/scena/test/ui/RailLayout.test.tsx` - tests for the ticks and the hidden items.

## Steps

1. Add `rail?: { hidden?: string[] }` to `SurfaceLayoutState`, with a comment that it holds the mount keys a person unticked.
2. Make `RailLayout` take `state` and `setState` from `LayoutProps`.
3. Leave out of both groups each mount whose key is in `state.rail.hidden`.
4. Read a literal `hideable` prop on the root node, as `posOf` reads `pos`.
5. Build one tick row for each mount whose `hideable` is not `false`.
6. Order the rows as the top group, then the bottom group.
7. Title each row with `resolveLabel` of the node's `label`, and fall back to the mount key.
8. Make a tick row toggle its key in `rail.hidden` through `setState`, and close the menu.
9. Open a `ContextMenu` on a right-click on the rail root, with `extraItems` as the ticks and `query: { slot: 'rail:context' }`.
10. Give the menu a `$/surface/name` context with the surface name.

## Validation

- `test/ui/RailLayout.test.tsx` holds these cases: a right-click lists one tick for each hideable mount, and none for a mount with `hideable: false`.
- An unticked mount is not drawn, and a ticked one comes back.
- A right-click on an item opens the same menu as a right-click on the empty rail.
- `pnpm typecheck` passes.

## Resume

