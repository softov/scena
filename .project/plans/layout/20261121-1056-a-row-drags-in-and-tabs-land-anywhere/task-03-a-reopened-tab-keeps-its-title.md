---
title: A reopened tab keeps its title
status: todo
depends: []
layer: "scena sdk and core"
refs:
  - "[code://packages/scena/src/sdk/session.ts#L6-L12](../../../../packages/scena/src/sdk/session.ts#L6-L12) - `SessionMount`, with no props"
  - "[code://packages/scena/src/core/controls/session.ts#L33-L82](../../../../packages/scena/src/core/controls/session.ts#L33-L82) - `snapshot` and `restore`"
---

## Objective

A session snapshot keeps each mount's props, and a restore passes them back, so a reopened tab shows its title, icon and colour.

## Files

- `UPDATE: packages/scena/src/sdk/session.ts:6-12` - add `props?: MountDisplay` to `SessionMount`.
- `UPDATE: packages/scena/src/core/controls/session.ts:33-82` - keep the props in `snapshot`, and pass them to `open` in `restore`.
- `UPDATE: packages/scena/test/core/reopen.test.ts` - the title after a restore.

## Steps

1. Add `props?: MountDisplay` to `SessionMount`, with a comment that an old snapshot has none.
2. In `snapshot`, keep `m.props` when the mount has props.
3. In `restore`, pass `sm.props` to `surfaces.open` when the snapshot has them.
4. Add a test that saves a mount with a title, restores it in a second scena, and reads the title.

## Validation

- `test/core/reopen.test.ts`: the restored mount has its title; a snapshot with no props still restores.
- `pnpm test` passes.

## Resume
