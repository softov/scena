# @softov/scena

Graph-mounted reactive UI runtime.

Scena renders UI from data, not from hand-written component trees.
A page is a graph of component nodes held in a layered reactive store; components resolve through a late-binding registry and mount lazily.

> Status: pre-1.0. The public surface is still moving.

## Install

```bash
pnpm add @softov/scena
```

React is an optional peer dependency - the core runtime and store work without it:

```bash
pnpm add react react-dom
```

## Entry points

| Import | Contents |
| --- | --- |
| `@softov/scena` | Core runtime and reactive store |
| `@softov/scena/types` | Contracts and type definitions |
| `@softov/scena/react` | React bindings (full barrel) |
| `@softov/scena/react/core` | Narrow boot entry - provider and hook only |
| `@softov/scena/ui` | All UI components |
| `@softov/scena/ui/builtins` | Registry catalog, no component code |
| `@softov/scena/ui/<section>` | One section: `forms`, `layout`, `display`, `control`, `data`, `navigation`, `media`, `overlay`, `chart`, `menu`, `campus` |
| `@softov/scena/styles` | Stylesheets and themes |
| `@softov/scena/runtime` | Runtime helpers |
| `@softov/scena/porta` | Auth gate - login UI and provider registry |

Prefer the narrow entries (`/react/core`, `/ui/builtins`, `/ui/<section>`) over the
barrels in application code - the barrels pull in every component.

## License

MIT
