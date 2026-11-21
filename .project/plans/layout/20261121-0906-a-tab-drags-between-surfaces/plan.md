---
title: A tab drags between surfaces
domain: layout
status: planned
priority: medium
created: 2026-11-21
revalidated: 2026-11-21
requires: []
changes: []
creates: []
refs:
  - git://3756caa - the commit of scena this plan was checked at
  - file:///github/scena/.project/briefs/drag-a-tab-between-surfaces.md - the brief this plan builds, not yet committed in its updated form
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L31](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L31) - `DRAG_MIME`, the tab panel's own drag type"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L157-L216](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L157-L216) - `reconcile`, which prunes dead keys and appends a new mount to the focused leaf"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L245-L248](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L245-L248) - `DragPayload`, a leaf id and a tab key, with no surface"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L326-L330](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L326-L330) - the drag start of a tab"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L345-L396](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L345-L396) - the strip drop and the five-zone body drop"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L612-L714](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L612-L714) - `readPayload`, `removeTab`, `insertTab` and `splitLeafOnDrop`, the tree moves inside one surface"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L27](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L27) - the `tab` layout's own drag type, an index"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L41-L47](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L41-L47) - the `tab` layout appends a mount that is not in `split.order`"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L126-L147](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L126-L147) - the `tab` layout's drag and drop, a reorder in its own strip"
  - "[code://packages/scena/src/sdk/mount-surface.ts#L48-L60](../../../../packages/scena/src/sdk/mount-surface.ts#L48-L60) - `MountPolicy`, where `movable` goes beside `closable`"
  - "[code://packages/scena/src/core/graph/mount-surface.ts#L323-L338](../../../../packages/scena/src/core/graph/mount-surface.ts#L323-L338) - `move`, which changes the surface and emits closed and opened"
  - "[code://packages/scena/test/ui/TabLayout.test.tsx](../../../../packages/scena/test/ui/TabLayout.test.tsx) - the layout test to copy for the drop tests"
  - "[code://packages/playground/src/layout-modes.ts#L26](../../../../packages/playground/src/layout-modes.ts#L26) - the playground's `tab-panel` mode, where the drag is tried by hand"
  - https://code.visualstudio.com/docs/configure/custom-layout - VS Code moves views and editors between places, read 2026-10-29
---

## Goal

A person drags a tab from one surface and drops it on another, and the tab moves there.
A drop on a tab strip places the tab at that index.
A drop on the body of a tab group joins the group, or splits it at an edge.
These are the zones of a drop from the same surface.
Every tab can move, unless its app marks the mount to stay.
The [window plan](../20261121-0906-a-tab-opens-in-its-own-window/plan.md) builds on this move.

## Reconnaissance

The files read and the patterns to reuse are the `refs` in the frontmatter, each with its note.

### Searches performed

- `rg -n "x-scena" packages/scena/src` - four drag types, one per layout: tab panel, tab, split and stack. None names a surface.
- `rg -n "surfaces.move|\.move\(" packages/scena/src` - nothing calls `surfaces.move`.
- `rg -ln "TabPanelLayout" packages/scena/test` - no test drives the tab panel layout.

### Runtime path

```
dragstart (tab) -> dataTransfer: own type + TAB_DRAG_MIME {surface, key, leafId}
drop (other surface) -> canMoveTo -> surfaces.move -> layout.setSurface(target tree) + layout.setSurface(source tree) -> both layouts render
```

### Gaps

- The payload names no surface, so a drop cannot tell a move from a reorder.
- Each layout reads only its own drag type.
- The pure tree moves are private to `TabPanelLayout.tsx`, so a drop cannot edit another surface's tree.
- `Not found: a policy that keeps a mount on its surface - searched movable, fixed in sdk/mount-surface.ts.`
- No test drives `TabPanelLayout`.

## Answers

