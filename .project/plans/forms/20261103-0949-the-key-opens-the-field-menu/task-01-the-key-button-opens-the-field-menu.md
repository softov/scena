---
title: The key button opens the field menu
status: implemented
depends: []
layer: "scena forms"
refs:
  - "[code://packages/scena/src/ui/forms/FieldRow.tsx#L49-L83](../../../../packages/scena/src/ui/forms/FieldRow.tsx#L49-L83) - `FieldRow`"
---

## Objective

`FieldRow` draws one key button at the row's top right, and the button opens the field menu.

## Files

- `UPDATE: packages/scena/src/ui/forms/FieldRow.tsx:49-83` - one button holds the gear glyph and the key; the gear button and the tooltip go.
- `UPDATE: packages/scena/src/ui/forms/SchemaForm.css:97-165` - the row has no left gutter; the key is a button that shows on hover, focus and touch; the first label line of a row leaves room for it.
- `UPDATE: packages/scena/test/ui/SchemaForm.test.tsx:225-295` - the tests find the key through the button's description, not a tooltip.

## Steps

1. In `FieldRow`, replace the gear button and the tooltip with one button of class `oo-schema-form__key`. It keeps the name "Setting actions", the menu attributes and the click handlers.
2. Put the gear glyph and the key in the button. The key span is the button's description, and the button's `title` is the key.
3. In `SchemaForm.css`, remove the gear rules and the 28 px left padding of the row.
4. Make the key a button: shown when the row has hover, focus or an open menu, and always under `@media (hover: none)`.
5. Give each control label a right padding of 40% of the row. Only a control that is a direct child of `.oo-schema-form__row-body` gets it.
6. Update the tests.

## Validation

- `pnpm typecheck` passes.
- `test/ui/SchemaForm.test.tsx` passes.
- In ahpw, a connector form shows the key button on hover, and the menu opens from it.
- At a phone width, the button shows without hover, and a long label wraps before it.

## Resume

- `pnpm typecheck`, `pnpm lint` and the full vitest suite pass: 323 tests.
- ahpw ran on this checkout with `AHPW_SCENA`, on the Anthropic connector form.
- At 1400 px with a mouse, the key button shows only on a row with hover. A click opens the field menu, and the open row keeps its button shown.
- At 390 px with touch, each row shows its button without hover. A long label wraps before the button.
