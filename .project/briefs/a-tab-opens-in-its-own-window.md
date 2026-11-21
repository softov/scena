---
title: A tab opens in its own window
created: 2026-11-21
refs:
  - git://3756caa - the commit of this repository the facts were checked at
  - git://92613ea - the commit of ahpw the ahpw facts were checked at
  - "[code://packages/scena/src/sdk/mount-surface.ts#L30-L40](../../packages/scena/src/sdk/mount-surface.ts#L30-L40) - `SurfaceName`, the nine names and any string an app defines"
  - "[code://packages/scena/src/core/controls/layout.ts#L37-L47](../../packages/scena/src/core/controls/layout.ts#L37-L47) - `DEFAULT_SURFACE_LAYOUTS`, with a `detached` surface that is hidden and has the `single` layout"
  - "[code://packages/scena/src/core/controls/layout.ts#L205-L214](../../packages/scena/src/core/controls/layout.ts#L205-L214) - `setSurface`, which writes the state of any surface name"
  - "[code://packages/scena/src/sdk/layout.ts#L91-L158](../../packages/scena/src/sdk/layout.ts#L91-L158) - `SurfaceLayoutState`, with a tab tree and no place or size of a window"
  - "[code://packages/scena/src/core/graph/mount-surface.ts#L299-L308](../../packages/scena/src/core/graph/mount-surface.ts#L299-L308) - `listSurfaces`, the surfaces that hold a visible mount"
  - "[code://packages/scena/src/core/controls/session.ts#L33-L55](../../packages/scena/src/core/controls/session.ts#L33-L55) - `snapshot`, which keeps the mounts of every surface and an empty `surfaces`"
  - "[code://packages/scena/src/react/DefaultShell.tsx#L178-L183](../../packages/scena/src/react/DefaultShell.tsx#L178-L183) - the shell draws a fixed list of surfaces, `main` among them"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L304-L315](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L304-L315) - the window `dragend` and `drop` listeners, which only clear the drop zone"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L326-L330](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L326-L330) - the drag start of a tab, with no drag end on the tab"
  - "[code://packages/scena/src/ui/overlay/Popup.tsx#L113-L131](../../packages/scena/src/ui/overlay/Popup.tsx#L113-L131) - a popup portals into the global `document.body`"
  - "[code://packages/scena/src/styles/index.ts#L74-L84](../../packages/scena/src/styles/index.ts#L74-L84) - `ensureCssLink`, which adds a theme link to the global `document.head`"
  - file:///github/scena/.project/briefs/drag-a-tab-between-surfaces.md - the drag payload with the source surface, and the move with `surfaces.move`
  - file:///github/ahpw/src/shell/tabs.ts - `keepTabs`, which keeps and reopens the mounts of `main` only
  - file:///github/ahpw/src/App.tsx - the layout state is kept in `ahpd-web.layout.v2`
  - file:///github/ahpw/.project/briefs/items-are-placed-and-moved-between-surfaces.md - a window is one more surface an item moves to
  - https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/auxiliaryWindow/browser/auxiliaryWindowService.ts - how VS Code opens a window and copies its styles, read 2026-11-21
  - https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/browser/parts/editor/editorParts.ts - how VS Code keeps and restores its window editor parts, read 2026-11-21
---

# A tab opens in its own window

Softov wants to drag a tab out of the browser window and get a new window that holds it.
VS Code in a browser does this, and Softov uses it through code-server.
The new window has its own tab groups, and a person splits and moves tabs there as on `main`.
After a reload with Ctrl+F5, the window opens again with the same groups and tabs.
ahpw is the first app, with a session page as the tab.
scena draws the tabs and the surfaces, so most of the change is in scena.

## What others do

- VS Code calls the new window an auxiliary window ([auxiliaryWindowService.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/auxiliaryWindow/browser/auxiliaryWindowService.ts)).
- It opens the window with `window.open('about:blank')` and the features `popup=yes`, `left`, `top`, `width` and `height`. Firefox gets an empty URL.
- With no place given, it centres the window on the active window, offset a little so that the two do not overlap.
- When the browser blocks the window, VS Code shows a dialog: "The browser blocked opening a new window. Press 'Retry' to try again." The Retry is a click, so the browser lets it open.
- It clones each `link[rel="stylesheet"]` and `style` of the main `head` into the new window. A `MutationObserver` copies later additions, edits and removals.
- It keeps each window's editor layout and window state under `editorparts.state`, and restores them at startup ([editorParts.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/browser/parts/editor/editorParts.ts)).
- When it closes a window's part, the editors that remain move to the main part.
- Softov saw the window open again after a reload in code-server. How the browser allowed that window without a click is not checked.

## What scena has today

### Surfaces

