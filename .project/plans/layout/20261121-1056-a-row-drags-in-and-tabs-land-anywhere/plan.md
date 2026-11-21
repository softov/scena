---
title: A list row drags in, and a surface takes a drop anywhere
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
  - git://7774b41 - the commit of scena this plan was checked at, the merge of the window work
  - "[code://packages/scena/src/react/SurfaceArea.tsx#L101-L200](../../../../packages/scena/src/react/SurfaceArea.tsx#L101-L200) - the element of every surface, which takes the drop"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L310-L337](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L310-L337) - the `tab` layout's page area, which takes no drop"
  - "[code://packages/scena/src/ui/layout/move-tab.ts](../../../../packages/scena/src/ui/layout/move-tab.ts) - `moveTabHere`, the move a row drop of an open key reuses"
  - "[code://packages/scena/src/ui/layout/tab-drag.ts](../../../../packages/scena/src/ui/layout/tab-drag.ts) - the drag in progress, which a row drag records too"
  - "[code://packages/scena/src/sdk/tab-drag.ts](../../../../packages/scena/src/sdk/tab-drag.ts) - the tab payload, the pattern for the open payload"
  - "[code://packages/scena/src/core/controls/session.ts#L33-L82](../../../../packages/scena/src/core/controls/session.ts#L33-L82) - `snapshot` keeps no props, and `restore` opens with none"
  - "[code://packages/scena/src/runtime/layout-commands.ts#L90-L140](../../../../packages/scena/src/runtime/layout-commands.ts#L90-L140) - copies of the tree helpers in `sdk/tab-panel.ts`"
  - "[code://packages/playground/src/resources/sessions/Explorer.tsx](../../../../packages/playground/src/resources/sessions/Explorer.tsx) - the session list, whose rows get the drag"
  - file:///github/ahpw/.project/plans/sessions/20261028-0951-drag-a-session-into-a-tab-group/plan.md - ahpw's plan for a session row drag, which caught the drop in ahpw; this plan gives scena the drop instead
---

## Goal

Three refinements before the next scena release.
A surface takes a dropped tab anywhere on it, whatever its layout; the right sidebar's page took none.
The layout only says where in the surface the tab lands, when it can say more than "at the end".
A row of a list, such as a session in an explorer, drags onto any surface and opens there.
A reopened tab keeps its title after a reload.

## Reconnaissance

The files read and the patterns to reuse are the `refs` in the frontmatter, each with its note.

### Searches performed

- `rg -n "onDrop" packages/scena/src/ui/layout/TabLayout.tsx` - the strip and the tabs take a drop; the page area does not.
- `rg -n "props" packages/scena/src/core/controls/session.ts` - the snapshot keeps no props.
- `rg -n "function (findLeaf|replaceLeaf|mapLeaves|newLeafId)" packages/scena/src/runtime/layout-commands.ts` - four copies of helpers in `sdk/tab-panel.ts`.

### Runtime path

```
row dragstart -> startOpenDrag(dataTransfer, { key, resource, props }) -> OPEN_DRAG_MIME + the drag in progress
drop on a layout's zone -> place it there, stop the event
drop elsewhere on the surface (SurfaceArea) -> key open? move : open -> at the end
```

### Gaps

- The page area of a `tab` layout takes no drop.
- `Not found: a drag of something that is not mounted yet - searched setData, MIME in packages/scena/src.`
- `Not found: props in SessionMount - searched sdk/session.ts.`

## Answers

