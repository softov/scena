---
title: The page area takes a tab
status: todo
depends: []
layer: "scena ui/layout"
refs:
  - "[code://packages/scena/src/ui/layout/TabLayout.tsx#L310-L337](../../../../packages/scena/src/ui/layout/TabLayout.tsx#L310-L337) - the page area, with no drop"
  - "[code://packages/scena/test/ui/TabLayout.test.tsx](../../../../packages/scena/test/ui/TabLayout.test.tsx) - the test that gets the case"
---

## Objective

A tab from another surface dropped on the page area of a `tab` layout lands at the end of its strip.

## Files

- `UPDATE: packages/scena/src/ui/layout/TabLayout.tsx:310-337` - give the page area the strip's drag over and drop.
- `UPDATE: packages/scena/test/ui/TabLayout.test.tsx` - a drop on the page area.

## Steps

1. Move the strip's drag over and drop handlers into two named functions in `TabLayout`.
2. Put the two handlers on the page area too.
3. Add a test that drops a tab from `main` on the page area, and expects it at the end.

## Validation

- `test/ui/TabLayout.test.tsx`: a drop on the page area puts the key at the end and moves the mount.
- `pnpm test` passes.

## Resume
