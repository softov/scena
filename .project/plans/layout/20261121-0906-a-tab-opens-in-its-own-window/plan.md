---
title: A tab opens in its own window
domain: layout
status: active
priority: medium
created: 2026-11-21
revalidated: 2026-11-21
requires:
  - plans/layout/20261121-0906-a-tab-drags-between-surfaces/plan.md
changes: []
creates: []
refs:
  - git://3756caa - the commit of scena this plan was checked at
  - git://490d6e3 - the last commit that holds the brief this plan covers, `briefs/a-tab-opens-in-its-own-window.md`
  - "[code://packages/scena/src/sdk/mount-surface.ts#L30-L40](../../../../packages/scena/src/sdk/mount-surface.ts#L30-L40) - `SurfaceName` takes any string, so `window:<id>` needs no new type"
  - "[code://packages/scena/src/sdk/layout.ts#L91-L158](../../../../packages/scena/src/sdk/layout.ts#L91-L158) - `SurfaceLayoutState`, which gets the place and size of a window"
  - "[code://packages/scena/src/core/controls/layout.ts#L173-L190](../../../../packages/scena/src/core/controls/layout.ts#L173-L190) - the layout state is saved and loaded whole, so a window surface is kept with no new storage"
  - "[code://packages/scena/src/core/controls/session.ts#L33-L55](../../../../packages/scena/src/core/controls/session.ts#L33-L55) - `snapshot` keeps the mounts of every surface, a window's too"
  - "[code://packages/scena/src/react/SurfaceArea.tsx#L101-L131](../../../../packages/scena/src/react/SurfaceArea.tsx#L101-L131) - `SurfaceArea`, which a window draws through a portal"
  - "[code://packages/scena/src/react/DefaultShell.tsx#L69](../../../../packages/scena/src/react/DefaultShell.tsx#L69) - `DefaultShell`, which gets `SurfaceWindows`"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L304-L330](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L304-L330) - the window drag end listeners and the tab drag start, where a drag out is caught"
  - "[code://packages/scena/src/ui/overlay/Popup.tsx#L55-L131](../../../../packages/scena/src/ui/overlay/Popup.tsx#L55-L131) - a popup clamps to the global `window` and portals into the global `document.body`"
  - "[code://packages/scena/src/ui/menu/ActionList.tsx#L450](../../../../packages/scena/src/ui/menu/ActionList.tsx#L450) - a key listener on the global `document`"
  - "[code://packages/scena/src/ui/layout/SpatialLayout.tsx#L284-L290](../../../../packages/scena/src/ui/layout/SpatialLayout.tsx#L284-L290) - a key listener on the global `window`"
  - "[code://packages/scena/src/styles/index.ts#L45-L84](../../../../packages/scena/src/styles/index.ts#L45-L84) - `applyTheme` writes on one root, and `ensureCssLink` writes to the global `document.head`"
  - "[code://packages/scena/src/runtime/layout-commands.ts#L140-L230](../../../../packages/scena/src/runtime/layout-commands.ts#L140-L230) - the `tab:context` commands, where *Move into new window* goes"
  - "[code://packages/playground/src/attach-keybindings.ts#L45](../../../../packages/playground/src/attach-keybindings.ts#L45) - the playground listens for keys on its own `window` only"
  - "[code://packages/playground/src/CustomShell.tsx](../../../../packages/playground/src/CustomShell.tsx) - the playground's own shell, which also gets `SurfaceWindows`"
  - https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/auxiliaryWindow/browser/auxiliaryWindowService.ts - how VS Code opens a window, copies its styles and asks for a retry, read 2026-11-21
  - https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/browser/parts/editor/editorParts.ts - how VS Code keeps and restores its windows, read 2026-11-21
---

## Goal

A person drags a tab out of the browser window, and the tab opens in a new window at the drop point.
The window has tab groups, and tabs drag between it, `main` and other windows.
A tab menu item opens a tab in a new window too.
When a person closes a window, its tabs go back to `main`.
After a reload, the windows open again at their place and size, with their tabs.
When the browser blocks a window, a notice offers a button that opens it.

## Reconnaissance

The files read and the patterns to reuse are the `refs` in the frontmatter, each with its note.

### Searches performed

- `rg -n "detached" packages/scena/src` - the `detached` surface has a default state and the `single` layout; nothing draws it.
- `rg -lE "(window|document)\.(addEventListener|body|head|innerWidth|innerHeight)" packages/scena/src/ui packages/scena/src/react` - four files: `Popup.tsx`, `ActionList.tsx`, `SpatialLayout.tsx`, `TabPanelLayout.tsx`.
- `rg -n "createPortal" packages/scena/src` - only `Popup.tsx`, into `document.body`.
- `rg -n "sessionStorage" packages/playground/src` - the playground keeps no mounts; plan 1's task 04 adds it.

### Runtime path

```
dragend outside the viewport -> openTabWindow -> layout.setSurface('window:<id>', { window: bounds, layout: 'tab-panel' }) -> surfaces.move
SurfaceWindows (main window) -> window.open('about:blank') -> copy styles -> createPortal(<SurfaceArea surface='window:<id>'/>, popup.document.body)
popup pagehide (not the main unload) -> move each mount to main -> remove the surface
reload -> layout loads window surfaces -> SurfaceWindows opens each -> blocked ones -> notice with a button
```

### Gaps

