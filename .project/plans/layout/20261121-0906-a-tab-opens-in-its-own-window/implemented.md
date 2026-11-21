---
title: A tab opens in its own window - implemented
date: 2026-11-21
refs:
  - git://ed45633 - the last code commit before this record, the reopen fix
  - "[code://packages/scena/src/react/SurfaceWindows.tsx](../../../../packages/scena/src/react/SurfaceWindows.tsx) - opens, draws, tracks and closes the windows"
  - "[code://packages/scena/src/sdk/window-surface.ts](../../../../packages/scena/src/sdk/window-surface.ts) - the window surface names and `WindowBounds`"
  - "[code://packages/scena/src/runtime/open-tab-window.ts](../../../../packages/scena/src/runtime/open-tab-window.ts) - a tab moves into a new window"
---

A person drags a tab out of the browser window, and it opens in a window of its own at the drop point.
The tab menu has *Move into new window* too.
The window has tab groups, the page's styles and theme, and tabs drag between it and `main`.
Closing it sends its tabs to `main`.
After a reload, the windows open again at their place and size, with their tabs.
When the browser blocks one, a notice offers a button that opens it.

## What was built

- [`code://packages/scena/src/react/OwnerDocument.tsx`](../../../../packages/scena/src/react/OwnerDocument.tsx) - the document a subtree is drawn into. `Popup`, `ActionList`, `SpatialLayout` and `TabPanelLayout` read it.
- [`code://packages/scena/src/sdk/window-surface.ts`](../../../../packages/scena/src/sdk/window-surface.ts) - `WindowBounds`, `windowSurface`, `isWindowSurface`, `newWindowSurface`, `removeSurface`; `SurfaceLayoutState.window` and three window events.
- [`code://packages/scena/src/react/SurfaceWindows.tsx`](../../../../packages/scena/src/react/SurfaceWindows.tsx) and [`code://packages/scena/src/react/window-styles.ts`](../../../../packages/scena/src/react/window-styles.ts) - the windows, and the copy of the styles and theme.
- [`code://packages/scena/src/react/BlockedWindows.tsx`](../../../../packages/scena/src/react/BlockedWindows.tsx) - the notice for blocked windows.
- [`code://packages/scena/src/runtime/open-tab-window.ts`](../../../../packages/scena/src/runtime/open-tab-window.ts) - `openTabWindow` and where a window goes; `tab.moveToNewWindow` in `layout-commands.ts`.
- [`code://packages/scena/src/core/graph/mount-surface.ts`](../../../../packages/scena/src/core/graph/mount-surface.ts) - `surfaces.open` focuses an open key where it is.
- The playground draws the windows in `CustomShell`, listens for keys in each one, and reopens their tabs.

## Verified

- `pnpm test`: 424 tests pass, `pnpm typecheck` passes in the three workspaces, and `pnpm lint` passes.
- New tests: `test/react/OwnerDocument.test.tsx`, `test/sdk/window-surface.test.ts`, `test/react/SurfaceWindows.test.tsx` (10), `test/runtime/open-tab-window.test.ts`, a drag-out case in `test/ui/TabPanelLayout.test.tsx`, and `test/core/reopen.test.ts`.
- Softov checked the playground on 2026-11-21, and said it worked.

## Departures from the plan

- `useOwnerDocument()` reads a context and takes no element.
- The saved size is `innerWidth` and `innerHeight`, which `window.open` takes.
- An unmount closes the windows a tick later, for React's development remount.
- An effect removes a window surface that a still-drawn layout made again after its removal.
- The notice's styles are in `styles/surface.css`, beside those of `CloseConfirm`.
- Softov's check found that `surfaces.open` moved an open tab back to the surface it named. Softov set the rules on 2026-11-21, and `ed45633` builds them.
  A first open goes to `surface`, an open key is focused where it is, and a closed key opens as the first time.
  `session.restore` now calls `move`.

## Left for later

- ahpw: keep the tabs of window surfaces, render `SurfaceWindows` in its shell, and listen for keys in each window. That is a plan in ahpw once a scena release has this.
- *Move into new window* places the window beside the main page, even from a menu in a second window.
- A restored tab has no title until its page sets one.