| What | Source | Task |
| --- | --- | --- |
| The page area of the right sidebar takes a tab | Softov, 2026-11-21: "sidebar tabpanel does not accepts the drop. only the title accept it." | 01 |
| The surface takes the drop, not a tab layout; a layout that can place the tab handles the drop first | "Surface + app drop areas", Softov, 2026-11-21: "its not a tab that takes it right? its a surface or a droppable area" | 01 |
| A surface whose role is `bar`, `rail` or `overlay` refuses a drop | (defaulted: a tab in the title bar or the activity bar is not a place) | 01 |
| A drop area an app marks, such as a composer that makes a session a reference, is a second plan | "Surface + app drop areas", Softov, 2026-11-21 | - |
| A list row drag is a scena drag that every surface takes, not a drop that ahpw catches | "In scena (Recommended)", Softov, 2026-11-21 | 02 |
| A row of a key that is open elsewhere moves the tab to the drop | "Move it there (Recommended)", Softov, 2026-11-21 | 02 |
| A row of a key that is not open opens it where it fell | Softov, 2026-11-21: "I want to be able to drag the session from the explorer also." | 02 |
| A snapshot keeps each mount's props, and a restore passes them back | "Yes, include it (Recommended)", Softov, 2026-11-21 | 03 |
| `layout-commands.ts` imports the tree helpers from `sdk/tab-panel.ts` | (defaulted: the plan of the drag left it for later, and code is written once) | 04 |
| A row dropped outside the window does not open a window | (defaulted: the row's drag end is the app's; `openTabWindow` is exported for an app that wants it) | - |

## Proposed architecture

- **Data flow** - A row writes `OpenDragPayload` (`key`, `resource`, `props`, `policy`) under `OPEN_DRAG_MIME`, and records it as the drag in progress.
- **Event flow** - A drop calls `surfaces.open` for a new key or `surfaces.move` for an open one; both emit the mount events as before.
- **State flow** - The target writes its state with the key placed, as a tab drop does.
- **Layer responsibilities**
  - sdk: `OPEN_DRAG_MIME`, `OpenDragPayload`, `writeOpenDrag`, `readOpenDrag`; `SessionMount.props`.
  - react: `SurfaceArea` takes a drop at the end, for every surface that is not a bar, a rail or the overlay.
  - ui: `startOpenDrag` and `endOpenDrag`; the tab layouts place a drop where it fell; `dropHere` beside `moveTabHere`.
  - core: the snapshot and the restore carry props.
  - playground: session rows drag.
- **Source-of-truth files** - [`code://packages/scena/src/sdk/tab-drag.ts`](../../../../packages/scena/src/sdk/tab-drag.ts) for both payloads.

## Tasks

| Task | Status | Depends on |
| --- | --- | --- |
| [01 - the surface takes a drop](task-01-the-page-area-takes-a-tab.md) | done | - |
| [02 - a list row drags onto a surface](task-02-a-list-row-drags-onto-a-surface.md) | done | 01 |
| [03 - a reopened tab keeps its title](task-03-a-reopened-tab-keeps-its-title.md) | done | - |
| [04 - the commands share the tree helpers](task-04-the-commands-share-the-helpers.md) | doing | - |
| [05 - the playground drags a session row](task-05-the-playground-drags-a-row.md) | todo | 02, 03 |

## Risks and tradeoffs

- A browser hides the drop data during `dragover` - the row records the drag in progress, as a tab does.
- An old snapshot has no props - the restore reads them when present, so an old snapshot still loads.
- ahpw's planned session drag catches the drop in ahpw - once ahpw takes this release, that plan is rewritten to set the row payload.

## Resume state

- **Done so far:** task 01 to 03 done 2026-11-21. Task 04 started 2026-11-21.
- **Next action:** [task-04-the-commands-share-the-helpers.md](task-04-the-commands-share-the-helpers.md).
- **Open questions:** none.
- **Watch out for:** a drop that a layout places must stop its event, or `SurfaceArea` takes it a second time.

## Final verification checklist

- [ ] `pnpm test`, `pnpm typecheck` and `pnpm lint` pass.
- [ ] In the playground, a tab dropped on the right sidebar's page lands there, and on a `stack` or `single` surface too.
- [ ] A session row drags onto `main`, a group edge, the right sidebar and a window, and opens there.
- [ ] A row of an open session moves its tab to the drop; a click still focuses it where it is.
- [ ] After a reload, reopened tabs show their titles.
