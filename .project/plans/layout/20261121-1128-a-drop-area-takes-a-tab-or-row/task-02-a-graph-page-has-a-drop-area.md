---
title: A graph page has a drop area
status: todo
depends: [task-01-a-component-marks-a-drop-area.md]
layer: "scena ui/layout"
refs:
  - "[code://packages/scena/src/ui/control/ButtonBar.tsx](../../../../packages/scena/src/ui/control/ButtonBar.tsx) - `command` and `args`"
  - "[code://packages/scena/src/ui/layout/Column.tsx](../../../../packages/scena/src/ui/layout/Column.tsx) - a graph component that draws its children"
  - "[code://packages/scena/src/ui/layout/catalog.ts](../../../../packages/scena/src/ui/layout/catalog.ts) - where it registers"
---

## Objective

`DropArea` is a graph component that draws its children and takes a drop.
It runs `command` with `args` and the dropped thing as `drop`, when the thing's component is in `accepts`.

## Files

- `CREATE: packages/scena/src/ui/layout/DropArea.tsx` - the component.
- `UPDATE: packages/scena/src/ui/layout/catalog.ts` - register `DropArea`.
- `UPDATE: packages/scena/src/ui/index.ts` - export it.
- `UPDATE: packages/scena/src/styles/layout.css` - the look of an area while a drag is over it.
- `CREATE: packages/scena/test/ui/DropArea.test.tsx` - the component in a graph.

## Steps

1. Write `DropArea` with `children`, `accepts`, `command`, `args`, `label` and `style`, on `useDropArea`.
2. With no `accepts`, take any tab or row; with `accepts`, only those whose resource's component is in it.
3. On drop, run `command` with `{ ...args, drop }`.
4. Set `data-drop-over` while a drag it takes is over it, and style it in `layout.css`.
5. Register it in the layout catalog, and export it.

## Validation

- `test/ui/DropArea.test.tsx`: a graph node with a `DropArea` runs its command with the dropped key and resource.
- The same test: a component not in `accepts` is not taken.
- `pnpm test` passes.

## Resume
