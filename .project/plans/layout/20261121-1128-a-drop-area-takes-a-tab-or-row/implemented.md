---
title: A drop area takes a tab or a row - implemented
date: 2026-11-21
refs:
  - git://5602f16 - the last code commit before this record, the graph component
  - "[code://packages/scena/src/react/surface-drop.ts](../../../../packages/scena/src/react/surface-drop.ts) - `useDropArea`, `describeDrop` and `describeDragInProgress`"
  - "[code://packages/scena/src/ui/layout/DropArea.tsx](../../../../packages/scena/src/ui/layout/DropArea.tsx) - the graph component"
---

An app marks an element inside a page as a drop area.
A tab or a row dropped on it goes to the area, and the tab stays where it was.
A component uses `useDropArea`, and a graph page holds a `DropArea`.
The playground's session composer takes a session, a user or a file as a reference.

## What was built

- [`code://packages/scena/src/sdk/tab-drag.ts`](../../../../packages/scena/src/sdk/tab-drag.ts) - `DroppedThing`.
- [`code://packages/scena/src/react/surface-drop.ts`](../../../../packages/scena/src/react/surface-drop.ts) - `describeDrop`, `describeDragInProgress` and `useDropArea`.
- [`code://packages/scena/src/ui/layout/DropArea.tsx`](../../../../packages/scena/src/ui/layout/DropArea.tsx) and [`code://packages/scena/src/ui/layout/DropArea.css`](../../../../packages/scena/src/ui/layout/DropArea.css) - the graph component, in the layout catalog.
- A tab drag allows `copyMove`, in both tab layouts.
- The playground: the session composer's reference chips, and a `DropArea` in the "Drag me" page.
- [`code://docs/architecture.md`](../../../../docs/architecture.md) and [`code://docs/consuming.md`](../../../../docs/consuming.md) - the drop area.

## Verified

- `pnpm test`: 454 tests pass. New: `test/react/drop-area.test.tsx` (4) and `test/ui/DropArea.test.tsx` (2).
- `pnpm typecheck` passes in the three workspaces, `pnpm lint` passes, and the playground builds.
- Not checked by hand in the playground: Softov asked to commit on 2026-11-21, before a check was reported.

## Departures from the plan

- None.

## Left for later

- The check by hand in task 03's *Validation*.
- An item kind registry, as the ahpw brief describes. Softov chose the key and the resource for now.
- An area that moves a tab; its `onDrop` can call `surfaces.move` itself.
