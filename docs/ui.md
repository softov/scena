# The component catalog

Everything here is importable from `@softov/scena/ui`, or from its category
subpath (`@softov/scena/ui/forms`) when you want a narrower import. Calling
`registerBuiltins(scena)` at boot puts the whole catalog into the component
registry, which is what lets a component graph name `'Listable'` and get one.

The categories are the folder layout, and they mean different things — knowing
which layer you are in tells you how much a component will do on its own.

| Layer | Owns | Examples |
| --- | --- | --- |
| **spec primitives** | nothing. Declarative, rendered by `ViewMount` | `Row`, `Column`, `List`, `Card`, `Button`, `TextField` |
| **display** | nothing. Stateless presentation | `Badge`, `Alert`, `Progress`, `Spinner`, `Skeleton`, `Markdown` |
| **blocks** | their own interaction state — selection, keyboard nav, drag, context menus | `Tree`, `Listable`, `DataTable` |
| **menu** | the picker family and its host hooks | `ActionList`, `ContextMenu`, `useChatPicker` |
| **layouts** | how a surface arranges its mounts | `TabLayout`, `SplitLayout`, `SpatialLayout` |

## By category

**`ui/layout`** — `Row`, `Column`, `Grid`, `Splitter`, and the surface layout
strategies: `TabLayout`, `TabPanelLayout`, `SingleLayout`, `SplitLayout`,
`StackLayout`, `SpatialLayout` (+ `SpatialCard`), `RailLayout`,
`InlineLayout`, `BarLayout`, `FloatingLayout`. `registerBuiltinLayouts(scena)`
registers all of them.

**`ui/control`** — `Button`, `ReloadButton`, `TextField`, `CheckBox`, `Checks`,
`ChoicePicker`, `Slider`, `DateTimeInput`, `LocaleToggle`.

**`ui/forms`** — `Form` (+ `FormContext`, `useFormContext`), `Field` with
`FieldLabel` / `FieldHint` / `FieldError`, `FieldGroup`, `FormSection`,
`FormActions`, `DangerZone`, `SettingsContainer`, `LoginForm`, and
**`SchemaForm`**.

`SchemaForm` renders a JSON Schema as a form, which is the right reach whenever
the *shape* is data — a backend that describes its own settings, a protocol
that hands you a schema. It understands `x-enumOptions` (label plus
description per option), `x-show-if` for a field that depends on a sibling,
and `x-header` for an object rendered as a section. `formatRenderers` is how
you take over one `format` without taking over the form.

**`ui/data`** — `List`, `Listable`, `DataTable`, `Tree`, `Pagination`,
`Filter`. `Listable` is the workhorse: columns with per-column `mode`
(`table` for wide, omitted for both), `getKey`, `selectedKey`, `onSelect`,
`contextMenuSlot` plus `contextFor`, and an `emptyState`. `Pagination` and
`Filter` bind to a namespace and drive its `query` path, so a list, its filter
and its paginator need no wiring between them.

**`ui/display`** — `Card`, `Divider`, `Text`, `SectionTitle`, `Image`, `Icon`,
`Alert`, `Badge` (with `BadgeTone`), `Progress`, `Spinner`, `Skeleton`,
`Markdown`, `Svg`, and the detail family: `DetailContainer`, `DetailHeader`,
`DetailList`, `DetailNotFound`, `AddPlaceholder`.

**`ui/navigation`** — `Breadcrumb`, `Tabs`, `Toolbar`, `Link`
(+ `resolveLinkHref`).

**`ui/menu`** — `ActionList` is the engine; `ContextMenu` and `useContextMenu`
are the right-click surface; `ContainerMenu` is the header overflow;
`useChatPicker` is the composer picker that opens on a prefix character.

`useChatPicker` memoizes on the identity of its `prefixes` array — hoist it to
module scope. Inline, the picker rebuilds itself every render and throws away
the submenu a click has just opened.

**`ui/overlay`** — `Modal`. **`ui/media`** — `Video`, `Audio`.
**`ui/embed`** — `HtmlEmbed`. **`ui/chart`** — `BarChart`, `LineChart`,
`Sparkline`, `Donut`. **`ui/campus`** — the spatial canvas: `CampusView`,
`CampusNodus`, `CampusStratum`, `CampusVelum`, `CampusMappa`, `useCampus`,
`useStratumZoom`.

## Tokens

Components style themselves from CSS custom properties, and both shipped
themes set the same names. Application CSS should use them rather than
literals.

```
--oo-color-canvas    the page under everything
--oo-color-surface   a raised region
--oo-color-border    hairlines
--oo-color-text      body text
--oo-color-muted     secondary text
--oo-color-accent    the app's accent
--oo-color-primary   primary action
--oo-color-danger    destructive
--oo-color-hover     hover wash
--oo-color-active    selected wash
--oo-color-scrim     behind a modal
--oo-font-family     --oo-font-mono
--oo-font-size-xs / -sm / -md        --oo-line-height
--oo-radius-sm
```

The layout also writes geometry into the same space —
`--oo-sidebar-left-size`, `--oo-panel-bottom-visible`, `--oo-activitybar-size`
and so on — which is what lets CSS respond to a collapsed surface without
JavaScript.

Where a token may not be defined in a given theme, use a fallback:
`var(--oo-color-success, #6ec46e)`.

## Writing a component for the catalog

A registered component is a name, a category and a renderer. The renderer is
loaded lazily, so the catalog costs a name until something mounts it.

```ts
scena.components.register({
  component: 'Advisor.ServerStatus',
  category: 'chrome',
  renderer: { kind: 'react', load: () => import('./ServerStatus.js') },
});
```

Namespace anything an application owns (`Advisor.ServerStatus`). The registry
is flat and shared, and a plain `Status` will eventually collide with somebody
else's.

Ship the stylesheet next to the component and import it from the component —
`sideEffects` covers `**/*.css`, so it survives bundling and the consumer never
imports styles by hand.
