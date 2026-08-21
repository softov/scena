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
`ChoicePicker`, `Slider`, `DateTimeInput`, `LocaleToggle`, `ButtonBar`,
`ThemePicker`, `ThemeModeToggle`.

`ButtonBar` is the button that goes in a bar — one component for the title bar
and the status bar rather than two, because the difference between them is
presentational and carried by `[data-surface-role='bar']` in CSS, not by a prop.
The role is stamped by the shell, so an app's own alert band gets the same
treatment without CSS anywhere learning its name.

`ThemePicker` and `ThemeModeToggle` are views over `$/ui/theme/id` and
`$/ui/theme/mode`. They write the store and nothing else; the applying is
`registerThemeController`'s job (see **Theming** below). That is what lets a
picker in the title bar and a select in a settings panel agree without knowing
about each other.

`ThemePicker` renders nothing below two choices. One theme is not a choice, and
a select with a single option is a control that cannot do anything — so an app
that ships only the built-in theme can mount it unconditionally and it stays out
of the way until a second theme is registered.

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

**`ui/navigation`** — `Breadcrumb`, `Tabs`, `Toolbar`, `Link`, `ActivityBarItem`.

`ActivityBarItem` derives its own active state from which sidebar section is
showing (`sectionPath`, defaulting to the left sidebar) rather than taking it
as a prop — the caller is usually a `surfaces.mount` in a resource module that
has no idea what else is mounted, so a rail of independently-registered entries
could not otherwise agree on which one is current. Clicking runs `command` if
given and then executes `sidebar.activate`. That command is **not** part of
scena: what activating means — which surface, whether it also reveals — is the
app's decision.

It carries up to two counts. `badge` sits in the bottom corner and `secondBadge`
in the top one, so neither moves when the other appears, and each takes its own
`badgeTone` (`accent` | `info` | `danger` | `warning` | `success` | `muted`).
Reach for the second only where a section genuinely answers two questions
somebody acts on differently — how many agents are working now, and how many
finished without anybody reading them; one is activity, the other a backlog, and
a sum would name neither. A third would be a chart on a 44-pixel icon.

Zero draws no badge (a rail of zeroes reads as a fault when it means "nothing to
do"), and a count over 99 is written `99+` because three digits do not fit the
pill. Both `badgeLabel`s feed the accessible name, which keeps the true number:
`Live sessions: 412 running, 5 unread`. Colour is the only thing separating the
two badges on screen, which is no separation at all for a lot of people — the
sentence is where they are actually told apart.

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

Prefer overriding the `--oo-rgb-*` channels over the resolved `--oo-color-*`
when writing a theme. The resolved colours are composited from the channels —
`rgb(var(--oo-rgb-border) / var(--oo-border-alpha))` — so a theme that replaces
only the resolved value silently loses every alpha-composited hover wash,
alert tint and scrollbar thumb derived from it.

## Theming

A theme has two independent axes: the **family** (`default`, and whatever the
app registers) and the **mode** (`light`, `dark`, or `system` — follow the OS).
`registerThemeController(scena, options)` puts both in the store, at
`THEME_ID_PATH` and `THEME_MODE_PATH`, and is the only thing that calls
`applyTheme`, writes `localStorage`, or listens for the OS preference changing.

```ts
import { registerThemeController } from '@softov/scena/styles';

registerThemeController(scena, {
  idKey: 'myapp.theme-id',
  modeKey: 'myapp.theme-mode',
});
```

Namespace the storage keys per app; two scena apps on one origin otherwise
fight over a single preference.

`system` is a stored choice rather than the absence of one. An app that
resolves the OS preference once at boot stops following it when the user
changes it, and there is no way back to that behaviour from a stored
`light` | `dark`.

Apply the theme once in the entry, before React, from the same storage keys —
otherwise the first paint uses the default and the controller corrects it a
frame later, which is a visible flash:

```ts
applyTheme(document.documentElement, savedId, resolveThemeMode(savedChoice));
```

The controller reads `data-theme` off the root as its fallback, so the two
agree with no extra plumbing.

### Surface separators

Surfaces draw no hairline between them by default — separation by background
alone is a legitimate design, and turning borders on for everyone would change
every existing app's chrome. A theme opts in on the root:

```css
[data-theme='mine'][data-theme-mode='dark'] {
  --oo-surface-border-width: 1px;
  --oo-surface-border: rgb(43 43 43);   /* defaults to --oo-color-border */
}
```

Which edge a surface draws on comes from the **shell**, not from its name. A
shell stamps `edge` and `role` on each `SurfaceArea`:

```tsx
<SurfaceArea surface="alert:top"     role="bar"   edge="block-end" />
<SurfaceArea surface="sidebar:left"  role="panel" edge="inline-end" />
<SurfaceArea surface="main"          role="main" />
```

which become `data-surface-edge` and `data-surface-role`, and scena's CSS
matches those. That is what lets an app-defined surface be styled at all: a
rule keyed on `.oo-surface--sidebar-left` works for the nine names scena ships
and silently skips anything else, while one keyed on the edge works for
whatever a shell places. Edges are logical, so chrome flips under `dir="rtl"`
without the shell restating it.

`role` is for styling that is about the kind rather than the identity —
`ButtonBar` is small and quiet inside any `role="bar"`, whether that is the
title bar, the status bar, or an app's own alert band.

**scena's CSS matches roles and edges; an app's CSS may match names.** An app
knows its own surfaces, so a rule keyed on `[data-surface='statusbar']` is
perfectly good in an app stylesheet — it is only inside the library that a name
is a guess.

Overlaid surfaces (`floating`, `sheet`) draw no separator — they are out of the
flow and carry a shadow instead.

Note that `surface.css` consumes these as `var(--oo-surface-border-width, 0px)`
rather than declaring a default on `.oo-surface`. That is deliberate: a custom
property set on the element beats the same property inherited from the root, so
declaring the default would silently override every theme that tried to switch
borders on.

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
