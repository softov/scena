---
title: The key opens the field menu
domain: forms
status: active
priority: medium
created: 2026-11-03
revalidated: 2026-11-03
requires: []
changes: []
creates: []
refs:
  - git://530887f - the commit of scena this plan was checked at
  - "[code://packages/scena/src/ui/forms/FieldRow.tsx#L49-L83](../../../../packages/scena/src/ui/forms/FieldRow.tsx#L49-L83) - `FieldRow`, which draws the gear, the key tooltip and the menu"
  - "[code://packages/scena/src/ui/forms/SchemaForm.css#L97-L165](../../../../packages/scena/src/ui/forms/SchemaForm.css#L97-L165) - the row, the gear in the left gutter and the key at the top right"
  - "[code://packages/scena/test/ui/SchemaForm.test.tsx#L225-L295](../../../../packages/scena/test/ui/SchemaForm.test.tsx#L225-L295) - the field actions tests"
---

## Goal

A SchemaForm row with field actions shows one button at its top right: the gear glyph and the field's key.
The button opens the field menu.
The left gutter goes, so the fields line up with the rest of the form.
On a touch screen, the button is always shown.

## Reconnaissance

The files read and the patterns to reuse are the `refs` in the frontmatter, each with its note.

### Searches performed

- `rg -n "oo-schema-form__gear|oo-schema-form__key" packages` - only `FieldRow.tsx`, `SchemaForm.css` and `SchemaForm.test.tsx` use them.
- A jsdom render of each field kind - each control is a direct child of `.oo-schema-form__row-body`. Its label is `.oo-field__label`, `.oo-checkbox`, `.oo-field-row__labelline` or `.oo-form-section__header`.

### Runtime path

```
hover or focus the row -> the key button shows -> click it -> the field menu opens under it
```

### Gaps

- `Not found: a touch rule for the gear - searched hover and pointer in SchemaForm.css.`

## Answers

| What | Source | Task |
| --- | --- | --- |
| The gear and the key become one clickable key button at the top right of the row | Softov, 2026-11-03: "One clickable key button", and the mockup approved on 2026-11-03 | 01 |
| The row loses the 28 px left gutter | Softov, 2026-11-03: "remove the space for the gear" | 01 |
| The button shows on hover and focus, and always on a screen with no hover | (defaulted: the mockup's phone state; `@media (hover: none)`) | 01 |
| The label line leaves 40% of the row free on its right, so a long label wraps before the button | (defaulted: the mockup's rule) | 01 |
| The button's name stays "Setting actions", and the key is its description | (defaulted: the name the menu has today) | 01 |

## Tasks

| Task | Status | Depends on |
| --- | --- | --- |
| [01 - The key button opens the field menu](task-01-the-key-button-opens-the-field-menu.md) | implemented | - |

## Risks and tradeoffs

- A long key is cut with an ellipsis. The `title` of the button shows the full key.

## Resume state

- **Done so far:** task 01 is implemented. It waits for review.
- **Next action:** Softov reviews the key button in ahpw.
- **Open questions:** none.
- **Watch out for:** the label rule must not reach the fields of a nested form, which have their own button.

## Final verification checklist

- [x] `pnpm typecheck` passes.
- [x] `test/ui/SchemaForm.test.tsx` passes.
- [x] In ahpw at a desktop width, a connector form shows the key button on hover, and the menu opens from it.
- [x] In ahpw at a phone width, the key button shows without hover.