- `Not found: a place and size of a browser window in SurfaceLayoutState - searched window, bounds, screenX in sdk/layout.ts.`
- `Not found: a way to remove a surface from the layout state - searched delete, removeSurface in core/controls/layout.ts.` `layout.set` writes the whole state, which removes one.
- Nothing acts on a drag that ends outside the browser window.
- Four UI files use the global `window` or `document`, so they act on the main window from a second window.
- The theme writes on one root element, so a second window has no theme.

## Answers

| What | Source | Task |
| --- | --- | --- |
| Each window is its own surface, `window:<id>`; `detached` stays as it is | "window:<id> each (Recommended)", Softov, 2026-11-21 | 02 |
| After a reload, scena opens the windows by itself, and a notice offers the blocked ones | "Try, then notice (Recommended)", Softov, 2026-11-21 | 04 |
| A window a person closes sends its tabs to `main` | "Move back to main (Recommended)", Softov, 2026-11-21 | 03 |
| A reload or a close of the main window keeps the windows to reopen | (defaulted: the main window's `pagehide` marks the close as not a person's close) | 03 |
| A window loads `about:blank`, as VS Code does | (defaulted: it has the opener's origin and loads no app code) | 03 |
| The place and size are `screenX`, `screenY`, `outerWidth` and `outerHeight`, read on `resize` and on a one-second check while open | (defaulted: a browser has no event for a window move) | 03 |
| A window's layout is `tab-panel` | the brief at `git://490d6e3` | 02 |
| A drop outside is a `dragend` with `dropEffect` `none` and a point outside the viewport | the brief at `git://490d6e3` | 05 |
| `DefaultShell` draws `SurfaceWindows`; an app with its own shell adds it | (defaulted: an app that composes `SurfaceArea` itself already draws its own surfaces) | 03 |
| scena emits `scena:window:opened` and `scena:window:closed` with the `Window`, so an app adds its key listener | (defaulted: the keybindings registry does not listen; the app does, as [`attach-keybindings.ts`](../../../../packages/playground/src/attach-keybindings.ts#L45) shows) | 03 |
| Dismissing the notice sends the blocked windows' tabs to `main` | (defaulted: the same as a person's close of a window) | 04 |
| A mount with `movable: false` does not open in a window | plan 1, "Movable unless opted out (Recommended)", Softov, 2026-11-21 | 05 |

## Proposed architecture

- **Data flow** - A window surface's state holds `window: { left, top, width, height }` beside its `tabPanel` tree. Its mounts are ordinary mounts on that surface.
- **Event flow** - `scena:window:opened`, `scena:window:closed` and `scena:window:blocked`, each with the surface name. The first two carry the `Window`.
- **State flow** - The layout state is the only record of which windows exist. `SurfaceWindows` opens a window for each surface whose state has `window`, and closes the ones that went away.
- **Layer responsibilities**
  - sdk: the `window` field, `windowSurface()`, `isWindowSurface()` and the events.
  - react: `SurfaceWindows` and `useOwnerDocument`.
  - ui: the four files read their own document. The tab layouts open a window on a drag out.
  - runtime: `openTabWindow` and *Move into new window*.
  - playground: draws the windows and listens for keys in each one.
- **Source-of-truth files** - [`code://packages/scena/src/sdk/layout.ts`](../../../../packages/scena/src/sdk/layout.ts) for the state; `packages/scena/src/react/SurfaceWindows.tsx` once task 03 creates it.

## Tasks

| Task | Status | Depends on |
| --- | --- | --- |
| [01 - the UI acts in its own document](task-01-the-ui-acts-in-its-own-document.md) | done | - |
| [02 - a window surface keeps its place](task-02-a-window-surface-keeps-its-place.md) | done | - |
| [03 - a window surface is drawn in a window](task-03-a-window-surface-is-drawn.md) | done | 01, 02 |
| [04 - a blocked window opens from a notice](task-04-a-blocked-window-opens-from-a-notice.md) | done | 03 |
| [05 - a tab dragged out opens a window](task-05-a-tab-dragged-out-opens-a-window.md) | done | 03 |
| [06 - the playground opens windows](task-06-the-playground-opens-windows.md) | doing | 04, 05 |

## Risks and tradeoffs

- A component that uses the global `document` acts on the main window.
  Task 01 fixes the four that the search found, and the playground check finds the rest.
- The `MutationObserver` misses a style that a script adds through `sheet.insertRule`.
  VS Code has the same gap. The copy also copies `adoptedStyleSheets` once at open.
- A browser may give no usable `screenX` at a `dragend` outside the window.
  Task 05 then takes the main window's place with an offset, as VS Code does.
- jsdom has no second window to open - the tests stub `window.open` with a second jsdom document; the playground is the real check.
- Each open window keeps a one-second check to read its place - the check stops when the window closes.

## Resume state

- **Done so far:** plan 1 built 2026-11-21. Task 01 to 05 done 2026-11-21. Task 06 started 2026-11-21.
- **Next action:** [task-06-the-playground-opens-windows.md](task-06-the-playground-opens-windows.md).
- **Open questions:** none.
- **Watch out for:** a reload of the main window closes each window too, so that close must not send its tabs to `main`. Which `pagehide` fires first is not checked.

## Final verification checklist

- [ ] `pnpm test`, `pnpm typecheck` and `pnpm lint` pass.
- [ ] In the playground, a tab dragged out of the browser opens a window at the drop point.
- [ ] Tabs drag between the window and `main`, and the window splits into groups.
- [ ] A menu, a popup and a key in the window act in the window.
- [ ] The window has the theme, and a theme change reaches it.
- [ ] Closing the window sends its tabs to `main`.
- [ ] Ctrl+F5 opens the window again at its place and size, with its tabs.
- [ ] With popups blocked, the notice shows, and its button opens the window.
