# Pending

Things to change in scena, found while building on it.
Each says where it is, what is wrong, and what a consumer does meanwhile.

## A menu's `spec.title` is not drawn

- **Where:** `packages/scena/src/ui/menu/ActionList.tsx`; `ContextMenu` passes its `spec` to it.
- **What:** `ListSpec.title` shows only as the label of the Back link in a pushed list.
  A `ContextMenu` opened with `spec={{ title, items }}` draws no heading, so a menu cannot say what it is for.
- **Meanwhile:** ahpw's bot menu puts every item in one `group` named after the bot, and the group label stands in for the title (`ahpw/src/resources/bots/layer/BotLayer.tsx`).
- **Change:** draw `spec.title` as the list's heading when it is the first frame of the stack, and keep it as the Back label on pushed frames.
  ahpw's group workaround then goes.

## An array with no items and a bare object are not drawn

- **Where:** `packages/scena/src/ui/forms/SchemaForm.tsx`, `packages/scena/src/ui/forms/schema-walk.ts`.
- **What:** an array with no `items` is taken as a list of strings (`resolveArrayItemSchema` answers `{ type: 'string' }`), so an object entry shows as `[object Object]`, and an edit writes that text over it.
  An object with neither `properties` nor `additionalProperties` draws "No parameters defined.", so its keys cannot be edited.
- **Meanwhile:** a person edits those fields in the form's JSON view.
- **Change:** draw an array with no `items` and an object with neither `properties` nor `additionalProperties` as JSON text, as a tuple array and the empty schema `{}` are drawn now.