- A surface name is one of nine, or any string an app defines ([`SurfaceName`](../../packages/scena/src/sdk/mount-surface.ts#L30-L40)).
- One of the nine is `detached`, hidden, with the `single` layout ([`DEFAULT_SURFACE_LAYOUTS`](../../packages/scena/src/core/controls/layout.ts#L37-L47)). Nothing draws it.
- `setSurface` writes the state of any name, so an app can add a surface at run time ([`setSurface`](../../packages/scena/src/core/controls/layout.ts#L205-L214)).
- `DefaultShell` draws a fixed list of surfaces, each with a `SurfaceArea` ([`DefaultShell.tsx`](../../packages/scena/src/react/DefaultShell.tsx#L178-L183)). A surface it does not name is drawn only by an app that renders its own `SurfaceArea`.

### What is kept

- The layout state of each surface holds its visibility, size, layout and tab tree ([`SurfaceLayoutState`](../../packages/scena/src/sdk/layout.ts#L91-L158)). It has no place or size of a browser window.
- `snapshot` keeps the mounts of every surface that `listSurfaces` returns, and leaves `surfaces` empty ([`snapshot`](../../packages/scena/src/core/controls/session.ts#L33-L55)).
- In ahpw, `keepTabs` keeps and reopens the mounts of `main` only (`file:///github/ahpw/src/shell/tabs.ts`). The layout state is in `ahpd-web.layout.v2` (`file:///github/ahpw/src/App.tsx`).

### The drag

- A `tabPanel` tab sets its payload on drag start and has no drag end ([`TabPanelLayout.tsx`](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L326-L330)).
- The `dragend` and `drop` listeners on `window` only clear the drop zone ([`TabPanelLayout.tsx`](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L304-L315)). Nothing acts on a drop outside the browser window.
- The payload names no surface. The [drag brief](drag-a-tab-between-surfaces.md) adds the surface and the move.

### The global document

- A `Popup` portals into the global `document.body` ([`Popup.tsx`](../../packages/scena/src/ui/overlay/Popup.tsx#L113-L131)). A menu opened in a second window would show in the main window.
- `ensureCssLink` adds a theme link to the global `document.head` ([`styles/index.ts`](../../packages/scena/src/styles/index.ts#L74-L84)).
- The `dragend` listeners and the `Popup` key listener use the global `window` and `document`.
- So code drawn into a second window reads the main window's `document`, until each use reads the `ownerDocument` of its own element.

## Who writes

- scena: `main` at `3756caa` is the only writer. No remote branch has a commit that `main` lacks.
- ahpw: `main` at `92613ea` is the only writer to `src/shell/tabs.ts`, `src/App.tsx` and `src/resources/sessions/index.ts`. The worktrees and the other branches do not change these files.
- The [drag brief](drag-a-tab-between-surfaces.md) changes the same drag code. This change builds on it, so the drag brief is planned first.

## The change

### A window is a surface

- A window is a surface that scena adds when the window opens, with a name such as `window:<id>`.
- Its layout is `tab-panel`, so it has tab groups and splits as `main` has.
- The surface state keeps the window's place and size, so the layout storage keeps them with the tab tree.
- The mounts of a window surface are kept as the mounts of `main` are.

### A drag out opens a window

- A tab dropped outside the browser window opens a new window at the drop point, with that tab in it.
- A drag end with `dropEffect` of `none` and a point outside the viewport is the drop outside.
- The tab moves to the new surface with `surfaces.move`, as the drag brief says.
- A menu item on the tab opens it in a new window too, for a person who does not drag.
- An app can refuse a window for a mount, as the drag brief lets it refuse a surface.

### The window draws from the main window

- The window opens on a page of the same origin, and scena draws into it from the main window through a React portal.
- So the window shares the one scena, its store and the app's connections.
- The main window's style sheets are copied into the window, and later changes follow, as VS Code does.
- A popup, a menu, a listener and a theme link use the `ownerDocument` of their element, not the global `document`.

### Moves between windows

- A tab drags between a window and `main`, or between two windows, with the drag brief's payload and move.
- An empty window closes, as an empty tab group closes.

### Close and reload

- When a person closes a window, its tabs move back to `main`, as VS Code does.
- When the main window closes or reloads, the windows close with it.
- After a reload, scena opens each kept window again at its place and size, with its tab tree.
- When the browser blocks a window, scena shows a notice with a button that opens the blocked windows. The button is a click, so the browser allows it.

### In ahpw

- `keepTabs` keeps the tabs of each window surface, not only of `main`.
- A session page learns that its surface changed, as the drag brief says for `beside`.

## Open points

- Whether the windows reopen by themselves after a reload, or only from the notice. A browser without popups allowed blocks the first way.
- Whether a closed window's tabs move back to `main` or close. VS Code moves them back.
- Whether the existing `detached` surface becomes the first window, or each window gets its own name.
- What page the window loads: `about:blank`, as VS Code does, or a page of the app that loads no app code.
- How the place and size of a window are read: `screenX`, `screenY`, `outerWidth` and `outerHeight` of the window, on a resize or a move.
- Not checked: whether a drag end outside the window gives a usable point in each browser.
- Not checked: whether scena's floating and spatial layouts work in a second window.
