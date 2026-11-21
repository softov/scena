---
title: The playground drags a session row
status: done
depends: [task-02-a-list-row-drags-onto-a-surface.md, task-03-a-reopened-tab-keeps-its-title.md]
layer: "playground and docs"
refs:
  - "[code://packages/playground/src/resources/sessions/Explorer.tsx](../../../../packages/playground/src/resources/sessions/Explorer.tsx) - the session list"
  - "[code://docs/architecture.md](../../../../docs/architecture.md) - the surfaces section, which gets the row drag"
---

## Objective

A session row in the playground drags onto any tab surface.
The docs say how an app makes a row drag.

## Files

- `UPDATE: packages/playground/src/resources/sessions/Explorer.tsx` - make each row draggable with `startOpenDrag`.
- `UPDATE: docs/architecture.md` - the open drag beside the tab drag.
- `UPDATE: docs/consuming.md` - how a list row starts an open drag.

## Steps

1. Make each session row draggable, and call `startOpenDrag` with the session's key, resource and title.
2. Call `endOpenDrag` on the row's drag end.
3. Write the open drag in `docs/architecture.md`, beside the tab drag.
4. Write the row drag in `docs/consuming.md`.

## Validation

- Run `pnpm dev` and open `http://localhost:5174`.
- Drag a session row onto `main`, a group edge, the right sidebar's strip and page, and a window.
- Drag the row of an open session onto another surface, and see the tab move.
- Click an open session's row, and see it focused where it is.
- Reload, and see each reopened tab with its title.
- `pnpm typecheck` and `pnpm lint` pass.

## Resume

- Done 2026-11-21: steps 1, 3 and 4. The row uses `Listable`'s `onRowDragStart`.
- Step 2 is not done: `Listable` has no row drag end. A cancelled row drag leaves its record, which only a drag with the open type reads, and the next drag replaces it.
- `pnpm typecheck` and `pnpm lint` pass, and the playground builds.
- Softov's check found the right sidebar drawing the title actions of a tab on `main`, and `main` in tab groups drawing none. Now only the focused tab's strip or group draws them, and the playground's focus mirrors follow focus on every surface.
- Softov checked the playground on 2026-11-21.
