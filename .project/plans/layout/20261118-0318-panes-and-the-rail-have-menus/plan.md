---
title: Panes and the activity bar have their own menus
domain: layout
status: planned
priority: medium
created: 2026-11-18
revalidated: 2026-11-18
requires: []
changes: []
creates: []
refs:
  - git://325b4ab - the commit of scena this plan was checked at
  - "[code://packages/scena/src/ui/layout/StackLayout.tsx#L140-L166](../../../../packages/scena/src/ui/layout/StackLayout.tsx#L140-L166) - a pane header and the background open `tab:context` and `surface:context` now"
  - "[code://packages/scena/src/ui/layout/StackLayout.tsx#L304-L330](../../../../packages/scena/src/ui/layout/StackLayout.tsx#L304-L330) - the two `ContextMenu` mounts of the stack"
  - "[code://packages/scena/src/ui/layout/StackHeader.tsx#L53-L62](../../../../packages/scena/src/ui/layout/StackHeader.tsx#L53-L62) - `setHidden` and `toggleHidden`, the pane ticks of the `...` menu"
  - "[code://packages/scena/src/ui/layout/StackHeader.tsx#L115-L140](../../../../packages/scena/src/ui/layout/StackHeader.tsx#L115-L140) - the tick rows the `...` menu builds from `allOrdered`"
  - "[code://packages/scena/src/ui/layout/RailLayout.tsx#L27-L75](../../../../packages/scena/src/ui/layout/RailLayout.tsx#L27-L75) - the activity bar, with no menu and no hidden items"
  - "[code://packages/scena/src/sdk/layout.ts#L136-L155](../../../../packages/scena/src/sdk/layout.ts#L136-L155) - `stack.hidden`, the shape `rail.hidden` copies"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L167-L168](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L167-L168) - rows a layout builds go in `extraItems`, ahead of the slot's commands"
  - "[code://packages/scena/src/runtime/layout-commands.ts#L140-L320](../../../../packages/scena/src/runtime/layout-commands.ts#L140-L320) - the tab commands that a pane header shows today"
  - "[code://packages/scena/src/ui/layout/MountTitle.tsx#L65-L73](../../../../packages/scena/src/ui/layout/MountTitle.tsx#L65-L73) - `resolveMountTitle`, the title of a pane row"
  - "[code://packages/scena/src/sdk/label.ts#L12](../../../../packages/scena/src/sdk/label.ts#L12) - `resolveLabel`, the label of an activity item row"
  - https://code.visualstudio.com/docs/configure/custom-layout - VS Code hides views and activity items from their context menus, read 2026-11-18
---

## Goal

