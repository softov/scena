---
title: The playground opens windows
status: todo
depends: [task-04-a-blocked-window-opens-from-a-notice.md, task-05-a-tab-dragged-out-opens-a-window.md]
layer: "playground and docs"
refs:
  - "[code://packages/playground/src/CustomShell.tsx](../../../../packages/playground/src/CustomShell.tsx) - the playground's own shell, which renders `SurfaceWindows`"
  - "[code://packages/playground/src/attach-keybindings.ts#L45](../../../../packages/playground/src/attach-keybindings.ts#L45) - the key listener, which each window gets too"
  - "[code://docs/architecture.md](../../../../docs/architecture.md) - the surfaces section, which gets the windows"
  - "[code://docs/consuming.md](../../../../docs/consuming.md) - the boot steps, which get `SurfaceWindows` and the key listener"
---

## Objective

The playground opens a tab in its own window, in both of its shells, and keys work in the window.
The docs say how an app gets windows.

## Files

- `UPDATE: packages/playground/src/CustomShell.tsx` - render `SurfaceWindows`.
- `UPDATE: packages/playground/src/attach-keybindings.ts:45` - add the key listener to each window on `scena:window:opened`, and remove it on `scena:window:closed`.
- `UPDATE: docs/architecture.md` - say that a window is a `window:<id>` surface with a `window` state, drawn from the main window.
- `UPDATE: docs/consuming.md` - say that a custom shell renders `SurfaceWindows`, and that an app listens for keys in each window.

## Steps

1. Render `SurfaceWindows` in `CustomShell.tsx`.
2. In `attach-keybindings.ts`, listen for keys in each opened window, and stop on its close.
3. Write the window surfaces in `docs/architecture.md`.
4. Write the two app steps in `docs/consuming.md`.

## Validation

- Run `pnpm dev` and open `http://localhost:5174`, with popups allowed for the site.
- Switch `main` to *Tab groups*.
- Drag a tab out of the browser window, and see a window open at the drop point with the tab.
- In the window, split the group, open a tab menu and press a key binding: each acts in the window.
- Drag a tab from the window to `main` and back. Drag the last tab out, and see the window close.
- Switch the theme, and see the window change with it.
- Use *Move into new window* from a tab menu.
- Move and resize the window, press Ctrl+F5, and see it open again at that place and size with its tabs.
- Close the window, and see its tabs on `main`.
- Block popups for the site, press Ctrl+F5, and see the notice; its button opens the window.
- Repeat the drag out with the `CustomShell` shell.
- `pnpm typecheck` and `pnpm lint` pass.

## Resume
