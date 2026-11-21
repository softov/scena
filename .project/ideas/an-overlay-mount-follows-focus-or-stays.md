---
title: An overlay mount follows the focused window or stays on its own
created: 2026-11-21
refs:
  - "[code://packages/scena/src/react/SurfaceArea.tsx#L238-L245](../../packages/scena/src/react/SurfaceArea.tsx#L238-L245) - the whole overlay surface moves to the focused window"
  - "[code://packages/scena/src/react/window-focus.ts](../../packages/scena/src/react/window-focus.ts) - which window has focus"
---

Today the whole `overlay` surface draws in the window that has focus.
That is right for a palette, a quick open or a dialog, which open where the key was pressed.
It also moves what an app keeps on the overlay for good.
ahpw's dock layer, with its bots and shortcuts, jumps to each window that takes focus.
Softov tried it on 2026-11-21, and finds it acceptable for now, since it shows the idea.
The idea: each overlay mount says whether it follows focus or stays on one window, `main` by default.
A dock then stays put while a palette follows.
