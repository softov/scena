# Scena documentation

Scena renders UI from data. A page is a graph of component nodes held in a
layered reactive store; components are resolved through a late-binding registry
and mounted lazily into named surfaces. Nothing in a page imports a component,
which is what lets a page be persisted, transported, edited or generated.

Read in this order.

| Document | What it answers |
| --- | --- |
| [`architecture.md`](architecture.md) | What the pieces are and which one owns what. The store, the graph, the registries, the surfaces, the shell |
| [`consuming.md`](consuming.md) | How to build an application on it — boot order, registration, data providers, and the mistakes that cost days |
| [`ui.md`](ui.md) | The component catalog and the theme tokens |

Two HTML files sit beside them —
[`shell-occupation-prototype.html`](shell-occupation-prototype.html) and
[`shell-occupation-resizable.html`](shell-occupation-resizable.html). They are
standalone sketches of how surfaces occupy the shell, kept because the geometry
they work out is the geometry `styles/geometry.css` implements.

## The vocabulary

Everything else is written assuming these words.

**Store** — one reactive, scoped key-value tree. Paths are JSON-Pointer-shaped:
`$/<scope>/rest` is absolute, `/rest` is relative to the surrounding data
context. Scopes (`local`, `page`, `workspace`, `global`, `summary`, `active`,
`ui`, `layout`, `plugins.*`) are namespaces with their own lifetimes, not
folders.

**Component graph** — a page *is* its root `ComponentNode`. Children nest
inline on `child` / `children`; there is no flat map and no slot bag. Three
keys are reserved on every node: `id`, `component`, `$meta`.

**Binding** — a prop whose value is read from the store rather than written in
the graph: `{ path: '$/tickets/view' }`. A `FunctionCall` is the same idea for
a value that has to be computed.

**Registry** — the late-binding table a name is resolved through. Components,
commands, converters, layouts, shells and keybindings each have one.

**Surface** — a named region of the shell a component can be mounted into:
`titlebar`, `activitybar`, `sidebar:left`, `sidebar:right`, `main`,
`panel:bottom`, `statusbar`, `overlay`, `detached`.

**Mount** — one component in one surface under one key, with its own display
metadata and policy. Several mounts in a surface are what a layout arranges.

**Layout** — the strategy that renders a surface's mounts: tabs, a stack, a
split, a spatial canvas. Which one a surface uses is data, and swappable.

**Shell** — the outermost frame that decides where the surfaces sit.

**Data provider** — the thing that fills a store namespace and keeps it fresh,
registered against that namespace and loaded lazily on first read.

**Porta** — sign-in. `Limen` is the wall a permission gates, `Sigillum` is the
stored session, and a provider is the thing that exchanges credentials for one.

**Modus** — the display environment as store state: size class, orientation,
pointer accuracy. A presentation policy reads `$/modus/class` rather than a
media query.
