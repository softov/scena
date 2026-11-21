---
title: A window surface is drawn in a window
status: todo
depends: [task-01-the-ui-acts-in-its-own-document.md, task-02-a-window-surface-keeps-its-place.md]
layer: "scena react"
refs:
  - "[code://packages/scena/src/react/SurfaceArea.tsx#L101-L131](../../../../packages/scena/src/react/SurfaceArea.tsx#L101-L131) - the area a window draws through a portal"
  - "[code://packages/scena/src/react/DefaultShell.tsx#L69](../../../../packages/scena/src/react/DefaultShell.tsx#L69) - the shell that renders `SurfaceWindows`"
  - "[code://packages/scena/src/styles/index.ts#L45-L84](../../../../packages/scena/src/styles/index.ts#L45-L84) - the theme attribute and the theme links the window copies"
  - https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/auxiliaryWindow/browser/auxiliaryWindowService.ts - the window features, the style copy and the `MutationObserver`
---

## Objective

`SurfaceWindows` opens a browser window for each window surface and draws the surface into it from the main window.
The window has the main window's styles and theme, and follows their changes.
The window's place and size go back to the layout state.
A window a person closes sends its tabs to `main`, and a reload keeps them.

## Files

- `CREATE: packages/scena/src/react/SurfaceWindows.tsx` - opens, draws, tracks and closes the windows.
- `CREATE: packages/scena/src/react/window-styles.ts` - `mirrorStyles(from, to)`, which copies the head's style sheets and the root's attributes and inline style, and follows changes.
- `CREATE: packages/scena/test/react/SurfaceWindows.test.tsx` - the windows with a stubbed `window.open`.
- `UPDATE: packages/scena/src/react/DefaultShell.tsx:69` - render `SurfaceWindows`.
- `UPDATE: packages/scena/src/react/index.ts` - export `SurfaceWindows`.

## Steps

1. In `SurfaceWindows`, read the layout and list the visible surfaces with `isWindowSurface` and a `window` state.
2. For each new one, call `window.open('about:blank', '', features)` with `popup=yes` and the bounds; use an empty URL on Firefox.
3. When `window.open` returns `null`, emit `scena:window:blocked` and keep the surface.
4. Set the window's title from its active tab, and call `mirrorStyles(document, popup.document)`.
5. Render `createPortal` of the `OwnerDocument` context and a `SurfaceArea` with the `tab-panel` layout into the window's `body`.
6. Emit `scena:window:opened` with the surface and the window.
7. On the window's `resize` and on a one-second check, write `screenX`, `screenY`, `outerWidth` and `outerHeight` to `window` with `setSurface`.
8. On the main window's `pagehide`, mark that the page is leaving.
9. On a window's `pagehide` while the page stays, move its mounts to `main` and call `removeSurface`.
10. When a surface leaves the layout state, close its window, stop its check and emit `scena:window:closed`.
11. Remove a window surface whose `tab-panel` tree has no tab left.
12. In `mirrorStyles`, clone each `link[rel=stylesheet]` and `style`, follow the head with a `MutationObserver`, and copy `adoptedStyleSheets` once.
13. In `mirrorStyles`, copy the root's `data-theme` and its inline style, and follow them with a second `MutationObserver`.
14. Render `SurfaceWindows` in `DefaultShell`, and export it.

## Validation

- `test/react/SurfaceWindows.test.tsx`, with `window.open` stubbed to return a second jsdom window:
- A window surface in the layout opens one window, with the bounds in its features, and draws its tabs there.
- A style added to the main head after the open shows in the window's head.
- A `pagehide` of the window moves its mounts to `main` and removes the surface.
- A `pagehide` of the main window, then of the window, keeps the surface and its mounts.
- A `null` from `window.open` emits `scena:window:blocked`.
- `pnpm test` passes.

## Resume
