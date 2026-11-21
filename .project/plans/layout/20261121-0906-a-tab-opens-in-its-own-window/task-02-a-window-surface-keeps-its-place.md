---
title: A window surface keeps its place
status: done
depends: []
layer: "scena sdk and core"
refs:
  - "[code://packages/scena/src/sdk/layout.ts#L91-L158](../../../../packages/scena/src/sdk/layout.ts#L91-L158) - `SurfaceLayoutState`, which gets `window`"
  - "[code://packages/scena/src/core/controls/layout.ts#L173-L190](../../../../packages/scena/src/core/controls/layout.ts#L173-L190) - the whole state is saved and loaded, so `window` is kept"
  - "[code://packages/scena/src/sdk/events.ts](../../../../packages/scena/src/sdk/events.ts) - the event map, which gets the window events"
---

## Objective

A surface whose state has `window` is a browser window, with its place and size kept in the layout state.
The sdk names a window surface and tells one from another surface.
The event map has the window events.

## Files

- `CREATE: packages/scena/src/sdk/window-surface.ts` - `WindowBounds`, `windowSurface(id)`, `isWindowSurface(name)`, `newWindowSurface(layout)` and `removeSurface(layout, name)`.
- `CREATE: packages/scena/test/sdk/window-surface.test.ts` - the names and the removal.
- `UPDATE: packages/scena/src/sdk/layout.ts:91-158` - add `window?: WindowBounds` to `SurfaceLayoutState`, with a comment.
- `UPDATE: packages/scena/src/sdk/events.ts` - add `scena:window:opened`, `scena:window:closed` and `scena:window:blocked`.
- `UPDATE: packages/scena/src/sdk/index.ts` - export the new module.

## Steps

1. Define `WindowBounds` as `{ left, top, width, height }` in screen pixels.
2. Add `window?: WindowBounds` to `SurfaceLayoutState`, with a comment that a browser window draws such a surface.
3. Write `windowSurface(id)`, which returns `window:<id>`, and `isWindowSurface(name)`.
4. Write `newWindowSurface(layout)`, which returns the first `window:<n>` that the layout does not hold.
5. Write `removeSurface(layout, name)`, which returns the layout without that surface.
6. Add the three events to the event map, each with `surface`, and `window: Window` on opened and closed.
7. Export the module from `sdk/index.ts`.

## Validation

- `test/sdk/window-surface.test.ts`: `newWindowSurface` skips taken numbers; `isWindowSurface` is `false` for `main` and `detached`; `removeSurface` keeps the other surfaces.
- A layout with a window surface saves and loads back with its `window` and `tabPanel`, through `createLocalStorageLayoutStorage`.
- `pnpm test` and `pnpm typecheck` pass.

## Resume

- Done 2026-11-21: steps 1 to 7. The window events carry `window: Window` on opened and closed.
- `test/sdk/window-surface.test.ts` also saves a window surface and loads it back in a second scena.
- `pnpm typecheck` and `pnpm lint` pass, and the 4 new tests pass.
