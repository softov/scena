---
title: The playground drags a tab between surfaces
status: todo
depends: [task-02-a-group-takes-a-tab-from-elsewhere.md, task-03-a-strip-takes-a-tab-from-elsewhere.md]
layer: "playground and docs"
refs:
  - "[code://packages/playground/src/layout-modes.ts#L26](../../../../packages/playground/src/layout-modes.ts#L26) - the `tab-panel` mode of `main`"
  - "[code://packages/playground/src/CustomShell.tsx](../../../../packages/playground/src/CustomShell.tsx) - the shell that draws the surfaces"
  - "[code://packages/playground/src/App.tsx#L42](../../../../packages/playground/src/App.tsx#L42) - the playground keeps its layout but not its mounts"
  - "[code://packages/scena/src/core/controls/storage/session-local.ts](../../../../packages/scena/src/core/controls/storage/session-local.ts) - `createLocalStorageSessionStorage`, to keep the mounts"
  - "[code://docs/architecture.md](../../../../docs/architecture.md) - the surfaces section, which gets the move"
---

## Objective

The playground shows tabs on `main` and on the right sidebar, so a person can drag one between them.
One playground tab has `movable: false`, to show a refused drop.
The playground keeps its mounts across a reload, so a moved tab stays moved.
The docs say how a tab moves and how an app keeps one in place.

## Files

- `UPDATE: packages/playground/src/register-shell.ts` - open two tabs on the right sidebar with the `tab` layout, one of them with `movable: false`.
- `UPDATE: packages/playground/src/App.tsx:42` - pass `sessionStorage` from `createLocalStorageSessionStorage`, restore the snapshot at boot and turn on `enableAutoPersist`.
- `UPDATE: docs/architecture.md` - say that a tab drags between surfaces, that `surfaces.move` does it, and what `movable: false` does.
- `UPDATE: docs/consuming.md` - say that an app reads the new surface from `scena:mount:opened`.

## Steps

1. Open two tabs on `sidebar:right` in the playground, with the `tab` layout.
2. Set `policy.movable: false` on one of them, with a title that says it stays.
3. Keep the playground's mounts with `createLocalStorageSessionStorage`, `session.restore` at boot and `enableAutoPersist`.
4. Write the move and `movable` in `docs/architecture.md`, in the section on surfaces.
5. Write the `scena:mount:opened` note in `docs/consuming.md`.

## Validation

- Run `pnpm dev` and open `http://localhost:5174`.
- Switch `main` to *Tab groups*.
- Drag a tab from `main` to the right sidebar strip, and back to a group centre and a group edge.
- Drag the fixed tab, and see the not-allowed cursor and no move.
- Reload, and see each tab on its new surface.
- `pnpm typecheck` and `pnpm lint` pass.

## Resume
