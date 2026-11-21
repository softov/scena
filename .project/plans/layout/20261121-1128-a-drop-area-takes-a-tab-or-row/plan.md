---
title: A drop area takes a tab or a row
domain: layout
status: active
priority: medium
created: 2026-11-21
revalidated: 2026-11-21
requires:
  - plans/layout/20261121-1056-a-row-drags-in-and-tabs-land-anywhere/plan.md
changes: []
creates: []
refs:
  - git://0e044d7 - the commit of scena this plan was checked at, the merge of #21
  - "[code://packages/scena/src/react/surface-drop.ts](../../../../packages/scena/src/react/surface-drop.ts) - the drag in progress and the drop path, which a drop area reads"
  - "[code://packages/scena/src/react/SurfaceArea.tsx](../../../../packages/scena/src/react/SurfaceArea.tsx) - the surface's drop, which an area inside it comes before"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L145](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L145) - a tab drag allows `move` only"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L149](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L149) - the same in a tab group"
  - "[code://packages/scena/src/ui/control/ButtonBar.tsx](../../../../packages/scena/src/ui/control/ButtonBar.tsx) - `command` and `args`, the pattern a graph component uses to run a command"
  - "[code://packages/scena/src/core/resolve/dynamic-resolver.ts#L159-L171](../../../../packages/scena/src/core/resolve/dynamic-resolver.ts#L159-L171) - an action prop resolves to a call with no arguments, so it cannot take the dropped thing"
  - "[code://packages/scena/src/ui/layout/catalog.ts](../../../../packages/scena/src/ui/layout/catalog.ts) - the layout catalog, which gets `DropArea`"
  - "[code://packages/playground/src/resources/sessions/SessionView.tsx](../../../../packages/playground/src/resources/sessions/SessionView.tsx) - the composer that takes references"
  - file:///github/ahpw/.project/briefs/items-are-placed-and-moved-between-surfaces.md - the target decides between move and link; a session on a chat becomes a reference
---

## Goal

An app marks an element inside a page as a drop area.
A tab or a list row dropped on it goes to the area, not to the surface.
The area does what it does with it.
The tab stays where it was: an area links, and a surface moves.
The first use is a composer that takes a dropped session, user or file as a reference in the message.
A page built from graph JSON gets a drop area too.

## Reconnaissance

The files read and the patterns to reuse are the `refs` in the frontmatter, each with its note.

### Searches performed

- `rg -n "effectAllowed" packages/scena/src/ui/layout` - a tab drag allows `move` only, so a browser refuses a `copy` or `link` drop.
- `rg -n "functionCall" packages/scena/src/core/resolve` - an action prop is a call with no arguments.
- `Not found: an element that takes a drag inside a surface - searched onDrop, DropArea in packages/scena/src/react packages/scena/src/ui.`

### Runtime path

```
dragover on the area -> the drag in progress -> describe it -> accepts? -> stop the event, dropEffect copy, `over`
drop on the area -> read the payload -> describe it -> onDrop(thing) -> stop the event; the surface never sees it
```

### Gaps

- No way to take a drop inside a page before the surface does.
- A tab drag refuses any drop that is not a move.

## Answers

| What | Source | Task |
| --- | --- | --- |
| A drop area is a React hook and a graph component | "Hook + a graph component", Softov, 2026-11-21 | 01, 02 |
| The area learns the key, the component node, the title, and for a tab its surface; no item kind registry | "Key and resource (Recommended)", Softov, 2026-11-21 | 01 |
| A tab dropped on an area stays where it was | "It stays where it is (Recommended)", Softov, 2026-11-21 | 01 |
| The playground's session composer takes a session, a user or a file as a reference | "Session composer refs (Recommended)", Softov, 2026-11-21 | 03 |
| The hook returns props to spread, and `over` while a drag it takes is over it | (defaulted: a component spreads the props on its own element, as with `useSurfaceResize`) | 01 |
| A tab drag allows `copyMove`, and an area sets `dropEffect` to `copy` | (defaulted: a browser refuses a drop effect the drag does not allow) | 01 |
| `DropArea` runs a command with `args` and the dropped thing as `drop` | (defaulted: an action prop takes no arguments; `ButtonBar` runs `command` with `args`) | 02 |
| `DropArea` takes the component names it accepts as `accepts` | (defaulted: a graph prop cannot be a function) | 02 |

## Proposed architecture

- **Data flow** - `describeDrop` turns a tab payload or a row payload into one `DroppedThing`: `key`, `resource`, `title`, `surface` for a tab, and `from`.
- **Event flow** - The area's `dragover` and `drop` stop the event, so the tab layout and `SurfaceArea` do not take it. Nothing else is emitted.
- **State flow** - The area keeps `over` in its own state. The drop changes nothing in scena; the area's `onDrop` does.
- **Layer responsibilities**
  - sdk: `DroppedThing`.
  - react: `describeDrop` and `useDropArea` in `surface-drop.ts`.
  - ui: `DropArea`, the graph component, in the layout catalog.
  - playground: the composer's references, and a `DropArea` in a JSON page.
- **Source-of-truth files** - [`code://packages/scena/src/react/surface-drop.ts`](../../../../packages/scena/src/react/surface-drop.ts).

## Tasks

| Task | Status | Depends on |
| --- | --- | --- |
| [01 - a component marks a drop area](task-01-a-component-marks-a-drop-area.md) | done | - |
| [02 - a graph page has a drop area](task-02-a-graph-page-has-a-drop-area.md) | done | 01 |
| [03 - the composer takes a reference](task-03-the-composer-takes-a-reference.md) | doing | 01, 02 |

## Risks and tradeoffs

- An area inside a tab group's page sits under the group's own drop zones.
  The area is deeper, so it stops the event in the bubble phase before the group body sees it.
- A cancelled row drag leaves its record - an area reads the record only when the drag carries the row type, as a surface does.
- An app may want an area that moves a tab - not now; `onDrop` can call `surfaces.move` itself.

## Resume state

- **Done so far:** task 01 and 02 done 2026-11-21. Task 03 started 2026-11-21.
- **Next action:** [task-03-the-composer-takes-a-reference.md](task-03-the-composer-takes-a-reference.md).
- **Open questions:** none.
- **Watch out for:** a drop an area takes must stop its event, or the surface moves the tab too.

## Final verification checklist

- [ ] `pnpm test`, `pnpm typecheck` and `pnpm lint` pass.
- [ ] In the playground, a session tab dropped on another session's composer adds a reference, and the tab stays.
- [ ] A session row, a user tab and a file tab do the same.
- [ ] A drop beside the composer, on the page, still moves the tab to that surface.
- [ ] The `DropArea` in the JSON page runs its command with the dropped thing.