| What | Source | Task |
| --- | --- | --- |
| The drag and the windows are two plans, the drag first | "Two plans (Recommended)", Softov, 2026-11-21 | - |
| Every tab moves unless its mount sets `policy.movable: false` | "Movable unless opted out (Recommended)", Softov, 2026-11-21 | 01 |
| One shared drag type, `application/x-scena-tab`, beside each layout's own type | (defaulted: the layouts keep their own type, so a reorder inside one layout does not change) | 01 |
| The tree moves move to `sdk/tab-panel.ts` as pure functions | (defaulted: AGENTS.md puts the pure function over an sdk shape in `sdk/`) | 01 |
| The app learns of a move from `scena:mount:opened` with the new surface | (defaulted: [`move`](../../../../packages/scena/src/core/graph/mount-surface.ts#L323-L338) already emits it) | 02 |
| A drop on a group edge from another surface splits the group | (defaulted: the same zones as a drop from the same surface) | 02 |
| `surfaces.move` runs first, then both trees are written in the same tick | (defaulted: `reconcile` prunes a key that is not a mount of the surface) | 02 |
| A refused drop shows no drop zone and sets `dropEffect` to `none` | (defaulted: the browser then shows the not-allowed cursor) | 02 |
| The split and stack layouts are out of scope | (defaulted: the brief names the tab panel and the tab layouts) | - |

## Proposed architecture

- **Data flow** - The drag start writes `{ surface, key, leafId }` under `TAB_DRAG_MIME`. The drop reads it with `readTabDrag`.
- **Event flow** - `surfaces.move` emits `scena:mount:closed` and `scena:mount:opened`. Nothing new is emitted.
- **State flow** - The target layout writes its tree with the key placed. It writes the source surface's tree with the key removed, through `scena.layout.setSurface`. A `tab` source needs no write, because its order drops a key that is not mounted.
- **Layer responsibilities**
  - sdk: the drag type, the payload, `canMoveTo` and the pure tree moves.
  - ui: `tab-drag.ts` holds the drag in progress. The layouts set it and read it.
  - playground: a second tab surface to try the drag.
- **Source-of-truth files** - [`code://packages/scena/src/sdk/tab-panel.ts`](../../../../packages/scena/src/sdk/tab-panel.ts) once task 01 creates it.

## Tasks

| Task | Status | Depends on |
| --- | --- | --- |
| [01 - the tab drag names its surface](task-01-the-tab-drag-names-its-surface.md) | todo | - |
| [02 - a tab group takes a tab from another surface](task-02-a-group-takes-a-tab-from-elsewhere.md) | todo | 01 |
| [03 - a tab strip takes a tab from another surface](task-03-a-strip-takes-a-tab-from-elsewhere.md) | todo | 01 |
| [04 - the playground drags a tab between surfaces](task-04-the-playground-drags-between.md) | todo | 02, 03 |

## Risks and tradeoffs

- Moving the tree functions out of `TabPanelLayout.tsx` is a large diff - the move keeps each body as it is, and the layout imports them.
- A browser hides `dataTransfer` data during `dragover`, so a layout cannot read the payload there.
  `ui/layout/tab-drag.ts` holds the payload of the drag in progress, from `dragstart` to `dragend`.
  A window of the window plan shares this module, because it runs in the same JavaScript realm.
- An app that keeps a copy of a mount's surface goes stale after a move - `scena:mount:opened` carries the new surface; the docs say so.

## Resume state

- **Done so far:** nothing.
- **Next action:** [task-01-the-tab-drag-names-its-surface.md](task-01-the-tab-drag-names-its-surface.md).
- **Open questions:** none.
- **Watch out for:** `reconcile` drops a key that the surface does not mount, so a tree written before `surfaces.move` loses the tab.

## Final verification checklist

- [ ] `pnpm test` passes, with the new tests of task 01, 02 and 03.
- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] In the playground, a tab drags from `main` to the right sidebar and back, to a strip index, a group centre and a group edge.
- [ ] A mount with `policy.movable: false` does not move, and the cursor shows it.
- [ ] A drag inside one surface works as before.
