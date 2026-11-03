---
title: The active tab scrolls into view
status: implemented
depends: []
layer: "scena layout"
refs:
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L856-L915](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L856-L915) - `TabTitle`"
---

## Objective

`TabTitle` scrolls itself into view when it becomes active, in both tab layouts.

## Files

- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx:856-915` - `TabTitle` holds a ref to its element and scrolls it into view when `isActive` turns true.
- `UPDATE: packages/scena/test/ui/TabLayout.test.tsx` - a test that the newly active tab scrolls into view.

## Steps

1. Add a ref to the `tab-bar__tab` element in `TabTitle`.
2. Add an effect that calls `scrollIntoView({ block: 'nearest', inline: 'nearest' })` when `isActive` is true and the element has the method.
3. Write a test that stubs `scrollIntoView`, changes the active mount, and expects the call on the new tab.

## Validation

- `pnpm typecheck` passes.
- `test/ui/TabLayout.test.tsx` passes.
- In ahpw, with more tabs than the strip shows, a session opened again scrolls into view.

## Resume

- `pnpm typecheck` and the full vitest suite pass. The two new tests fail without the change.
- The first build called `scrollIntoView` with no guard, and `surface-empty.test.tsx` failed in jsdom. The call is now guarded.
- ahpw ran on this checkout with `AHPW_SCENA`, with eleven tabs in the main strip. A session opened again from the list scrolled its tab into view. This was so in the Tabs layout at 1400 px, and in the Tab groups layout at 1400 px and 1000 px.