A right-click shows the menu of the innermost layer under the pointer, as VS Code does.
A pane header in a stack offers to hide that pane and ticks every pane.
The background of a stack ticks every pane.
The activity bar ticks every activity item, so a person can hide one.
An app adds its own rows to each menu through a command slot.
ahpw fills the slots in [`shell/20261118-0318-the-sidebar-and-rail-menus-hold-layout`](file:///github/ahpw/.project/plans/shell/20261118-0318-the-sidebar-and-rail-menus-hold-layout/plan.md).

## Reconnaissance

The files read and the patterns to reuse are the `refs` in the frontmatter, each with its note.

### Searches performed

- `rg -n "':context'" packages/scena/src` - the slots are `tab:context`, `tab-group:context`, `surface:context` and `card:context`; no slot for a pane or the rail.
- `rg -n "onContextMenu" packages/scena/src/ui/layout` - the stack, tab, tab panel, split and spatial layouts open menus; the rail does not.
- `rg -n "StackHeader|stack.hidden" packages/scena/src` - only `StackHeader` writes `stack.hidden`.
- `rg -n "label" packages/scena/src/ui/navigation/ActivityBarItem.tsx` - an activity item names itself by its `label` prop, not by `title`.

### Runtime path

```
right-click -> layout handler (stopPropagation) -> ContextMenu { extraItems: ticks, query: slot } -> setState hidden -> layout leaves the mount out
```

### Gaps

- A pane header shows tab commands: close, pin, close others, copy key. A pane is not a tab.
- `Not found: a menu on the rail - searched onContextMenu, ContextMenu in RailLayout.tsx and ActivityBarItem.tsx.`
- `Not found: a hidden list for the rail - searched hidden in sdk/layout.ts.`

## Answers

| What | Source | Task |
| --- | --- | --- |
| A pane header opens VS Code's pane menu: "Hide '<pane>'", then the pane ticks; the tab commands leave it | Softov, 2026-11-18: chose "VS Code's pane menu" | 01 |
| The activity bar menu ticks every activity item, and an unticked item leaves the bar | Softov, 2026-11-18: chose "Yes, in this plan" | 02 |
| No entry moves a sidebar or the activity bar | Softov, 2026-11-18: chose "Leave them out" | 01, 02 |
| The innermost layer with a menu takes the right-click; outer layers do not open | Softov, 2026-11-17: "the context menu depends of the layers it was clicked" | 01, 02 |
| The pane header menu is the `pane:context` slot; the rail menu is the `rail:context` slot | (defaulted: one slot per layer, as `tab:context` and `tab-group:context` are) | 01, 02 |
| The stack background keeps `surface:context`, with the pane ticks ahead of its commands | (defaulted: drops nothing; its "Close all" stays) | 01 |
| The `...` menu, the pane header menu and the background menu build the ticks with one function | (defaulted: one tick list, written once) | 01 |
| `rail.hidden` holds the hidden item keys, in the layout state, as `stack.hidden` does | [code://packages/scena/src/sdk/layout.ts#L149](../../../../packages/scena/src/sdk/layout.ts#L149) | 02 |
| A rail mount with `hideable: false` has no tick and never hides | (defaulted: an app keeps the way to its settings and layout menu) | 02 |
| A hidden item's section stays open when it is the active one | (defaulted: VS Code keeps the view open) | 02 |

## Proposed architecture

- **Data flow** - each layout builds its tick rows and passes them as `extraItems`. The slot query adds the app's commands after them.
- **Event flow** - each layer's `onContextMenu` calls `preventDefault` and `stopPropagation`. A row's own menu inside a pane stops first, so the pane menu does not open.
- **State flow** - a tick writes `stack.hidden` or `rail.hidden` through the layout's `setState`. The layout state persists through `LayoutStorage`.
- **Layer responsibilities** - scena: the ticks, the hide row, the slots and the hidden state · an app: the commands in `pane:context`, `surface:context` and `rail:context`.
- **Source-of-truth files** - [`code://packages/scena/src/sdk/layout.ts`](../../../../packages/scena/src/sdk/layout.ts)

The menus, with ahpw's rows from its plan:

```
pane header              stack background        activity bar
+---------------------+  +--------------------+  +----------------------+
| Hide 'Outline'      |  | v Open Editors     |  | v Sessions           |
|---------------------|  | v Folders          |  | v Explorer           |
| v Open Editors      |  |   Outline          |  |   Automations        |
| v Folders           |  |--------------------|  | v Agents             |
| v Outline           |  | Close all          |  |----------------------|
+---------------------+  | Hide left sidebar  |  | Hide left sidebar    |
                         +--------------------+  | Hide activity bar    |
                                                 +----------------------+
```

## Tasks

| Task | Status | Depends on |
| --- | --- | --- |
| [01 - A pane has its own menu](task-01-a-pane-has-its-own-menu.md) | todo | - |
| [02 - The rail ticks its items](task-02-the-rail-ticks-its-items.md) | todo | - |

## Risks and tradeoffs

- A hidden activity item hides its badges too, so its alerts are not seen. The tick list shows the item, so a person can bring it back.
- An app that relied on `tab:context` rows on a stack pane loses them. No ahpw contributor targets a stack pane: its `tab:context` rows are for files, terminals and the host page.
- ahpw's brief `docks-rest-in-the-chrome` mounts dock holders on `activitybar`. Each holder needs `hideable: false`, or it shows as a tick.
- Only the stack layout gets a background menu. A `single` section is filled by its own content, so its right-click goes to that content.

## Resume state

- **Done so far:** nothing.
- **Next action:** [task-01-a-pane-has-its-own-menu.md](task-01-a-pane-has-its-own-menu.md).
- **Open questions:** none.
- **Watch out for:** the background handler fires only when the target is the stack itself. Keep that check, or a pane's body opens the background menu. A scena release is tagged only after Softov validates it.

## Final verification checklist

- [ ] `pnpm typecheck` passes.
- [ ] `test/ui/StackLayout.test.tsx` and a rail test pass.
- [ ] In ahpw's Explorer, a pane header right-click shows "Hide '<pane>'" and the ticks, and no tab commands.
- [ ] In ahpw, an unticked activity item leaves the bar and comes back after F5 unticked.
