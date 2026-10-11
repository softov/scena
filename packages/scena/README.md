# @softov/scena

[![npm version](https://img.shields.io/npm/v/@softov/scena?color=4ec9b0)](https://www.npmjs.com/package/@softov/scena)
[![CI](https://github.com/softov/scena/actions/workflows/ci.yml/badge.svg)](https://github.com/softov/scena/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/@softov/scena)](https://www.npmjs.com/package/@softov/scena)
[![MIT license](https://img.shields.io/npm/l/@softov/scena)](https://github.com/softov/scena/blob/main/LICENSE)

A reactive UI runtime that renders pages from data.

![The scena playground: the component catalog in tabs, dark theme](https://raw.githubusercontent.com/softov/scena/main/docs/screenshots/playground-tabs.png)

Scena renders UI from data, not from hand-written component trees.
A page is a graph of component nodes in a layered reactive store.
Components resolve by name in a registry and mount when they are needed.

> Status: pre-1.0. The public API can still change.

## Install

```bash
pnpm add @softov/scena
```

React is an optional peer dependency.
The store and the runtime work without it:

```bash
pnpm add react react-dom
```

## Entry points

| Import | Contents |
| --- | --- |
| `@softov/scena` | Core runtime and reactive store |
| `@softov/scena/sdk` | Contracts and type definitions (`/types` is the old name) |
| `@softov/scena/react` | React bindings (full barrel) |
| `@softov/scena/react/core` | Small boot entry: provider and hook only |
| `@softov/scena/ui` | All UI components |
| `@softov/scena/ui/builtins` | Registry catalog, no component code |
| `@softov/scena/ui/<section>` | One section: `forms`, `layout`, `display`, `control`, `data`, `navigation`, `media`, `overlay`, `chart`, `menu`, `campus` |
| `@softov/scena/styles` | Stylesheets and the theme registry |
| `@softov/scena/themes` | The built-in themes |
| `@softov/scena/runtime` | Runtime helpers |
| `@softov/scena/porta` | Sign-in: the wall and the provider registry |

In application code, use the small entries (`/react/core`, `/ui/builtins`, `/ui/<section>`).
The barrels load every component.

## Built with scena

[ahpw](https://github.com/softov/ahpw) is a web UI for Agent Host Protocol hosts. Every view in it is a scena page.

![ahpw showing scena's own source and README side by side](https://raw.githubusercontent.com/softov/scena/main/docs/screenshots/ahpw.png)

## Documentation

The [repository](https://github.com/softov/scena) has the architecture, the guide for consumers, and the component catalog.

## License

MIT
