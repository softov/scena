---
title: The UI acts in its own document
status: todo
depends: []
layer: "scena react and ui"
refs:
  - "[code://packages/scena/src/ui/overlay/Popup.tsx#L55-L131](../../../../packages/scena/src/ui/overlay/Popup.tsx#L55-L131) - clamps to the global `window`, listens on the global `document`, portals into `document.body`"
  - "[code://packages/scena/src/ui/menu/ActionList.tsx#L450](../../../../packages/scena/src/ui/menu/ActionList.tsx#L450) - a key listener on the global `document`"
  - "[code://packages/scena/src/ui/layout/SpatialLayout.tsx#L284-L290](../../../../packages/scena/src/ui/layout/SpatialLayout.tsx#L284-L290) - a key listener on the global `window`, and a check against `document.body`"
  - "[code://packages/scena/src/ui/layout/TabPanelLayout.tsx#L304-L315](../../../../packages/scena/src/ui/layout/TabPanelLayout.tsx#L304-L315) - drag end and drop listeners on the global `window`"
---

## Objective

A popup, a menu and a layout drawn into a second window listen, measure and portal in that window.
In the main window, nothing changes.

## Files

- `CREATE: packages/scena/src/react/hooks/useOwnerDocument.ts` - `useOwnerDocument(ref)`, the `ownerDocument` and its `defaultView` of an element, with the global ones until the element mounts.
- `CREATE: packages/scena/src/react/OwnerDocument.tsx` - a context that `SurfaceWindows` sets to the window's document, read by a component with no element yet.
- `CREATE: packages/scena/test/react/useOwnerDocument.test.tsx` - the hook in a second jsdom document.
- `UPDATE: packages/scena/src/ui/overlay/Popup.tsx:55-131` - clamp to, listen on and portal into the owner document.
- `UPDATE: packages/scena/src/ui/menu/ActionList.tsx:450` - listen on the owner document.
- `UPDATE: packages/scena/src/ui/layout/SpatialLayout.tsx:284-290` - listen on the owner window, and compare with its `body`.
- `UPDATE: packages/scena/src/ui/layout/TabPanelLayout.tsx:304-315` - listen on the owner window.
- `UPDATE: packages/scena/src/react/index.ts` - export the hook and the context.

## Steps

1. Create the `OwnerDocument` context, with the global `document` as its default.
2. Write `useOwnerDocument(ref)`, which returns the element's `ownerDocument` and `defaultView`, or the context's when the element is not mounted.
3. In `Popup.tsx`, read the context for the portal target, and the owner window for the clamp and the listeners.
4. In `ActionList.tsx`, `SpatialLayout.tsx` and `TabPanelLayout.tsx`, put each global listener on the owner document or window.
5. Export the hook and the context from `react/index.ts`.

## Validation

- `test/react/useOwnerDocument.test.tsx`: an element rendered into a second document returns that document and its window.
- A `Popup` rendered under the context of a second document portals into its `body`.
- `pnpm test` passes, with the popup and menu tests unchanged.

## Resume
