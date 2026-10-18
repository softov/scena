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
