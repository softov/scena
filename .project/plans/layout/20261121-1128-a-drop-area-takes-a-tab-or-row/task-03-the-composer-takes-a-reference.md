---
title: The composer takes a reference
status: todo
depends: [task-01-a-component-marks-a-drop-area.md, task-02-a-graph-page-has-a-drop-area.md]
layer: "playground and docs"
refs:
  - "[code://packages/playground/src/resources/sessions/SessionView.tsx](../../../../packages/playground/src/resources/sessions/SessionView.tsx) - the composer"
  - "[code://packages/playground/src/drag-demo.ts](../../../../packages/playground/src/drag-demo.ts) - the JSON demo page that gets a `DropArea`"
  - "[code://docs/architecture.md](../../../../docs/architecture.md) - the surfaces section"
---

## Objective

The playground's session composer takes a dropped session, user or file as a reference chip, and a sent message names its references.
The JSON demo page has a `DropArea` that shows what was dropped.
The docs say how an app marks a drop area.

## Files

- `UPDATE: packages/playground/src/resources/sessions/SessionView.tsx` - the composer is a drop area with reference chips.
- `UPDATE: packages/playground/src/resources/sessions/data.ts` - a message keeps its references.
- `UPDATE: packages/playground/src/drag-demo.ts` - a `DropArea` in the demo page, and the command it runs.
- `UPDATE: docs/architecture.md` - a drop area beside the surface drop.
- `UPDATE: docs/consuming.md` - how a component and a graph page mark one.

## Steps

1. Make the composer a drop area that takes any tab or row but its own session.
2. Show each reference as a chip with its title, and a button that removes it.
3. On send, put the references in the message, and clear them.
4. Add a `DropArea` to the demo page, with a command that writes the dropped title to the store.
5. Write the drop area in `docs/architecture.md` and `docs/consuming.md`.

## Validation

- Run `pnpm dev` and open `http://localhost:5174`.
- Drag a session tab onto another session's composer, and see a reference chip, with the tab still where it was.
- Drag a session row, a user tab and a file tab onto the composer, and see a chip for each.
- Send, and see the references in the message.
- Drop a tab on the session page beside the composer, and see it move to that surface.
- Drop a tab on the demo page's area, and see its title.
- `pnpm typecheck` and `pnpm lint` pass.

## Resume
