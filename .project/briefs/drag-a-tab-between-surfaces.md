---
title: Drag a tab between surfaces
created: 2026-10-29
refs:
  - git://fd55d7b - the commit of this repository the facts were checked at
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L245-L248](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L245-L248) - `DragPayload`, a leaf id and a tab key, with no surface"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L326-L330](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L326-L330) - the drag start of a tab panel tab"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L612-L626](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L612-L626) - `readPayload`, which reads the payload of a drop"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L641-L675](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L641-L675) - `insertTab`, which moves a tab between the leaves of one tree"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L126-L147](../../packages/scena/src/ui/layout/TabLayout.tsx#L126-L147) - the tab drag of a `tab` layout, an index in its own strip"
  - "[code://packages/scena/src/sdk/mount-surface.ts#L184](../../packages/scena/src/sdk/mount-surface.ts#L184) - `surfaces.move`, the contract"
  - "[code://packages/scena/src/core/graph/mount-surface.ts#L323-L338](../../packages/scena/src/core/graph/mount-surface.ts#L323-L338) - `move`, which changes the surface of a mount and keeps its resource"
  - https://code.visualstudio.com/docs/configure/custom-layout - VS Code drags views between the side bars and the panel, read 2026-10-29
---

# Drag a tab between surfaces

Softov wants to drag a chat tab from the main area to the right sidebar, and back.
In ahpw, a bot chat is a session tab, and it opens on `main` or on `sidebar:right`.
A menu item moves it now; a drag is the direct way.
scena draws the tabs, so the drag is a scena change.

## What others do

- VS Code drags views between the Primary Side Bar, the Secondary Side Bar and the Panel ([custom layout](https://code.visualstudio.com/docs/configure/custom-layout)).
- VS Code moves an editor to a new editor group by a drag to the side, or out of the window to a floating window. The page does not say that an editor drops into a side bar.

## What scena has today

- A `tabPanel` layout drags a tab with a JSON payload of `sourceLeafId` and `tabKey` under its own MIME type ([`code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L245-L248`](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L245-L248)).
- The payload names no surface. `insertTab` moves the key between the leaves of the tree of the surface that takes the drop ([`code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L641-L675`](../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L641-L675)).
- A `tab` layout drags a tab with its index as the payload, under another MIME type. A drop only reorders its own strip ([`code://packages/scena/src/ui/layout/TabLayout.tsx#L126-L147`](../../packages/scena/src/ui/layout/TabLayout.tsx#L126-L147)).
- Each layout reads only its own MIME type, so a `tab` layout ignores a tab from a `tabPanel` layout.
- `surfaces.move({ key, toSurface })` changes the surface of a mount and sends the closed and opened events. It keeps the resource and its props ([`code://packages/scena/src/core/graph/mount-surface.ts#L323-L338`](../../packages/scena/src/core/graph/mount-surface.ts#L323-L338)).
- Nothing in scena calls `surfaces.move`.
- In ahpw, `main` uses the `tabPanel` layout and `sidebar:right` uses the `tab` layout.

## Who writes

- `main` at `fd55d7b` is the only writer. The branches `refactor/sdk-core-layering`, `forms/copy-fallback-nested-actions`, `release/staged-publish` and `theme/ahpio-blue-accent` have no commit that `main` does not have.
- ahpw calls `surfaces.open` and `surfaces.close` to move a session tab between `main` and `sidebar:right`. A drag that calls `surfaces.move` is a second path to the same move.

## The change

- A tab drag carries one payload that every layout reads: the mount key and the source surface.
- A drop on another surface moves the mount there with `surfaces.move`, and places the tab where it fell.
- The source layout removes the tab from its own state, and an empty group closes as it does now.
- A surface or a mount can refuse a drop, so an app keeps a view where it belongs.
- An app learns of the move, so it can change props that depend on the surface.
  ahpw sets `beside` on a session page in the right sidebar.

## Open points

- How an app learns of the move: the `scena:mount:opened` event with its surface, or a hook on the mount that returns new props.
- Whether a drop on a `tabPanel` group edge from another surface splits the group, as a drop from the same surface does.
- Not checked by hand: what a `tabPanel` drop does today with a payload from another `tabPanel` surface.
