---
title: A component marks a drop area
status: todo
depends: []
layer: "scena sdk, react and ui/layout"
refs:
  - "[code://packages/scena/src/react/surface-drop.ts](../../../../packages/scena/src/react/surface-drop.ts) - the drag in progress, the payload readers"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L145](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L145) - the tab drag's `effectAllowed`"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L149](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L149) - the same in a tab group"
---

## Objective

`useDropArea({ accepts, onDrop })` gives a component the props of a drop area and `over`.
A tab or a row dropped on it calls `onDrop` with a `DroppedThing`, and the surface does not take it.

## Files

- `UPDATE: packages/scena/src/sdk/tab-drag.ts` - `DroppedThing`: `key`, `resource`, `title`, `surface`, `from`.
- `UPDATE: packages/scena/src/react/surface-drop.ts` - `describeDrop`, `describeDragInProgress` and `useDropArea`.
- `UPDATE: packages/scena/src/ui/layout/TabLayout.tsx:145` - a tab drag allows `copyMove`.
- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx:149` - the same.
- `UPDATE: packages/scena/src/react/index.ts` - export `useDropArea` and the type.
- `CREATE: packages/scena/test/react/drop-area.test.tsx` - the hook in a surface.

## Steps

1. Define `DroppedThing` in the sdk, with `from` as `tab` or `row`.
2. Write `describeDrop(scena, data)`, which reads a tab payload or a row payload and returns a `DroppedThing`, or `null`.
3. For a tab, take the resource and the title from its mount; for a row, from the payload.
4. Write `describeDragInProgress(scena, types)`, which does the same from the drag in progress, for `dragover`.
5. Write `useDropArea({ accepts, onDrop })`, which returns `{ over, props }` with `onDragOver`, `onDragLeave` and `onDrop`.
6. In `onDragOver`, call `accepts`; when it holds, prevent the default, stop the event, set `dropEffect` to `copy` and set `over`.
7. In `onDrop`, describe the drop, call `onDrop`, stop the event, and clear the drag in progress.
8. Set a tab drag's `effectAllowed` to `copyMove` in both tab layouts.

## Validation

- `test/react/drop-area.test.tsx`: an area inside a surface takes a tab, and the tab stays on its surface.
- The same test: `onDrop` gets the tab's key, resource, title and surface.
- The same test: an area takes a row, with its payload.
- The same test: an area whose `accepts` is false lets the surface take the drop.
- `pnpm test` passes.

## Resume
