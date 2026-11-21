---
title: The commands share the tree helpers
status: done
depends: []
layer: "scena runtime"
refs:
  - "[code://packages/scena/src/runtime/layout-commands.ts#L90-L140](../../../../packages/scena/src/runtime/layout-commands.ts#L90-L140) - the four copies"
  - "[code://packages/scena/src/sdk/tab-panel.ts](../../../../packages/scena/src/sdk/tab-panel.ts) - the helpers to import"
---

## Objective

`layout-commands.ts` imports the tree helpers from `sdk/tab-panel.ts`, and keeps no copies.

## Files

- `UPDATE: packages/scena/src/runtime/layout-commands.ts:90-140` - remove `findLeaf`, `replaceLeaf`, `mapLeaves` and `newLeafId`, and import them.
- `UPDATE: packages/scena/src/sdk/tab-panel.ts` - export `newLeafId`, if the commands need it.

## Steps

1. Compare each copy with its sdk function, and note a difference in the task's *Resume*.
2. Replace each copy with an import from `sdk/tab-panel.ts`.
3. Run the layout command tests.

## Validation

- `pnpm test` passes, with the layout command tests unchanged.

## Resume

- Done 2026-11-21. `replaceLeaf`, `mapLeaves` and `newLeafId` were the same as the sdk's, and `findLeaf` was `collectLeavesById`.
- The commands' `collectLeaves` returned its array, so it stays as a wrapper over the sdk's.
- `pnpm test` (446 tests) passes.
