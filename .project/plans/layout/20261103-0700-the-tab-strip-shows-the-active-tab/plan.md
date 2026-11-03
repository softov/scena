---
title: The tab strip shows the active tab
domain: layout
status: active
priority: medium
created: 2026-11-03
revalidated: 2026-11-03
requires: []
changes: []
creates: []
refs:
  - git://9eb7037 - the commit of scena this plan was checked at
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L856-L915](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L856-L915) - `TabTitle`, the tab that both layouts draw"
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L90-L101](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L90-L101) - the `tab` strip, which scrolls on the wheel only"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L279-L292](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L279-L292) - the `tab-panel` strip, which scrolls on the wheel only"
  - "[code://packages/scena/src/ui/data/Tree.tsx#L187](../../../../packages/scena/src/ui/data/Tree.tsx#L187) - the `scrollIntoView({ block: 'nearest' })` pattern to copy"
---

## Goal

When a tab becomes active, the tab strip scrolls until the tab is in view.
Today a session opened again in ahpw becomes the active tab, but the strip can leave it out of view.

## Reconnaissance

The files read and the patterns to reuse are the `refs` in the frontmatter, each with its note.

### Searches performed

- `rg -n "scrollIntoView" packages/scena/src` - `Tree`, `Listable` and `ActionList` scroll their selected row; no layout does.
- `rg -n "TabTitle" packages/scena/src` - `TabLayout` imports `TabTitle` from `TabPanelLayout`, so one change covers both strips.

### Runtime path

```
open a mount -> layout marks it active -> TabTitle gets isActive -> the tab scrolls into view
```

### Gaps

- `Not found: a scroll on activation - searched scroll, activeKey in TabLayout.tsx and TabPanelLayout.tsx.`

## Answers

| What | Source | Task |
| --- | --- | --- |
| Both strips scroll the active tab into view when it becomes active | Softov, 2026-11-03: "when reopen a session it does not scroll the title" | 01 |
| The scroll is in `TabTitle`, with `inline: 'nearest'`, so a tab already in view does not move the strip | (defaulted: both layouts draw `TabTitle`; `Tree` scrolls with `nearest` too) | 01 |
| The call is skipped when the element has no `scrollIntoView` | (defaulted: jsdom has none, and `surface-empty.test.tsx` and the jsdom tests of consumers draw tabs) | 01 |

## Tasks

| Task | Status | Depends on |
| --- | --- | --- |
| [01 - The active tab scrolls into view](task-01-the-active-tab-scrolls-into-view.md) | implemented | - |

## Risks and tradeoffs

- The wheel can scroll the active tab out of view. Opening that tab again does not scroll it back, because `isActive` does not change.

## Resume state

- **Done so far:** task 01 is implemented and waits for review.
- **Next action:** Softov reviews the diff.
- **Open questions:** none.
- **Watch out for:** jsdom has no `scrollIntoView`. `TabLayout.test.tsx` stubs it, and `TabTitle` skips the call when it is missing.

## Final verification checklist

- [x] `pnpm typecheck` passes.
- [x] `test/ui/TabLayout.test.tsx` passes.
- [x] In ahpw, with more tabs than the strip shows, a session opened again scrolls into view in the Tabs and the Tab groups layouts.
