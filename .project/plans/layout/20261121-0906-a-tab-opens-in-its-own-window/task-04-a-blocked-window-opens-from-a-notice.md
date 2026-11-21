---
title: A blocked window opens from a notice
status: todo
depends: [task-03-a-window-surface-is-drawn.md]
layer: "scena react"
refs:
  - https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/auxiliaryWindow/browser/auxiliaryWindowService.ts - VS Code's dialog with *Retry* when the browser blocks a window
---

## Objective

When the browser blocks one or more windows, the main window shows a notice with a button that opens them.
The button is a click, so the browser lets the windows open.
A person can also dismiss the notice, and the tabs of the blocked windows go to `main`.

## Files

- `CREATE: packages/scena/src/react/BlockedWindows.tsx` - the notice, drawn by `SurfaceWindows`.
- `CREATE: packages/scena/src/react/BlockedWindows.css` - the notice's look, from the theme tokens.
- `UPDATE: packages/scena/src/react/SurfaceWindows.tsx` - keep the blocked surfaces, draw the notice, and open them again from its button.
- `UPDATE: packages/scena/test/react/SurfaceWindows.test.tsx` - the notice cases.

## Steps

1. In `SurfaceWindows`, keep the set of blocked surfaces.
2. Draw `BlockedWindows` when the set is not empty, with the count of blocked windows.
3. On the button's click, call the open of each blocked surface again, in the same click handler.
4. Remove a surface from the set when its window opens.
5. On dismiss, move the mounts of each blocked surface to `main`, and remove those surfaces.
6. Write the notice's text, its button and its dismiss with `translate(key, fallback)`, as [`layout-commands.ts`](../../../../packages/scena/src/runtime/layout-commands.ts#L141) does.

## Validation

- `test/react/SurfaceWindows.test.tsx`: with `window.open` returning `null`, the notice shows.
- The same test: when the stub returns a window, the button opens it and the notice goes.
- The same test: dismiss moves the tabs to `main`.
- `pnpm test` passes.

## Resume
